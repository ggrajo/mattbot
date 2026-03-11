"""Voice catalog endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.models.voice_catalog import VoiceCatalog
from app.schemas.agents import VoiceCatalogItem, VoiceCatalogResponse
from app.services.elevenlabs_agent_service import sync_voice_catalog

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=VoiceCatalogResponse)
async def list_voices(
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VoiceCatalogResponse:
    stmt = (
        select(VoiceCatalog)
        .where(VoiceCatalog.is_active.is_(True))
        .order_by(VoiceCatalog.sort_order.asc())
    )

    result = await db.execute(stmt)
    voices = result.scalars().all()
    return VoiceCatalogResponse(
        items=[
            VoiceCatalogItem(
                id=str(v.id),
                provider_voice_id=v.provider_voice_id,
                display_name=v.display_name,
                locale=v.locale,
                gender_tag=v.gender_tag,
                preview_url=v.preview_url,
                sort_order=v.sort_order,
            )
            for v in voices
        ]
    )


class VoiceSyncResponse(BaseModel):
    synced: int


@router.post("/sync", response_model=VoiceSyncResponse)
async def sync_voices(
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VoiceSyncResponse:
    """Pull the latest voices from ElevenLabs and upsert into the local catalog."""
    n = await sync_voice_catalog(db)
    logger.info("Voice catalog manual sync: %d voices upserted", n)
    return VoiceSyncResponse(synced=n)
