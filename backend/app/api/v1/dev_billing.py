import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.billing import (
    BillingStatusResponse,
    DevSetPlanRequest,
    DevSimulateUsageRequest,
)
from app.services import billing_service

logger = logging.getLogger(__name__)

router = APIRouter()


async def require_dev_mode() -> None:
    billing_provider = getattr(settings, "BILLING_PROVIDER", "stripe")
    if settings.ENVIRONMENT != "development" and billing_provider != "manual":
        raise AppError(
            "FORBIDDEN",
            "Dev billing routes are only available in development mode or with manual billing provider",
            403,
        )


@router.post("/set-plan", response_model=BillingStatusResponse, dependencies=[Depends(require_dev_mode)])
async def dev_set_plan(
    body: DevSetPlanRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BillingStatusResponse:
    try:
        return await billing_service.dev_set_plan(
            db, current_user.user_id, body.plan_id, body.status
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Dev set-plan failed for user %s", current_user.user_id)
        raise AppError("BILLING_ERROR", f"Failed to set plan: {e}", 500)


@router.post(
    "/simulate-usage-minutes",
    response_model=BillingStatusResponse,
    dependencies=[Depends(require_dev_mode)],
)
async def dev_simulate_usage(
    body: DevSimulateUsageRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BillingStatusResponse:
    try:
        return await billing_service.dev_simulate_usage_minutes(
            db, current_user.user_id, body.minutes
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Dev simulate-usage failed for user %s", current_user.user_id)
        raise AppError("BILLING_ERROR", f"Failed to simulate usage: {e}", 500)
