"""Post-call processing worker.

After a call ends, this worker generates artifacts: transcript, summary,
and action items.  It runs asynchronously so the call teardown is not blocked.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call import Call
from app.models.call_ai_session import CallAiSession
from app.models.call_artifact import CallArtifact
from app.services.artifact_service import ArtifactService

logger = logging.getLogger(__name__)


async def process_post_call(db: AsyncSession, call_id: uuid.UUID) -> None:
    """Generate transcript, summary, and action items after a call ends."""
    call_result = await db.execute(select(Call).where(Call.id == call_id))
    call = call_result.scalar_one_or_none()
    if not call:
        logger.warning("post_call: call %s not found", call_id)
        return

    session_result = await db.execute(
        select(CallAiSession).where(CallAiSession.call_id == call_id)
    )
    ai_session = session_result.scalar_one_or_none()

    existing = await db.execute(
        select(CallArtifact).where(
            CallArtifact.call_id == call_id,
            CallArtifact.artifact_type == "transcript",
        )
    )
    if existing.scalar_one_or_none():
        logger.info("post_call: artifacts already exist for call %s, skipping", call_id)
        return

    transcript_text = _fetch_transcript(ai_session)
    if transcript_text:
        await ArtifactService.create_artifact(
            db, call_id, "transcript", transcript_text
        )

    summary = await ArtifactService.generate_summary(transcript_text)
    if summary:
        await ArtifactService.create_artifact(
            db, call_id, "summary", summary
        )

    action_items = _extract_action_items(transcript_text)
    if action_items:
        await ArtifactService.create_artifact(
            db, call_id, "action_items", action_items
        )

    await db.commit()
    logger.info("post_call: artifacts generated for call %s", call_id)


def _fetch_transcript(ai_session: CallAiSession | None) -> str:
    """Retrieve the transcript from the AI session provider.

    Placeholder – in production this calls the ElevenLabs transcript API.
    """
    if ai_session and ai_session.elevenlabs_conversation_id:
        return f"[Transcript for conversation {ai_session.elevenlabs_conversation_id} – placeholder]"
    return ""


def _extract_action_items(transcript: str) -> str:
    """Extract action items from a transcript.

    Placeholder – in production this calls an LLM.
    """
    if not transcript:
        return ""
    return "No action items detected (AI extraction coming soon)."
