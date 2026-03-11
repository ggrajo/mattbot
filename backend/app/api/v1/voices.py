"""Voice catalog API."""

import logging
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError

logger = logging.getLogger(__name__)

router = APIRouter()


class VoiceResponse(BaseModel):
    id: uuid.UUID
    voice_id: str
    name: str
    provider: str
    gender: str | None = None
    accent: str | None = None
    preview_url: str | None = None
    locale: str = "en"
    is_active: bool = True

    model_config = {"from_attributes": True}


class VoiceListResponse(BaseModel):
    voices: list[VoiceResponse]
    total: int


class VoicePreviewResponse(BaseModel):
    preview_url: str


@router.get("", response_model=VoiceListResponse)
async def list_voices(
    gender: str | None = Query(None),
    locale: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VoiceListResponse:
    try:
        from app.models.voice_catalog import VoiceCatalog

        base = select(VoiceCatalog).where(VoiceCatalog.is_active.is_(True))
        if gender is not None:
            base = base.where(VoiceCatalog.gender == gender)
        if locale is not None:
            base = base.where(VoiceCatalog.locale == locale)

        result = await db.execute(base.order_by(VoiceCatalog.name))
        voices = list(result.scalars().all())

        return VoiceListResponse(
            voices=[VoiceResponse.model_validate(v) for v in voices],
            total=len(voices),
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to list voices")
        raise AppError("VOICE_ERROR", f"Failed to list voices: {e}", 500)


@router.get("/preview/{voice_id}", response_model=VoicePreviewResponse)
async def get_voice_preview(
    voice_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VoicePreviewResponse:
    """Return preview URL for a voice by its provider voice_id string."""
    try:
        from app.models.voice_catalog import VoiceCatalog

        result = await db.execute(
            select(VoiceCatalog).where(
                VoiceCatalog.voice_id == voice_id,
                VoiceCatalog.is_active.is_(True),
            )
        )
        voice = result.scalars().first()
        if voice is None:
            raise AppError("VOICE_NOT_FOUND", "Voice not found", 404)

        preview_url = voice.preview_url
        if not preview_url:
            preview_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream?optimize_streaming_latency=0"

        return VoicePreviewResponse(preview_url=preview_url)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get voice preview %s", voice_id)
        raise AppError("VOICE_ERROR", f"Failed to get voice preview: {e}", 500)


@router.get("/{voice_id}", response_model=VoiceResponse)
async def get_voice(
    voice_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VoiceResponse:
    try:
        from app.models.voice_catalog import VoiceCatalog

        result = await db.execute(
            select(VoiceCatalog).where(
                VoiceCatalog.id == voice_id,
                VoiceCatalog.is_active.is_(True),
            )
        )
        voice = result.scalars().first()
        if voice is None:
            raise AppError("VOICE_NOT_FOUND", "Voice not found", 404)

        return VoiceResponse.model_validate(voice)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get voice %s", voice_id)
        raise AppError("VOICE_ERROR", f"Failed to get voice: {e}", 500)
