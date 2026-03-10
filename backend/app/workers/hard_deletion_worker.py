"""Hard deletion worker.

Permanently removes call rows (and cascaded children) that have been
soft-deleted for more than 7 days.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call import Call
from app.models.call_artifact import CallArtifact
from app.models.call_event import CallEvent
from app.models.call_memory_item import CallMemoryItem

logger = logging.getLogger(__name__)

HARD_DELETE_GRACE_DAYS = 7


async def process_hard_deletions(db: AsyncSession) -> int:
    """Hard-delete calls soft-deleted more than 7 days ago. Returns count."""
    cutoff = datetime.now(UTC) - timedelta(days=HARD_DELETE_GRACE_DAYS)

    stmt = (
        select(Call)
        .where(
            Call.deleted_at.is_not(None),
            Call.deleted_at < cutoff,
        )
        .limit(50)
    )

    result = await db.execute(stmt)
    calls = list(result.scalars().all())

    if not calls:
        return 0

    for call in calls:
        cid = call.id

        await db.execute(delete(CallEvent).where(CallEvent.call_id == cid))

        await db.execute(delete(CallArtifact).where(CallArtifact.call_id == cid))

        await db.execute(delete(CallMemoryItem).where(CallMemoryItem.source_call_id == cid))

        await db.execute(delete(Call).where(Call.id == cid))

        logger.info("Hard-deleted call %s", str(cid)[:8])

    await db.flush()
    return len(calls)
