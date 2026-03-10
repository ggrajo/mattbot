# Source Generated with Decompyle++
# File: call_modes.pyc (Python 3.13)

__doc__ = 'Call modes configuration endpoints.'
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.telephony import CallModesPatchRequest, CallModesResponse
from app.services import telephony_service
router = None()
# WARNING: Decompyle incomplete
