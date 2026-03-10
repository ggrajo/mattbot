"""Reminder poller — triggers due reminders."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reminder import Reminder

logger = logging.getLogger(__name__)


async def process_due_reminders(db: AsyncSession) -> int:
    """Find scheduled reminders past their due_at and mark them triggered.

    Returns the number of reminders that were triggered.
    """
    now = datetime.now(UTC)

    stmt = select(Reminder).where(
        Reminder.status == "scheduled",
        Reminder.due_at <= now,
    )

    result = await db.execute(stmt)
    due_reminders = result.scalars().all()

    if not due_reminders:
        return 0

    ids = [r.id for r in due_reminders]

    await db.execute(update(Reminder).where(Reminder.id.in_(ids)).values(status="triggered"))

    for r in due_reminders:
        logger.info(
            "Reminder triggered: id=%s user=%s title=%s",
            r.id,
            r.owner_user_id,
            r.title,
        )

    return len(ids)
