import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.billing import (
    AttachPaymentMethodRequest,
    BillingStatusResponse,
    CancelSubscriptionRequest,
    ChangePlanRequest,
    SetupIntentResponse,
    SubscribeRequest,
    SubscriptionResponse,
)
from app.services import billing_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/status", response_model=BillingStatusResponse)
async def get_billing_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BillingStatusResponse:
    try:
        return await billing_service.get_billing_status(db, current_user.user_id)
    except Exception as e:
        logger.exception("Failed to get billing status for user %s", current_user.user_id)
        raise AppError("BILLING_ERROR", f"Failed to retrieve billing status: {e}", 500)


@router.post("/setup-intent", response_model=SetupIntentResponse)
async def create_setup_intent(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SetupIntentResponse:
    try:
        return await billing_service.create_setup_intent(db, current_user.user_id)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to create setup intent for user %s", current_user.user_id)
        raise AppError("BILLING_ERROR", f"Failed to create setup intent: {e}", 500)


@router.post("/payment-method/attach", response_model=BillingStatusResponse)
async def attach_payment_method(
    body: AttachPaymentMethodRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BillingStatusResponse:
    try:
        return await billing_service.attach_payment_method(
            db, current_user.user_id, body.payment_method_id
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to attach payment method for user %s", current_user.user_id)
        raise AppError("BILLING_ERROR", f"Failed to attach payment method: {e}", 500)


@router.post("/subscribe", response_model=SubscriptionResponse)
async def subscribe(
    body: SubscribeRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    try:
        return await billing_service.create_subscription(
            db, current_user.user_id, body.plan_id
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to create subscription for user %s", current_user.user_id)
        raise AppError("BILLING_ERROR", f"Failed to create subscription: {e}", 500)


@router.post("/change-plan", response_model=SubscriptionResponse)
async def change_plan(
    body: ChangePlanRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    try:
        return await billing_service.change_plan(
            db, current_user.user_id, body.new_plan_id
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to change plan for user %s", current_user.user_id)
        raise AppError("BILLING_ERROR", f"Failed to change plan: {e}", 500)


@router.post("/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    body: CancelSubscriptionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    try:
        return await billing_service.cancel_subscription(
            db, current_user.user_id, immediately=body.immediately
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to cancel subscription for user %s", current_user.user_id)
        raise AppError("BILLING_ERROR", f"Failed to cancel subscription: {e}", 500)
