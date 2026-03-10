# Source Generated with Decompyle++
# File: onboarding.pyc (Python 3.13)

__doc__ = 'Onboarding state machine endpoints.'
from datetime import UTC, datetime
from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.onboarding_state import OnboardingState
from app.schemas.onboarding import ONBOARDING_STEPS, OnboardingCompleteStepRequest, OnboardingCompleteStepResponse, OnboardingResponse
from app.services import agent_service, audit_service
router = None()
# WARNING: Decompyle incomplete
