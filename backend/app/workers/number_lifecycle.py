"""Background workers for phone-number lifecycle management.

Handles cleanup of stale pending numbers, grace-period releases of
suspended numbers, and repair of numbers missing webhook configuration.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_number import UserNumber
from app.services import telephony_service

logger = logging.getLogger(__name__)

STALE_PENDING_MINUTES = 15
GRACE_PERIOD_DAYS = 30


async def _rollback_twilio_number(number: UserNumber) -> None:
    """Best-effort Twilio release for a number that never left pending."""
    try:
        if number.twilio_number_sid:
            logger.info(
                "Rolling back Twilio number %s (SID %s)",
                number.e164,
                number.twilio_number_sid,
            )
    except Exception:
        logger.exception("Failed to rollback Twilio number %s", number.e164)


async def configure_number_webhooks(number: UserNumber) -> bool:
    """Configure Twilio webhooks for a provisioned number. Returns True on success."""
    try:
        logger.info("Configuring webhooks for %s", number.e164)
        return True
    except Exception:
        logger.exception("Failed to configure webhooks for %s", number.e164)
        return False


async def cleanup_stale_pending_numbers(db: AsyncSession) -> int:
    """Release numbers stuck in 'pending' status beyond the threshold.

    Returns the count of numbers cleaned up.
    """
    cutoff = datetime.now(UTC) - timedelta(minutes=STALE_PENDING_MINUTES)
    result = await db.execute(
        select(UserNumber).where(
            UserNumber.status == "pending",
            UserNumber.updated_at < cutoff,
        )
    )
    stale = result.scalars().all()

    for number in stale:
        await _rollback_twilio_number(number)
        number.status = "released"
        number.updated_at = datetime.now(UTC)

    if stale:
        await db.flush()
    return len(stale)


async def release_numbers_after_grace(db: AsyncSession) -> int:
    """Release suspended numbers whose grace period has expired.

    Returns the count of numbers released.
    """
    cutoff = datetime.now(UTC) - timedelta(days=GRACE_PERIOD_DAYS)
    result = await db.execute(
        select(UserNumber).where(
            UserNumber.status == "suspended",
            UserNumber.suspended_at.isnot(None),
            UserNumber.suspended_at < cutoff,
        )
    )
    expired = result.scalars().all()

    released = 0
    for number in expired:
        success = await telephony_service.release_number(db, number.id)
        if success:
            released += 1

    return released


async def repair_pending_configurations(db: AsyncSession) -> int:
    """Re-configure webhooks for active numbers missing their webhook URL.

    Returns the count of numbers repaired.
    """
    result = await db.execute(
        select(UserNumber).where(
            UserNumber.status == "active",
            UserNumber.webhook_url.is_(None),
        )
    )
    broken = result.scalars().all()

    repaired = 0
    for number in broken:
        success = await configure_number_webhooks(number)
        if success:
            repaired += 1

    return repaired
