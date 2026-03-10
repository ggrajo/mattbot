# Source Generated with Decompyle++
# File: handoff.pyc (Python 3.13)

__doc__ = 'Handoff API: accept / decline / status endpoints for live call handoff.'
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.call import Call
from app.models.handoff_offer import HandoffOffer
from app.services import audit_service, handoff_service
router = None()
# WARNING: Decompyle incomplete
