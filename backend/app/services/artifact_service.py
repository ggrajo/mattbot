"""Service for managing post-call artifacts (transcripts, summaries, etc.)."""

import logging
import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.call import Call
from app.models.call_artifact import CallArtifact
from app.models.call_memory_item import CallMemoryItem

logger = logging.getLogger(__name__)


class ArtifactService:

    @staticmethod
    async def create_artifact(
        db: AsyncSession,
        call_id: uuid.UUID,
        artifact_type: str,
        content: str,
        metadata: dict | None = None,
    ) -> CallArtifact:
        artifact = CallArtifact(
            call_id=call_id,
            artifact_type=artifact_type,
            content=content,
            metadata_json=metadata,
        )
        db.add(artifact)
        await db.flush()
        return artifact

    @staticmethod
    async def get_artifacts_for_call(
        db: AsyncSession,
        call_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> list[CallArtifact]:
        call_result = await db.execute(
            select(Call).where(Call.id == call_id, Call.user_id == user_id)
        )
        call = call_result.scalar_one_or_none()
        if not call:
            raise AppError("CALL_NOT_FOUND", "Call not found", 404)

        result = await db.execute(
            select(CallArtifact)
            .where(CallArtifact.call_id == call_id)
            .order_by(CallArtifact.created_at)
        )
        return list(result.scalars().all())

    @staticmethod
    async def generate_summary(transcript: str) -> str:
        """Placeholder for AI-powered summary generation.

        In production this will call an LLM to produce a concise summary.
        """
        if not transcript:
            return ""
        lines = transcript.strip().splitlines()
        if len(lines) <= 5:
            return transcript.strip()
        return f"Call summary ({len(lines)} lines of transcript). Full AI summary coming soon."

    @staticmethod
    async def extract_memory_items(
        db: AsyncSession,
        call_id: uuid.UUID,
        user_id: uuid.UUID,
        transcript: str,
        caller_phone_hash: str | None = None,
        caller_name: str | None = None,
    ) -> list[CallMemoryItem]:
        """Extract facts and preferences from a call transcript and persist them.

        Currently uses simple heuristic extraction. In production this will
        call an LLM to identify memorable facts, preferences, and action items.
        """
        if not transcript:
            return []

        items: list[CallMemoryItem] = []

        fact_patterns = [
            (r"(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", "fact"),
            (r"(?:i work at|i'm with|calling from)\s+(.+?)(?:\.|,|$)", "fact"),
            (r"(?:my (?:email|phone|number) is)\s+(\S+)", "fact"),
        ]

        preference_patterns = [
            (r"(?:i prefer|i'd like|i want)\s+(.+?)(?:\.|,|$)", "preference"),
            (r"(?:please (?:call|email|text) me)\s+(.+?)(?:\.|,|$)", "preference"),
            (r"(?:best time to reach me is|available)\s+(.+?)(?:\.|,|$)", "preference"),
        ]

        action_patterns = [
            (r"(?:please (?:tell|ask|let|have|remind))\s+(.+?)(?:\.|,|$)", "action"),
            (r"(?:i need|i'd like to schedule|can you book)\s+(.+?)(?:\.|,|$)", "action"),
        ]

        all_patterns = fact_patterns + preference_patterns + action_patterns

        for pattern, memory_type in all_patterns:
            for match in re.finditer(pattern, transcript, re.IGNORECASE):
                content = match.group(1).strip()
                if len(content) < 3 or len(content) > 500:
                    continue
                item = CallMemoryItem(
                    user_id=user_id,
                    call_id=call_id,
                    memory_type=memory_type,
                    content=content,
                    source="ai",
                    caller_phone_hash=caller_phone_hash,
                    caller_name=caller_name,
                    importance=2 if memory_type == "action" else 1,
                )
                db.add(item)
                items.append(item)

        if items:
            await db.flush()
            logger.info(
                "Extracted %d memory items from call %s", len(items), call_id
            )

        return items
