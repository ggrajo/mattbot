"""Call modes configuration endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.telephony import CallModesPatchRequest, CallModesResponse
from app.services import telephony_service

router = APIRouter()


@router.get("", response_model=CallModesResponse)
async def get_call_modes(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallModesResponse:
    return await telephony_service.get_call_modes(db, current_user.user_id)


@router.patch("", response_model=CallModesResponse)
async def patch_call_modes(
    body: CallModesPatchRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallModesResponse:
    changes = body.model_dump(exclude_none=True)
    return await telephony_service.update_call_modes(db, current_user.user_id, changes)
