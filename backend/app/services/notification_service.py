"""Privacy-safe push notification payload builder and quiet hours check."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.encryption import decrypt_field
from app.models.device import Device
from app.models.notification import Notification
from app.models.notification_delivery import NotificationDelivery
from app.models.push_token import PushToken
from app.models.user_settings import UserSettings
from app.services.event_emitter import emit_event

logger = logging.getLogger(__name__)


def build_push_payload(
    notification_type: str,
    data: dict[str, str],
    privacy_mode: str = "normal",
) -> dict[str, object]:
    """Build a push notification payload respecting privacy settings.

    Never includes: transcripts, full phone numbers, recording links, OTP codes.
    """
    payload_data: dict = {}

    base = {"title": "MattBot", "data": payload_data}

    safe_data_keys = {"call_id", "event_type", "timestamp"}
    for k, v in data.items():
        if k not in safe_data_keys:
            continue
        payload_data[k] = v

    if "call_id" in data:
        payload_data["deep_link"] = f"mattbot://call/{data['call_id']}"

    if privacy_mode == "preview":
        base["body"] = _build_preview_body(notification_type, data)
    else:
        base["body"] = "New activity"

    return base


def _build_preview_body(notification_type: str, data: dict) -> str:
    previews = {
        "incoming_call": "Incoming call",
        "missed_call": "Missed call",
        "voicemail": "New voicemail received",
        "call_summary": "Call summary ready",
        "call_screened": "Call was screened",
    }
    return previews.get(notification_type, "New activity")


def _time_in_range(start: time, end: time, current_time: time) -> bool:
    """Check if current_time falls within start-end, handling overnight spans."""
    if start <= end:
        return bool(start <= current_time <= end)
    else:
        return bool(current_time >= start or current_time <= end)


def is_quiet_hours(settings: UserSettings, now: datetime | None = None) -> bool:
    """Check if current time falls within any of the user's quiet hours intervals."""
    if not settings.quiet_hours_enabled:
        return False

    if now is None:
        now = utcnow()

    current_day = now.weekday()
    iso_to_js_day = (current_day + 1) % 7
    current_time = now.time()

    intervals = settings.quiet_hours_intervals or []

    if intervals:
        for iv in intervals:
            iv_days = iv.get("days", [0, 1, 2, 3, 4, 5, 6])
            if iv_days and iso_to_js_day not in iv_days:
                continue
            try:
                parts_s = iv["start"].split(":")
                parts_e = iv["end"].split(":")
                from datetime import time as dt_time

                start = dt_time(int(parts_s[0]), int(parts_s[1]))
                end = dt_time(int(parts_e[0]), int(parts_e[1]))
                if _time_in_range(start, end, current_time):
                    return True
            except (KeyError, ValueError, IndexError):
                continue

        return False

    if settings.quiet_hours_start is None or settings.quiet_hours_end is None:
        return False

    days = settings.quiet_hours_days or []
    if days and iso_to_js_day not in days:
        return False

    return _time_in_range(settings.quiet_hours_start, settings.quiet_hours_end, current_time)


def should_allow_call(settings: UserSettings, caller_is_vip: bool = False) -> bool:
    """Return True if a call should ring through despite quiet hours."""
    if not is_quiet_hours(settings):
        return True
    return caller_is_vip and settings.quiet_hours_allow_vip


async def notify_call_screened(
    db: AsyncSession,
    call_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    labels: list[dict] | None = None,
) -> None:
    """Send a privacy-safe push notification when post-call artifacts are ready.

    Respects quiet hours with bypass for urgent/VIP labels.
    """
    settings_row = (
        await db.execute(select(UserSettings).where(UserSettings.owner_user_id == user_id))
    ).scalar_one_or_none()

    is_important = False
    if labels:
        important_labels = {"urgent", "vip"}
        is_important = any(lbl.get("label_name") in important_labels for lbl in labels)

    if settings_row and is_quiet_hours(settings_row) and not is_important:
        logger.info(
            "Suppressing call_screened notification for %s (quiet hours)",
            str(call_id)[:8],
        )
        return

    privacy_mode = "private"
    if settings_row:
        privacy_mode = settings_row.notification_privacy_mode or "private"

    _payload = build_push_payload(
        notification_type="call_screened",
        data={
            "call_id": str(call_id),
            "event_type": "call_screened",
            "timestamp": utcnow().isoformat(),
        },
        privacy_mode=privacy_mode,
    )

    tokens_result = await db.execute(
        select(PushToken)
        .join(Device, PushToken.device_id == Device.id)
        .where(
            Device.owner_user_id == user_id,
            Device.revoked_at.is_(None),
            PushToken.revoked_at.is_(None),
        )
    )

    tokens = list(tokens_result.scalars().all())

    if not tokens:
        logger.debug("No push tokens for user %s", str(user_id)[:8])
        return

    for token in tokens:
        logger.info(
            "Would send push to device %s for call %s (provider=%s)",
            str(token.device_id)[:8] if hasattr(token, "device_id") else "unknown",
            str(call_id)[:8],
            getattr(token, "provider", "unknown"),
        )

    uid = str(user_id)
    cid = str(call_id)

    await emit_event(
        user_id=uid,
        event_type="CALL_ENDED",
        call_id=cid,
        seq=1,
        payload={"labels": labels or []},
    )

    await emit_event(
        user_id=uid,
        event_type="SUMMARY_READY",
        call_id=cid,
        seq=2,
        payload={},
    )

    await emit_event(
        user_id=uid,
        event_type="TRANSCRIPT_READY",
        call_id=cid,
        seq=3,
        payload={},
    )


async def create_and_enqueue_notification(
    db: AsyncSession,
    owner_user_id: uuid.UUID,
    notification_type: str,
    *,
    priority: str = "normal",
    source_entity_type: str | None = None,
    source_entity_id: uuid.UUID | None = None,
) -> Notification:
    """Persist a notification and create delivery rows for each active device."""
    settings_row = (
        await db.execute(select(UserSettings).where(UserSettings.owner_user_id == owner_user_id))
    ).scalar_one_or_none()

    privacy_mode = "private"
    if settings_row:
        privacy_mode = settings_row.notification_privacy_mode or "private"

    quiet_hours_value = "none"
    if settings_row and is_quiet_hours(settings_row):
        quiet_hours_value = "suppressed" if priority in ("low", "normal") else "silent"

    notification = Notification(
        owner_user_id=owner_user_id,
        type=notification_type,
        priority=priority,
        source_entity_type=source_entity_type,
        source_entity_id=source_entity_id,
        privacy_mode_applied=privacy_mode,
        quiet_hours_applied=quiet_hours_value,
    )
    db.add(notification)
    await db.flush()

    tokens_result = await db.execute(
        select(PushToken)
        .join(Device, PushToken.device_id == Device.id)
        .where(
            Device.owner_user_id == owner_user_id,
            Device.revoked_at.is_(None),
            PushToken.revoked_at.is_(None),
        )
    )

    tokens = list(tokens_result.scalars().all())

    for token in tokens:
        delivery = NotificationDelivery(
            notification_id=notification.id,
            device_id=token.device_id,
            provider=token.provider,
        )
        db.add(delivery)

    await db.flush()

    logger.info(
        "Created notification %s (%s) for user %s with %d delivery(ies)",
        str(notification.id)[:8],
        notification_type,
        str(owner_user_id)[:8],
        len(tokens),
    )

    return notification


def _decrypt_personal_phone(settings_row: UserSettings) -> str | None:
    """Decrypt the user's personal phone. Falls back to legacy urgent_notify_phone."""
    ct = settings_row.personal_phone_ciphertext
    nonce = settings_row.personal_phone_nonce
    kv = settings_row.personal_phone_key_version

    if ct and nonce and kv is not None:
        try:
            return decrypt_field(ct, nonce, kv).decode("utf-8")
        except Exception:
            logger.exception("Failed to decrypt personal phone")

    ct = settings_row.urgent_notify_phone_ciphertext
    nonce = settings_row.urgent_notify_phone_nonce
    kv = settings_row.urgent_notify_phone_key_version

    if ct and nonce and kv is not None:
        try:
            return decrypt_field(ct, nonce, kv).decode("utf-8")
        except Exception:
            logger.exception("Failed to decrypt urgent notify phone")

    return None


async def send_urgent_sms(
    settings_row: UserSettings,
    caller_info: str,
    summary_snippet: str,
    call_id: uuid.UUID,
    from_number: str | None = None,
) -> bool:
    """Send SMS alert to user's urgent notification phone via Twilio."""
    phone = _decrypt_personal_phone(settings_row)
    if not phone:
        logger.warning("Cannot send urgent SMS: no phone configured")
        return False

    if not from_number:
        logger.warning("Cannot send urgent SMS: no from_number available")
        return False

    try:
        from app.services.telephony_service import _get_twilio_client

        client = _get_twilio_client()

        body = f"URGENT CALL from {caller_info}: {summary_snippet[:120]}. Open MattBot for details."

        client.messages.create(
            body=body,
            from_=from_number,
            to=phone,
        )

        logger.info("Urgent SMS sent to ***%s for call %s", phone[-4:], str(call_id)[:8])
        return True
    except Exception:
        logger.exception("Failed to send urgent SMS for call %s", str(call_id)[:8])
        return False


async def send_urgent_email(
    settings_row: UserSettings,
    user_email: str,
    caller_info: str,
    summary_snippet: str,
    call_id: uuid.UUID,
) -> bool:
    """Send email alert for an urgent call."""
    to_address = settings_row.urgent_notify_email_address or user_email
    if not to_address:
        logger.warning("Cannot send urgent email: no email address available")
        return False

    try:
        from app.services.email_service import send_email

        subject = f"Urgent Call from {caller_info}"

        body = (
            f"You have an urgent call in MattBot.\n\n"
            f"Caller: {caller_info}\n"
            f"Summary: {summary_snippet}\n\n"
            f"Open the app for full details: mattbot://call/{call_id}"
        )

        await send_email(to=to_address, subject=subject, body=body)

        logger.info("Urgent email sent to %s for call %s", to_address[:3] + "***", str(call_id)[:8])
        return True
    except Exception:
        logger.exception("Failed to send urgent email for call %s", str(call_id)[:8])
        return False


async def send_urgent_call(
    settings_row: UserSettings,
    caller_info: str,
    summary_snippet: str,
    call_id: uuid.UUID,
    from_number: str | None = None,
) -> bool:
    """Place an outbound TwiML voice call to alert the user about an urgent call.

    Note: this call consumes the user's call minutes allocation.
    """
    phone = _decrypt_personal_phone(settings_row)
    if not phone:
        logger.warning("Cannot send urgent call: no phone configured")
        return False

    if not from_number:
        logger.warning("Cannot send urgent call: no from_number available")
        return False

    try:
        from xml.sax.saxutils import escape as xml_escape

        from app.services.telephony_service import _get_twilio_client

        safe_caller = xml_escape(caller_info[:80])
        safe_summary = xml_escape(summary_snippet[:200])

        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Response><Say voice="Polly.Joanna">'
            f"You have an urgent call in Matt Bot from {safe_caller}"
            f". The caller said: {safe_summary}"
            ". Please check the app for full details."
            '</Say><Pause length="1"/><Hangup/></Response>'
        )

        client = _get_twilio_client()
        call = client.calls.create(
            twiml=twiml,
            from_=from_number,
            to=phone,
        )

        logger.info(
            "Urgent alert call placed to ***%s for call %s (sid=%s)",
            phone[-4:],
            str(call_id)[:8],
            call.sid,
        )
        return True
    except Exception:
        logger.exception("Failed to place urgent alert call for call %s", str(call_id)[:8])
        return False


async def dispatch_urgent_notifications(
    db: AsyncSession,
    settings_row: UserSettings,
    user_email: str,
    caller_info: str,
    summary_snippet: str,
    call_id: uuid.UUID,
) -> dict[str, bool]:
    """Check user preferences and dispatch enabled urgent notification channels.

    Returns a dict of {channel: success} for each enabled channel.
    """
    results: dict = {}

    from_number = None
    if settings_row.urgent_notify_sms or settings_row.urgent_notify_call:
        from app.models.user_number import UserNumber

        num_row = (
            await db.execute(
                select(UserNumber)
                .where(
                    UserNumber.owner_user_id == settings_row.owner_user_id,
                    UserNumber.status == "active",
                )
                .limit(1)
            )
        ).scalar_one_or_none()

        if num_row:
            from_number = num_row.e164

    if settings_row.urgent_notify_sms:
        results["sms"] = await send_urgent_sms(
            settings_row,
            caller_info,
            summary_snippet,
            call_id,
            from_number,
        )

    if settings_row.urgent_notify_email:
        results["email"] = await send_urgent_email(
            settings_row,
            user_email,
            caller_info,
            summary_snippet,
            call_id,
        )

    if settings_row.urgent_notify_call:
        results["call"] = await send_urgent_call(
            settings_row,
            caller_info,
            summary_snippet,
            call_id,
            from_number,
        )

    if results:
        from app.services import audit_service

        await audit_service.log_event(
            db,
            owner_user_id=settings_row.owner_user_id,
            event_type="urgent_notification.dispatched",
            details={
                "call_id": str(call_id),
                "channels": results,
            },
        )

    return results
