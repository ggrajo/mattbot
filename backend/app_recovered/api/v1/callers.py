# Source Generated with Decompyle++
# File: callers.pyc (Python 3.13)

__doc__ = 'Caller profile API: aggregated caller data from calls, memory, and VIP/block lists.'
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import decrypt_field
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.block_entry import BlockEntry
from app.models.call import Call
from app.models.call_artifact import CallArtifact
from app.models.call_memory_item import CallMemoryItem
from app.models.vip_entry import VipEntry
from app.schemas.calls import MemoryItemResponse
router = None()
# WARNING: Decompyle incomplete
