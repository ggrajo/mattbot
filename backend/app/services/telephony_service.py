"""Telephony service: number provisioning, lifecycle, call modes, forwarding."""

from __future__ import annotations

import logging
import secrets
import string
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings as app_settings
from app.models.call_mode_config import CallModeConfig
from app.models.forwarding_verification_attempt import ForwardingVerificationAttempt
from app.models.user_number import UserNumber
from app.schemas.telephony import (
    CallModesResponse,
    CarrierGuide,
    ForwardingSetupGuideResponse,
    ForwardingVerifyResponse,
    ForwardingVerifyStatusResponse,
    NumberListResponse,
    NumberProvisionResponse,
)
from app.services import audit_service, billing_service

logger = logging.getLogger(__name__)

SUSPENSION_GRACE_DAYS = 7


def _generate_verification_code() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


def _webhook_voice_url() -> str:
    base = app_settings.TWILIO_WEBHOOK_BASE_URL or ""
    return f"{base}/webhooks/twilio/voice/inbound"


def _suspended_twiml_url() -> str:
    base = app_settings.TWILIO_WEBHOOK_BASE_URL or ""
    return f"{base}/webhooks/twilio/voice/suspended"


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


async def _get_user_number(db: AsyncSession, user_id: uuid.UUID) -> UserNumber | None:
    stmt = select(UserNumber).where(
        UserNumber.owner_user_id == user_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _get_active_or_pending_number(db: AsyncSession, user_id: uuid.UUID) -> UserNumber | None:
    stmt = select(UserNumber).where(
        UserNumber.owner_user_id == user_id,
        UserNumber.status.in_(("active", "pending")),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def _get_twilio_client():
    from twilio.rest import Client as TwilioClient

    return TwilioClient(app_settings.TWILIO_ACCOUNT_SID, app_settings.TWILIO_AUTH_TOKEN)


# ---------------------------------------------------------------------------
# Rollback helper
# ---------------------------------------------------------------------------


def _rollback_twilio_number(twilio_sid: str) -> None:
    """Delete a Twilio IncomingPhoneNumber to prevent orphan charges."""
    if not twilio_sid or twilio_sid.startswith("PN_dev_"):
        return

    try:
        client = _get_twilio_client()
        client.incoming_phone_numbers(twilio_sid).delete()
        logger.info("Rolled back Twilio number %s", twilio_sid[:10])
    except Exception:
        logger.exception("Failed to rollback Twilio number %s", twilio_sid[:10])


# ---------------------------------------------------------------------------
# Provisioning
# ---------------------------------------------------------------------------


async def provision_number(db: AsyncSession, user_id: uuid.UUID) -> NumberProvisionResponse:
    await billing_service.ensure_billing_active_for_provisioning(db, user_id)

    existing = await _get_user_number(db, user_id)

    if existing and existing.status == "active":
        return NumberProvisionResponse(
            id=str(existing.id),
            e164=existing.e164,
            status=existing.status,
            provisioned_at=existing.provisioned_at,
        )

    if existing and existing.status == "pending":
        return NumberProvisionResponse(
            id=str(existing.id),
            e164=existing.e164,
            status=existing.status,
            provisioned_at=existing.provisioned_at,
        )

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="TWILIO_NUMBER_PROVISION_REQUESTED",
    )

    if not app_settings.TWILIO_NUMBER_PROVISIONING_ENABLED:
        return await _provision_dev_number(db, user_id)

    return await _provision_twilio_number(db, user_id)


async def _provision_dev_number(db: AsyncSession, user_id: uuid.UUID) -> NumberProvisionResponse:
    fake_e164 = f"+1555{secrets.randbelow(9000000) + 1000000}"
    webhook = _webhook_voice_url()

    number = UserNumber(
        owner_user_id=user_id,
        e164=fake_e164,
        status="active",
        provisioned_at=datetime.now(UTC),
        twilio_number_sid=f"PN_dev_{uuid.uuid4().hex[:16]}",
        webhook_url=webhook,
    )
    db.add(number)
    await db.flush()
    await db.refresh(number)

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="TWILIO_NUMBER_PROVISIONED",
        details={"e164_masked": "***" + fake_e164[-4:]},
    )

    return NumberProvisionResponse(
        id=str(number.id),
        e164=number.e164,
        status=number.status,
        provisioned_at=number.provisioned_at,
    )


async def _provision_twilio_number(db: AsyncSession, user_id: uuid.UUID) -> NumberProvisionResponse:
    from app.middleware.error_handler import AppError

    number = UserNumber(
        owner_user_id=user_id,
        e164="",
        status="pending",
    )
    db.add(number)
    await db.flush()
    await db.refresh(number)

    twilio_sid = None
    try:
        client = _get_twilio_client()

        available = client.available_phone_numbers("US").local.list(limit=1)

        if not available:
            number.status = "failed"
            number.last_error = "No numbers available"
            await db.flush()
            raise AppError(
                "NO_NUMBERS_AVAILABLE",
                "No phone numbers available. Try again later.",
                503,
            )

        phone_number = available[0].phone_number
        webhook = _webhook_voice_url()

        create_kwargs = {"phone_number": phone_number}

        if app_settings.TWILIO_WEBHOOK_BASE_URL:
            create_kwargs["voice_url"] = webhook
            create_kwargs["voice_method"] = "POST"

        purchased = client.incoming_phone_numbers.create(**create_kwargs)
        twilio_sid = purchased.sid

        now = datetime.now(UTC)
        number.twilio_number_sid = twilio_sid
        number.e164 = purchased.phone_number
        number.status = "active"
        number.provisioned_at = now
        number.webhook_url = webhook
        await db.flush()
        await db.refresh(number)

        await audit_service.log_event(
            db,
            owner_user_id=user_id,
            event_type="TWILIO_NUMBER_PROVISIONED",
            details={"e164_masked": "***" + purchased.phone_number[-4:]},
        )

        return NumberProvisionResponse(
            id=str(number.id),
            e164=number.e164,
            status=number.status,
            provisioned_at=number.provisioned_at,
        )

    except Exception as e:
        if "AppError" in type(e).__name__:
            raise

        logger.error("Twilio provisioning failed: %s", str(e)[:500])

        if twilio_sid:
            _rollback_twilio_number(twilio_sid)

        number.status = "failed"
        number.last_error = str(e)[:200]
        await db.flush()

        await audit_service.log_event(
            db,
            owner_user_id=user_id,
            event_type="TWILIO_NUMBER_PROVISION_FAILED",
            details={"reason": str(e)[:100]},
        )

        raise AppError(
            "PROVISIONING_FAILED",
            "Failed to provision a phone number. Please try again.",
            500,
        ) from e


# ---------------------------------------------------------------------------
# Webhook configuration
# ---------------------------------------------------------------------------


async def configure_number_webhooks(
    db: AsyncSession,
    number: UserNumber,
    voice_url: str | None = None,
) -> bool:
    url = voice_url or _webhook_voice_url()
    sid = number.twilio_number_sid

    if not sid or sid.startswith("PN_dev_"):
        number.webhook_url = url
        await db.flush()
        return True

    try:
        client = _get_twilio_client()
        client.incoming_phone_numbers(sid).update(
            voice_url=url,
            voice_method="POST",
        )

        number.webhook_url = url
        number.last_error = None
        await db.flush()
        return True

    except Exception as e:
        logger.error(
            "Failed to configure webhooks for %s: %s",
            sid[:10],
            str(e)[:200],
        )
        number.last_error = f"webhook_config: {str(e)[:150]}"
        await db.flush()
        return False


# ---------------------------------------------------------------------------
# Number lifecycle
# ---------------------------------------------------------------------------


async def suspend_number(db: AsyncSession, user_id: uuid.UUID, reason: str) -> bool:
    number = await _get_user_number(db, user_id)
    if not number or number.status not in ("active", "pending"):
        return False

    now = datetime.now(UTC)

    sid = number.twilio_number_sid
    if sid and not sid.startswith("PN_dev_"):
        try:
            client = _get_twilio_client()
            client.incoming_phone_numbers(sid).update(
                voice_url=_suspended_twiml_url(),
                voice_method="POST",
            )
        except Exception as e:
            logger.error(
                "Failed to update webhooks during suspend for %s: %s",
                sid[:10],
                str(e)[:200],
            )
            number.last_error = f"suspend_webhook: {str(e)[:150]}"

    number.status = "suspended"
    number.suspend_reason = reason[:40]
    number.suspended_at = now
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="TWILIO_NUMBER_SUSPENDED",
        details={"reason": reason},
    )

    logger.info("Suspended number for user %s reason=%s", str(user_id)[:8], reason)
    return True


async def release_number(db: AsyncSession, user_id: uuid.UUID, reason: str) -> bool:
    number = await _get_user_number(db, user_id)
    if not number or number.status == "released":
        return False

    sid = number.twilio_number_sid
    if sid and not sid.startswith("PN_dev_"):
        try:
            client = _get_twilio_client()
            client.incoming_phone_numbers(sid).delete()
        except Exception as e:
            logger.error(
                "Failed to delete Twilio number %s: %s",
                sid[:10],
                str(e)[:200],
            )
            number.last_error = f"release_delete: {str(e)[:150]}"

    now = datetime.now(UTC)
    number.status = "released"
    number.released_at = now
    number.webhook_url = None
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="TWILIO_NUMBER_RELEASED",
        details={"reason": reason},
    )

    logger.info("Released number for user %s reason=%s", str(user_id)[:8], reason)
    return True


async def reactivate_number(db: AsyncSession, user_id: uuid.UUID) -> bool:
    number = await _get_user_number(db, user_id)
    if not number or number.status != "suspended":
        return False

    ok = await configure_number_webhooks(db, number)
    if not ok:
        logger.warning(
            "Reactivation webhook config failed for user %s",
            str(user_id)[:8],
        )

    number.status = "active"
    number.suspend_reason = None
    number.suspended_at = None
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="TWILIO_NUMBER_REACTIVATED",
    )

    return True


# ---------------------------------------------------------------------------
# List numbers
# ---------------------------------------------------------------------------


async def list_numbers(db: AsyncSession, user_id: uuid.UUID) -> NumberListResponse:
    stmt = select(UserNumber).where(
        UserNumber.owner_user_id == user_id,
    )
    result = await db.execute(stmt)
    numbers = result.scalars().all()

    return NumberListResponse(
        items=[
            NumberProvisionResponse(
                id=str(n.id),
                e164=n.e164,
                status=n.status,
                provisioned_at=n.provisioned_at,
            )
            for n in numbers
        ],
    )


# ---------------------------------------------------------------------------
# Call modes
# ---------------------------------------------------------------------------


async def get_call_modes(db: AsyncSession, user_id: uuid.UUID) -> CallModesResponse:
    config = await db.get(CallModeConfig, user_id)
    if config is None:
        config = CallModeConfig(owner_user_id=user_id)
        db.add(config)
        await db.flush()
        await db.refresh(config)

    return CallModesResponse(
        mode_a_enabled=config.mode_a_enabled,
        mode_b_enabled=config.mode_b_enabled,
        access_control=config.access_control,
        verification_status=config.verification_status,
    )


async def update_call_modes(
    db: AsyncSession,
    user_id: uuid.UUID,
    changes: dict[str, object],
) -> CallModesResponse:
    config = await db.get(CallModeConfig, user_id)
    if config is None:
        config = CallModeConfig(owner_user_id=user_id)
        db.add(config)
        await db.flush()
        await db.refresh(config)

    mode_b_was_enabled = config.mode_b_enabled

    for key, value in changes.items():
        if key == "personal_number_e164":
            continue
        if not hasattr(config, key):
            continue
        if value is None:
            continue
        setattr(config, key, value)

    if not mode_b_was_enabled and config.mode_b_enabled:
        config.verification_status = "unverified"
        config.last_verified_at = None

    config.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(config)

    return CallModesResponse(
        mode_a_enabled=config.mode_a_enabled,
        mode_b_enabled=config.mode_b_enabled,
        access_control=config.access_control,
        verification_status=config.verification_status,
    )


# ---------------------------------------------------------------------------
# Forwarding guide
# ---------------------------------------------------------------------------


def get_forwarding_guide() -> ForwardingSetupGuideResponse:
    return ForwardingSetupGuideResponse(
        generic_instructions=[
            "Open your phone's dialer app.",
            "Dial the forwarding activation code for your carrier.",
            "Replace the placeholder number with your MattBot AI number.",
            "You should hear a confirmation tone or message.",
            "Come back to MattBot and tap 'Verify Forwarding'.",
        ],
        carrier_guides=[
            CarrierGuide(
                carrier="AT&T",
                enable_busy="*67*{AI_NUMBER}#",
                enable_unreachable="*62*{AI_NUMBER}#",
                disable="##67# and ##62#",
            ),
            CarrierGuide(
                carrier="T-Mobile",
                enable_busy="**67*{AI_NUMBER}#",
                enable_unreachable="**62*{AI_NUMBER}#",
                disable="##67# and ##62#",
            ),
            CarrierGuide(
                carrier="Verizon",
                enable_busy="*71{AI_NUMBER}",
                enable_unreachable="*71{AI_NUMBER}",
                disable="*73",
            ),
            CarrierGuide(
                carrier="Other / Generic",
                enable_busy="*67*{AI_NUMBER}#",
                enable_unreachable="*62*{AI_NUMBER}#",
                disable="##002#",
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Forwarding verification
# ---------------------------------------------------------------------------


async def initiate_forwarding_verification(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> ForwardingVerifyResponse:
    from app.middleware.error_handler import AppError

    number = await _get_user_number(db, user_id)
    if not number or number.status != "active":
        raise AppError(
            "NO_ACTIVE_NUMBER",
            "You must have an active AI number first.",
            400,
        )

    stmt = select(ForwardingVerificationAttempt).where(
        ForwardingVerificationAttempt.owner_user_id == user_id,
        ForwardingVerificationAttempt.status == "pending",
    )
    result = await db.execute(stmt)
    for old in result.scalars().all():
        old.status = "expired"
        old.completed_at = datetime.now(UTC)

    code = _generate_verification_code()
    attempt = ForwardingVerificationAttempt(
        owner_user_id=user_id,
        verification_code=code,
        status="pending",
        initiated_at=datetime.now(UTC),
    )
    db.add(attempt)

    config = await db.get(CallModeConfig, user_id)
    if config:
        config.verification_status = "pending"

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="FORWARDING_VERIFICATION_STARTED",
        details={"attempt_id": str(attempt.id)},
    )

    await db.flush()
    await db.refresh(attempt)

    if app_settings.TWILIO_NUMBER_PROVISIONING_ENABLED and app_settings.TWILIO_ACCOUNT_SID:
        try:
            client = _get_twilio_client()
            twiml_url = (
                f"{app_settings.TWILIO_WEBHOOK_BASE_URL}"
                f"/webhooks/twilio/voice/verification-outbound?code={code}"
            )
            call = client.calls.create(
                to=number.e164,
                from_=number.e164,
                url=twiml_url,
            )
            attempt.twilio_call_sid = call.sid
            await db.flush()
        except Exception as e:
            logger.error("Twilio verification call failed: %s", str(e)[:200])

    return ForwardingVerifyResponse(
        attempt_id=str(attempt.id),
        status=attempt.status,
        message="Verification initiated. If in dev mode, use the webhook or complete manually.",
    )


async def check_forwarding_verification(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> ForwardingVerifyStatusResponse:
    config = await db.get(CallModeConfig, user_id)

    stmt = (
        select(ForwardingVerificationAttempt)
        .where(
            ForwardingVerificationAttempt.owner_user_id == user_id,
        )
        .order_by(ForwardingVerificationAttempt.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    latest = result.scalar_one_or_none()

    return ForwardingVerifyStatusResponse(
        verification_status=config.verification_status if config else "unverified",
        last_verified_at=config.last_verified_at if config else None,
        latest_attempt_status=latest.status if latest else None,
    )


async def complete_forwarding_verification(
    db: AsyncSession,
    ai_number_e164: str,
    forwarded_from: str | None = None,
    call_sid: str | None = None,
) -> bool:
    """Called by the inbound webhook when a forwarded call arrives."""
    stmt = select(UserNumber).where(
        UserNumber.e164 == ai_number_e164,
        UserNumber.status == "active",
    )
    result = await db.execute(stmt)
    number = result.scalar_one_or_none()
    if not number:
        return False

    user_id = number.owner_user_id

    attempt_stmt = select(ForwardingVerificationAttempt).where(
        ForwardingVerificationAttempt.owner_user_id == user_id,
        ForwardingVerificationAttempt.status == "pending",
    )
    attempt_result = await db.execute(attempt_stmt)
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        return False

    now = datetime.now(UTC)
    attempt.status = "passed"
    attempt.completed_at = now
    if call_sid:
        attempt.twilio_call_sid = call_sid

    config = await db.get(CallModeConfig, user_id)
    if config:
        config.verification_status = "verified"
        config.last_verified_at = now

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="FORWARDING_VERIFICATION_PASSED",
        details={"attempt_id": str(attempt.id)},
    )

    await db.flush()
    return True
