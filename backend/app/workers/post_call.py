"""Post-call artifact processing worker.

Polls for pending/processing artifacts and runs the artifact pipeline.
Also sends privacy-safe push notifications when artifacts become ready.
"""

from __future__ import annotations

import logging

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call_artifact import CallArtifact
from app.services import artifact_service
from app.services.event_emitter import emit_event
from app.services.notification_service import notify_call_screened

logger = logging.getLogger(__name__)


async def process_pending_artifacts(db: AsyncSession) -> int:
    """Find and process pending artifacts. Returns count of processed items."""
    stmt = (
        select(CallArtifact)
        .where(
            or_(
                CallArtifact.summary_status.in_(("pending", "processing")),
                CallArtifact.labels_status.in_(("pending", "processing")),
                CallArtifact.transcript_status.in_(("pending", "processing")),
            )
        )
        .limit(10)
    )

    result = await db.execute(stmt)
    artifacts = list(result.scalars().all())

    processed = 0
    for artifact in artifacts:
        try:
            all_done = await artifact_service.process_call_artifacts(db, artifact)

            cid = str(artifact.call_id)
            uid = str(artifact.owner_user_id)

            if artifact.transcript_status == "ready":
                await emit_event(
                    user_id=uid,
                    event_type="TRANSCRIPT_READY",
                    call_id=cid,
                    seq=1,
                    payload={},
                )

            if artifact.summary_status == "ready":
                await emit_event(
                    user_id=uid,
                    event_type="SUMMARY_READY",
                    call_id=cid,
                    seq=2,
                    payload={},
                )

            if all_done:
                await notify_call_screened(
                    db,
                    call_id=artifact.call_id,
                    user_id=artifact.owner_user_id,
                    labels=artifact.labels_json,
                )

            processed += 1
        except Exception:
            logger.exception("Failed to process artifacts for call %s", artifact.call_id)

    return processed
