"""Telephony service – Twilio or mock number provisioning and call-mode management."""

from __future__ import annotations

import logging
import random
import secrets
import string
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.middleware.error_handler import AppError
from app.models.call_mode_config import CallModeConfig
from app.models.forwarding_verification import ForwardingVerificationAttempt
from app.models.user_number import UserNumber
from app.services.billing_service import billing_service

logger = logging.getLogger(__name__)

_CARRIER_GUIDES = [
    {
        "carrier": "AT&T",
        "enable_busy": "*67*{number}#",
        "enable_no_answer": "*61*{number}#",
        "enable_unreachable": "*62*{number}#",
        "disable": "##67# ##61# ##62#",
    },
    {
        "carrier": "T-Mobile",
        "enable_busy": "**67*{number}#",
        "enable_no_answer": "**61*{number}*11*30#",
        "enable_unreachable": "**62*{number}#",
        "disable": "##67# ##61# ##62#",
    },
    {
        "carrier": "Verizon",
        "enable_busy": "*71{number}",
        "enable_no_answer": "*71{number}",
        "enable_unreachable": "*71{number}",
        "disable": "*73",
    },
]


class TelephonyService:
    """Manages phone numbers, call modes, and forwarding verification."""

    # ------------------------------------------------------------------
    # Number provisioning
    # ------------------------------------------------------------------

    async def provision_number(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> UserNumber:
        await billing_service.ensure_billing_active_for_number_provisioning(
            db, user_id
        )

        now = datetime.now(UTC)
        e164: str
        twilio_sid: str | None = None
        webhook_url: str | None = None

        if settings.TWILIO_NUMBER_PROVISIONING_ENABLED and settings.TWILIO_ACCOUNT_SID:
            from twilio.rest import Client

            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

            available = client.available_phone_numbers("US").local.list(limit=1)
            if not available:
                raise AppError(
                    "NO_NUMBERS_AVAILABLE",
                    "No phone numbers available for provisioning",
                    503,
                )

            purchased = client.incoming_phone_numbers.create(
                phone_number=available[0].phone_number,
            )
            e164 = purchased.phone_number
            twilio_sid = purchased.sid

            if settings.TWILIO_WEBHOOK_BASE_URL:
                webhook_url = f"{settings.TWILIO_WEBHOOK_BASE_URL}/api/v1/voice/incoming"
                client.incoming_phone_numbers(twilio_sid).update(
                    voice_url=webhook_url,
                    voice_method="POST",
                )
        else:
            area_code = random.randint(200, 999)
            suffix = random.randint(1000000, 9999999)
            e164 = f"+1{area_code}{suffix}"
            twilio_sid = f"PN_mock_{uuid.uuid4().hex[:16]}"

        number = UserNumber(
            owner_user_id=user_id,
            e164=e164,
            status="active",
            twilio_number_sid=twilio_sid,
            webhook_url=webhook_url,
            provisioned_at=now,
        )
        db.add(number)
        await db.flush()
        return number

    # ------------------------------------------------------------------
    # Number queries
    # ------------------------------------------------------------------

    async def get_user_numbers(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> list[UserNumber]:
        result = await db.execute(
            select(UserNumber).where(
                UserNumber.owner_user_id == user_id,
                UserNumber.status.notin_(["released"]),
            )
        )
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # Number release
    # ------------------------------------------------------------------

    async def release_number(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        number_id: uuid.UUID,
    ) -> UserNumber:
        result = await db.execute(
            select(UserNumber).where(
                UserNumber.id == number_id,
                UserNumber.owner_user_id == user_id,
            )
        )
        number = result.scalars().first()
        if not number:
            raise AppError("NUMBER_NOT_FOUND", "Number not found", 404)

        if number.status == "released":
            raise AppError("ALREADY_RELEASED", "Number already released", 400)

        if (
            settings.TWILIO_NUMBER_PROVISIONING_ENABLED
            and settings.TWILIO_ACCOUNT_SID
            and number.twilio_number_sid
            and not number.twilio_number_sid.startswith("PN_mock_")
        ):
            from twilio.rest import Client

            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            try:
                client.incoming_phone_numbers(number.twilio_number_sid).delete()
            except Exception:
                logger.exception("Failed to release Twilio number %s", number.twilio_number_sid)

        number.status = "released"
        await db.flush()
        return number

    # ------------------------------------------------------------------
    # Call modes
    # ------------------------------------------------------------------

    async def update_call_mode(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        mode_a_enabled: bool | None = None,
        mode_b_enabled: bool | None = None,
        access_control: str | None = None,
        forwarding_number: str | None = None,
    ) -> CallModeConfig:
        valid_access = {"everyone", "contacts_only", "allowlist", "blocklist"}
        if access_control is not None and access_control not in valid_access:
            raise AppError(
                "INVALID_ACCESS_CONTROL",
                f"access_control must be one of {valid_access}",
                422,
            )

        config = await self._get_or_create_call_mode(db, user_id)

        if mode_a_enabled is not None:
            config.mode_a_enabled = mode_a_enabled
        if mode_b_enabled is not None:
            config.mode_b_enabled = mode_b_enabled
        if access_control is not None:
            config.access_control = access_control
        if forwarding_number is not None:
            config.forwarding_number = forwarding_number

        await db.flush()
        return config

    async def get_call_mode(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> CallModeConfig:
        return await self._get_or_create_call_mode(db, user_id)

    async def _get_or_create_call_mode(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> CallModeConfig:
        result = await db.execute(
            select(CallModeConfig).where(CallModeConfig.user_id == user_id)
        )
        config = result.scalars().first()
        if config:
            return config

        config = CallModeConfig(user_id=user_id)
        db.add(config)
        await db.flush()
        return config

    # ------------------------------------------------------------------
    # Forwarding setup guide
    # ------------------------------------------------------------------

    async def get_forwarding_setup_guide(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> dict:
        numbers = await self.get_user_numbers(db, user_id)
        ai_number = numbers[0].e164 if numbers else None

        return {
            "ai_number": ai_number,
            "generic_instructions": [
                "Open your phone's dialer app",
                "Dial the call-forwarding activation code for your carrier",
                f"Enter your MattBot number: {ai_number or '(provision a number first)'}",
                "Press call/send to activate",
                "Test by calling your phone from another number",
            ],
            "carrier_guides": _CARRIER_GUIDES,
        }

    # ------------------------------------------------------------------
    # Forwarding verification
    # ------------------------------------------------------------------

    async def start_forwarding_verification(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> ForwardingVerificationAttempt:
        numbers = await self.get_user_numbers(db, user_id)
        if not numbers:
            raise AppError(
                "NO_NUMBER",
                "Provision a phone number before verifying forwarding",
                400,
            )

        code = "".join(random.choices(string.digits, k=6))
        now = datetime.now(UTC)
        attempt = ForwardingVerificationAttempt(
            user_id=user_id,
            verification_code=code,
            status="pending",
            expires_at=now + timedelta(minutes=10),
        )
        db.add(attempt)
        await db.flush()
        return attempt

    async def check_verification_status(
        self, db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID
    ) -> ForwardingVerificationAttempt:
        result = await db.execute(
            select(ForwardingVerificationAttempt).where(
                ForwardingVerificationAttempt.id == attempt_id,
                ForwardingVerificationAttempt.user_id == user_id,
            )
        )
        attempt = result.scalars().first()
        if not attempt:
            raise AppError(
                "ATTEMPT_NOT_FOUND", "Verification attempt not found", 404
            )

        if attempt.status == "pending" and datetime.now(UTC) > attempt.expires_at:
            attempt.status = "expired"
            await db.flush()

        return attempt

    async def complete_verification(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
        code: str,
    ) -> ForwardingVerificationAttempt:
        attempt = await self.check_verification_status(db, user_id, attempt_id)

        if attempt.status != "pending":
            raise AppError(
                "VERIFICATION_NOT_PENDING",
                f"Verification attempt is {attempt.status}",
                400,
            )

        if attempt.verification_code != code:
            attempt.status = "failed"
            await db.flush()
            raise AppError("INVALID_CODE", "Verification code does not match", 400)

        attempt.status = "verified"
        attempt.verified_at = datetime.now(UTC)
        await db.flush()
        return attempt


telephony_service = TelephonyService()
