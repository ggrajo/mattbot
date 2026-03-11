import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.telephony import NumberListResponse, ProvisionNumberRequest, ProvisionNumberResponse
from app.services import telephony_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/provision", response_model=ProvisionNumberResponse)
async def provision_number(
    body: ProvisionNumberRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProvisionNumberResponse:
    try:
        return await telephony_service.provision_number(
            db, current_user.user_id, body
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to provision number for user %s", current_user.user_id)
        raise AppError("TELEPHONY_ERROR", f"Failed to provision number: {e}", 500)


@router.get("", response_model=NumberListResponse)
async def list_numbers(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NumberListResponse:
    try:
        return await telephony_service.list_numbers(db, current_user.user_id)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to list numbers for user %s", current_user.user_id)
        raise AppError("TELEPHONY_ERROR", f"Failed to list numbers: {e}", 500)
