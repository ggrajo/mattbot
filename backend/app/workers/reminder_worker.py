"""Reminder poller — triggers due reminders and sends push notifications."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.models.reminder import Reminder
from app.services.notification_service import create_and_enqueue_notification

logger = logging.getLogger(__name__)


async def process_due_reminders(db: AsyncSession) -> int:
    """Find scheduled reminders past their due_at and mark them triggered.

    Sends a push notification for each triggered reminder.
    Returns the number of reminders that were triggered.
    """
    now = utcnow()

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
        try:
            await create_and_enqueue_notification(
                db,
                owner_user_id=r.owner_user_id,
                notification_type="reminder_due",
                priority="high",
                source_entity_type="reminder",
                source_entity_id=r.id,
            )
        except Exception:
            logger.exception("Failed to enqueue notification for reminder %s", r.id)

    return len(ids)
