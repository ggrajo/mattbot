"""Number provisioning and listing endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.telephony import NumberListResponse, NumberProvisionResponse
from app.services import telephony_service

router = APIRouter()


@router.post("/provision", response_model=NumberProvisionResponse)
async def provision_number(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NumberProvisionResponse:
    return await telephony_service.provision_number(db, current_user.user_id)


@router.get("", response_model=NumberListResponse)
async def list_numbers(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NumberListResponse:
    return await telephony_service.list_numbers(db, current_user.user_id)
