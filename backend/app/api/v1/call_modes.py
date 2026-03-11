import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.telephony import CallModeResponse, CallModeUpdateRequest
from app.services import telephony_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=CallModeResponse)
async def get_call_mode(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallModeResponse:
    try:
        return await telephony_service.get_call_mode(db, current_user.user_id)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get call mode for user %s", current_user.user_id)
        raise AppError("TELEPHONY_ERROR", f"Failed to get call mode: {e}", 500)


@router.patch("", response_model=CallModeResponse)
async def update_call_mode(
    body: CallModeUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallModeResponse:
    try:
        return await telephony_service.update_call_mode(
            db, current_user.user_id, body
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to update call mode for user %s", current_user.user_id)
        raise AppError("TELEPHONY_ERROR", f"Failed to update call mode: {e}", 500)
