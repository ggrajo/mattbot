import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.telephony import (
    ForwardingSetupGuideResponse,
    ForwardingVerifyCompleteRequest,
    ForwardingVerifyRequest,
    ForwardingVerifyResponse,
)
from app.services import telephony_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/setup-guide", response_model=ForwardingSetupGuideResponse)
async def get_setup_guide(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ForwardingSetupGuideResponse:
    try:
        return await telephony_service.get_forwarding_setup_guide(
            db, current_user.user_id
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get setup guide for user %s", current_user.user_id)
        raise AppError("TELEPHONY_ERROR", f"Failed to get setup guide: {e}", 500)


@router.post("/verify", response_model=ForwardingVerifyResponse)
async def start_verification(
    body: ForwardingVerifyRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ForwardingVerifyResponse:
    try:
        return await telephony_service.start_forwarding_verification(
            db, current_user.user_id, body
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to start verification for user %s", current_user.user_id)
        raise AppError("TELEPHONY_ERROR", f"Failed to start verification: {e}", 500)


@router.get("/verify/{attempt_id}", response_model=ForwardingVerifyResponse)
async def check_verification_status(
    attempt_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ForwardingVerifyResponse:
    try:
        return await telephony_service.check_forwarding_verification(
            db, current_user.user_id, attempt_id
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to check verification %s for user %s", attempt_id, current_user.user_id)
        raise AppError("TELEPHONY_ERROR", f"Failed to check verification status: {e}", 500)


@router.post("/verify/{attempt_id}/complete", response_model=ForwardingVerifyResponse)
async def complete_verification(
    attempt_id: str,
    body: ForwardingVerifyCompleteRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ForwardingVerifyResponse:
    try:
        return await telephony_service.complete_forwarding_verification(
            db, current_user.user_id, attempt_id, body.code
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to complete verification %s for user %s", attempt_id, current_user.user_id)
        raise AppError("TELEPHONY_ERROR", f"Failed to complete verification: {e}", 500)
