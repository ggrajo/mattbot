"""Background tasks for Twilio number lifecycle management.

cleanup_stale_pending_numbers  - release numbers stuck in pending > 15 min
release_numbers_after_grace    - release suspended numbers after grace period
repair_pending_configurations  - fix active numbers missing webhook config
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user_number import UserNumber
from app.services import audit_service
from app.services.telephony_service import (
    SUSPENSION_GRACE_DAYS,
    _rollback_twilio_number,
    configure_number_webhooks,
)

logger = logging.getLogger(__name__)


async def cleanup_stale_pending_numbers(db: AsyncSession) -> int:
    """Release numbers stuck in 'pending' longer than PENDING_TTL_MINUTES."""
    cutoff = datetime.now(UTC) - timedelta(minutes=settings.NUMBER_PENDING_TTL_MINUTES)
    stmt = select(UserNumber).where(
        UserNumber.status == "pending",
        UserNumber.updated_at < cutoff,
    )

    result = await db.execute(stmt)
    numbers = result.scalars().all()

    released = 0
    for num in numbers:
        if num.twilio_number_sid:
            _rollback_twilio_number(num.twilio_number_sid)

        num.status = "released"
        num.released_at = datetime.now(UTC)
        num.last_error = "pending_ttl_exceeded"

        await audit_service.log_event(
            db,
            owner_user_id=num.owner_user_id,
            event_type="TWILIO_NUMBER_RELEASED",
            details={
                "reason": "pending_ttl_exceeded",
                "number_id": str(num.id),
            },
        )

        released += 1
        logger.info(
            "Cleaned up stale pending number %s for user %s",
            str(num.id)[:8],
            str(num.owner_user_id)[:8],
        )

    if released:
        await db.flush()
    return released


async def release_numbers_after_grace(
    db: AsyncSession, grace_days: int = SUSPENSION_GRACE_DAYS
) -> int:
    """Release suspended numbers whose grace period has expired."""

    cutoff = datetime.now(UTC) - timedelta(days=grace_days)
    stmt = select(UserNumber).where(
        UserNumber.status == "suspended",
        UserNumber.suspended_at < cutoff,
    )

    result = await db.execute(stmt)
    numbers = result.scalars().all()

    released = 0
    for num in numbers:
        from app.services import telephony_service

        ok = await telephony_service.release_number(
            db, num.owner_user_id, reason="grace_period_expired"
        )

        if not ok:
            continue
        released += 1

    return released


async def repair_pending_configurations(db: AsyncSession) -> int:
    """Fix active numbers that are missing webhook configuration."""
    stmt = select(UserNumber).where(
        UserNumber.status == "active",
        UserNumber.webhook_url.is_(None),
    )

    result = await db.execute(stmt)
    numbers = result.scalars().all()

    repaired = 0
    for num in numbers:
        ok = await configure_number_webhooks(db, num)
        if not ok:
            continue
        repaired += 1
        logger.info(
            "Repaired webhook config for number %s",
            str(num.id)[:8],
        )

    if repaired:
        await db.flush()
    return repaired
