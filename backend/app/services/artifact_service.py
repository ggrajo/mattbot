"""Service for managing post-call artifacts (transcripts, summaries, etc.)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.call import Call
from app.models.call_artifact import CallArtifact


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
