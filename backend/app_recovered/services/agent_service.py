# Source Generated with Decompyle++
# File: agent_service.pyc (Python 3.13)

__doc__ = 'Agent service: creation, retrieval, update, and runtime config assembly.'
from __future__ import annotations
import logging
import uuid
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.config import settings as app_settings
from app.core.encryption import decrypt_field
from app.models.agent import Agent
from app.models.agent_config import AgentConfig
from app.models.call_memory_item import CallMemoryItem
from app.models.user import User
from app.models.contact_profile import ContactProfile
from app.models.user_settings import UserSettings
from app.models.vip_entry import VipEntry
from app.models.voice_catalog import VoiceCatalog
from app.services.prompts import assemble_final_prompt
logger = None(__name__)
# WARNING: Decompyle incomplete
