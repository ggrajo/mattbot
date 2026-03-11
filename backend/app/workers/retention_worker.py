"""Retention enforcement worker.

Soft-deletes calls whose retention window has expired and scrubs
associated artifacts, unconfirmed memory items, and scheduled reminders.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.models.call import Call
from app.models.call_artifact import CallArtifact
from app.models.call_memory_item import CallMemoryItem
from app.models.reminder import Reminder

logger = logging.getLogger(__name__)


async def process_retention_deletions(db: AsyncSession) -> int:
    """Soft-delete expired calls and scrub linked data. Returns count."""
    now = utcnow()

    stmt = (
        select(Call)
        .where(
            Call.retention_expires_at <= now,
            Call.deleted_at.is_(None),
        )
        .limit(50)
    )

    result = await db.execute(stmt)
    expired_calls = list(result.scalars().all())

    if not expired_calls:
        return 0

    for call in expired_calls:
        call.deleted_at = now

        await db.execute(
            update(CallArtifact)
            .where(CallArtifact.call_id == call.id)
            .values(
                summary_text_ciphertext=None,
                summary_text_nonce=None,
                summary_text_key_version=None,
                notes_ciphertext=None,
                notes_nonce=None,
                notes_key_version=None,
                transcript_provider_ref=None,
            )
        )

        await db.execute(
            update(CallMemoryItem)
            .where(
                CallMemoryItem.source_call_id == call.id,
                CallMemoryItem.user_confirmed.is_(False),
                CallMemoryItem.deleted_at.is_(None),
            )
            .values(deleted_at=now)
        )

        await db.execute(
            update(Reminder)
            .where(
                Reminder.call_id == call.id,
                Reminder.status == "scheduled",
            )
            .values(status="cancelled")
        )

        logger.info(
            "Retention-deleted call %s for user %s",
            str(call.id)[:8],
            str(call.owner_user_id)[:8],
        )

    await db.flush()
    return len(expired_calls)
