# Source Generated with Decompyle++
# File: numbers.pyc (Python 3.13)

__doc__ = 'Number provisioning and listing endpoints.'
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.telephony import NumberListResponse, NumberProvisionResponse
from app.services import telephony_service
router = None()
# WARNING: Decompyle incomplete
