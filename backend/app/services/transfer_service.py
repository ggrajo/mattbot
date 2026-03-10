"""Transfer service: Twilio call transfer + loop prevention."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.call import Call
from app.models.handoff_offer import HandoffOffer
from app.models.handoff_suppression import HandoffSuppression
from app.models.user_settings import UserSettings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Transfer initiation
# ---------------------------------------------------------------------------


async def initiate_transfer(
    db: AsyncSession,
    call: Call,
    offer: HandoffOffer,
    user_settings: UserSettings,
) -> dict:
    if call.status != "in_progress":
        return {"status": "rejected", "reason": "call_not_in_progress"}

    if offer.status != "accepted":
        return {"status": "rejected", "reason": "offer_not_accepted"}

    if call.handoff_attempt_count > 0:
        return {"status": "rejected", "reason": "already_attempted"}

    if call.handoff_loop_detected:
        return {"status": "rejected", "reason": "loop_detected"}

    call.handoff_attempt_count += 1
    call.handoff_status = "transfer_starting"

    from app.core.encryption import decrypt_field

    target_phone = None

    if (
        user_settings.personal_phone_ciphertext
        and user_settings.personal_phone_nonce
        and user_settings.personal_phone_key_version is not None
    ):
        plaintext = decrypt_field(
            user_settings.personal_phone_ciphertext,
            user_settings.personal_phone_nonce,
            user_settings.personal_phone_key_version,
        )
        target_phone = plaintext.decode("utf-8")

    if not target_phone and (
        user_settings.handoff_target_phone_ciphertext
        and user_settings.handoff_target_phone_nonce
        and user_settings.handoff_target_phone_key_version is not None
    ):
        plaintext = decrypt_field(
            user_settings.handoff_target_phone_ciphertext,
            user_settings.handoff_target_phone_nonce,
            user_settings.handoff_target_phone_key_version,
        )
        target_phone = plaintext.decode("utf-8")

    if not target_phone:
        call.handoff_status = "failed"
        await db.flush()
        return {"status": "rejected", "reason": "no_target_phone"}

    caller_id = getattr(settings, "HANDOFF_CALLER_ID", "") or "+10000000000"
    timeout = min(
        user_settings.handoff_offer_timeout_seconds,
        settings.HANDOFF_TRANSFER_TIMEOUT_CAP,
    )

    twiml = (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response>"
        f'<Dial callerId="{caller_id}" timeout="{timeout}" '
        f'answerOnBridge="true" machineDetection="Enable">'
        f"<Number>{target_phone}</Number>"
        f"</Dial>"
        f"</Response>"
    )

    await db.flush()

    return {"status": "transfer_starting", "twiml": twiml}


# ---------------------------------------------------------------------------
# Loop detection
# ---------------------------------------------------------------------------


def is_loop_call(from_number: str, to_number: str) -> bool:
    handoff_cid = getattr(settings, "HANDOFF_CALLER_ID", "")
    if not handoff_cid:
        return False
    return from_number == handoff_cid


# ---------------------------------------------------------------------------
# Suppression
# ---------------------------------------------------------------------------


async def record_suppression(
    db: AsyncSession,
    user_id: uuid.UUID,
    destination_hash: str,
    ttl_seconds: int | None = None,
    reason: str | None = None,
) -> HandoffSuppression:
    if ttl_seconds is None:
        ttl_seconds = settings.HANDOFF_SUPPRESSION_TTL

    entry = HandoffSuppression(
        owner_user_id=user_id,
        destination_phone_hash=destination_hash,
        suppression_expires_at=datetime.now(UTC) + timedelta(seconds=ttl_seconds),
        reason=reason,
    )
    db.add(entry)
    await db.flush()
    return entry


async def is_suppressed(
    db: AsyncSession,
    user_id: uuid.UUID,
    destination_hash: str,
) -> bool:
    now = datetime.now(UTC)
    row = await db.scalar(
        select(HandoffSuppression).where(
            HandoffSuppression.owner_user_id == user_id,
            HandoffSuppression.destination_phone_hash == destination_hash,
            HandoffSuppression.suppression_expires_at > now,
        )
    )
    return row is not None
