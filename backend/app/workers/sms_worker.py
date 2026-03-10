"""SMS send worker — polls approved outbound messages and dispatches via Twilio.

Currently a stub: logs the send intent and marks messages as sent.
In production this would be driven by an SQS queue (q-messaging).
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.encryption import decrypt_field
from app.models.outbound_message import OutboundMessage
from app.models.text_send_attempt import TextSendAttempt

logger = logging.getLogger(__name__)

_BATCH_SIZE = 10


async def process_pending_sms(db: AsyncSession) -> int:
    """Pick up approved messages and attempt to send them.

    Returns the number of messages processed.
    """
    stmt = (
        select(OutboundMessage)
        .where(OutboundMessage.status == "approved")
        .options(selectinload(OutboundMessage.send_attempts))
        .order_by(OutboundMessage.approved_at.asc())
        .limit(_BATCH_SIZE)
    )

    result = await db.execute(stmt)
    messages = result.scalars().all()

    processed = 0
    for msg in messages:
        try:
            await _send_single(db, msg)
            processed += 1
        except Exception:
            logger.exception("Failed to process message %s", msg.id)
            msg.status = "failed"
            msg.last_error_code = "WORKER_EXCEPTION"
            msg.last_error_message_short = "Unexpected error during send"

    return processed


async def _send_single(db: AsyncSession, msg: OutboundMessage) -> None:
    """Send a single outbound message (stub implementation)."""
    msg.status = "sending"
    await db.flush()

    if msg.final_body_ciphertext and msg.final_body_nonce and msg.final_body_key_version:
        body_plain = decrypt_field(
            msg.final_body_ciphertext,
            msg.final_body_nonce,
            msg.final_body_key_version,
        ).decode("utf-8")
    else:
        body_plain = decrypt_field(
            msg.draft_body_ciphertext,
            msg.draft_body_nonce,
            msg.draft_body_key_version,
        ).decode("utf-8")

    to_number = decrypt_field(
        msg.to_number_ciphertext,
        msg.to_number_nonce,
        msg.to_number_key_version,
    ).decode("utf-8")

    logger.info(
        "SMS target: %s, body length: %d",
        to_number[:4] + "****",
        len(body_plain),
    )

    attempt_count = len(msg.send_attempts) + 1
    idempotency_key = f"{msg.id}:{attempt_count}"

    attempt = TextSendAttempt(
        message_id=msg.id,
        attempt_number=attempt_count,
        idempotency_key=idempotency_key,
        provider="twilio",
        started_at=datetime.now(UTC),
    )
    db.add(attempt)
    await db.flush()

    stub_sid = f"SM_stub_{uuid.uuid4().hex[:16]}"
    logger.info(
        "STUB SMS send: to=%s body_len=%d from=%s sid=%s",
        msg.to_number_last4,
        len(body_plain),
        msg.from_number_e164 or "(auto)",
        stub_sid,
    )

    attempt.provider_message_sid = stub_sid
    attempt.provider_status = "queued"
    attempt.finished_at = datetime.now(UTC)

    msg.status = "sent"
    await db.flush()
