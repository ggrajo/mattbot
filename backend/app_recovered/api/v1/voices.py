# Source Generated with Decompyle++
# File: voices.pyc (Python 3.13)

__doc__ = 'Voice catalog endpoint.'
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
logger = None(__name__)
router = None()
# WARNING: Decompyle incomplete
