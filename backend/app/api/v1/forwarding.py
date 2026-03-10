"""Forwarding setup guide and verification endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.telephony import (
    ForwardingSetupGuideResponse,
    ForwardingVerifyResponse,
    ForwardingVerifyStatusResponse,
)
from app.services import telephony_service

router = APIRouter()


@router.get("/setup-guide", response_model=ForwardingSetupGuideResponse)
async def get_setup_guide(
    current_user: CurrentUser = Depends(get_current_user),
) -> ForwardingSetupGuideResponse:
    return telephony_service.get_forwarding_guide()


@router.post("/verify", response_model=ForwardingVerifyResponse)
async def verify_forwarding(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ForwardingVerifyResponse:
    return await telephony_service.initiate_forwarding_verification(db, current_user.user_id)


@router.get("/verify/status", response_model=ForwardingVerifyStatusResponse)
async def get_verify_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ForwardingVerifyStatusResponse:
    return await telephony_service.check_forwarding_verification(db, current_user.user_id)
