# Source Generated with Decompyle++
# File: artifact_service.pyc (Python 3.13)

__doc__ = 'Post-call artifact pipeline: AI sessions, transcripts, summaries, labels, memory.'
from __future__ import annotations
import logging
import math
import re as _re
import uuid
from datetime import UTC, datetime
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings as app_settings
from app.core.encryption import decrypt_field, encrypt_field
from app.models.call import Call
from app.models.call_ai_session import CallAiSession
from app.models.call_artifact import CallArtifact
from app.models.call_memory_item import CallMemoryItem
from app.models.user_settings import UserSettings
from app.services import audit_service, billing_service
logger = None(__name__)
# WARNING: Decompyle incomplete
