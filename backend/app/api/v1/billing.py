"""Billing endpoints: status, setup-intent, subscribe, change-plan,
cancel, plans, payment-methods."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.billing import (
    AddPaymentMethodRequest,
    BillingPlanResponse,
    BillingPlansListResponse,
    BillingStatusResponse,
    CancelResponse,
    ChangePlanRequest,
    ChangePlanResponse,
    PaymentMethodResponse,
    PaymentMethodsListResponse,
    SetupIntentResponse,
    SubscribeRequest,
    SubscribeResponse,
)
from app.services import billing_service
from app.services.billing_config_service import get_billing_config_async
from app.config import settings as app_settings

router = APIRouter()


@router.get("/plans", response_model=BillingPlansListResponse)
async def get_plans(
    _current_user: CurrentUser = Depends(get_current_user),
) -> BillingPlansListResponse:
    config = await get_billing_config_async()
    return BillingPlansListResponse(
        plans=[
            BillingPlanResponse(
                code=p.code,
                name=p.name,
                price_usd=p.price_usd,
                included_minutes=p.included_minutes,
                requires_credit_card=p.requires_credit_card,
                limited=p.limited,
                sort_order=p.sort_order,
                description=p.description,
                icon=p.icon,
                features=list(p.features),
                recommended=p.recommended,
            )
            for p in sorted(config.plans, key=lambda x: x.sort_order)
        ],
        billing_provider=app_settings.BILLING_PROVIDER,
    )


@router.get("/status", response_model=BillingStatusResponse)
async def get_billing_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BillingStatusResponse:
    return await billing_service.get_billing_status(db, current_user.user_id)


@router.post("/setup-intent", response_model=SetupIntentResponse)
async def create_setup_intent(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SetupIntentResponse:
    return await billing_service.create_setup_intent(db, current_user.user_id)


@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    body: SubscribeRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscribeResponse:
    return await billing_service.subscribe(
        db, current_user.user_id, body.plan, body.payment_method_id
    )


@router.post("/change-plan", response_model=ChangePlanResponse)
async def change_plan(
    body: ChangePlanRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChangePlanResponse:
    return await billing_service.change_plan(db, current_user.user_id, body.new_plan)


@router.post("/cancel", response_model=CancelResponse)
async def cancel_subscription(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CancelResponse:
    return await billing_service.cancel_subscription(db, current_user.user_id)


@router.get("/payment-methods", response_model=PaymentMethodsListResponse)
async def list_payment_methods(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentMethodsListResponse:
    methods = await billing_service.list_payment_methods(db, current_user.user_id)
    return PaymentMethodsListResponse(payment_methods=methods)


@router.post("/payment-methods/add", response_model=PaymentMethodResponse)
async def add_payment_method(
    body: AddPaymentMethodRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentMethodResponse:
    return await billing_service.add_payment_method(
        db, current_user.user_id, body.payment_method_id, body.set_as_default
    )


@router.delete("/payment-methods/{pm_id}")
async def remove_payment_method(
    pm_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await billing_service.remove_payment_method(db, current_user.user_id, pm_id)
    return {"ok": True}


@router.put("/payment-methods/{pm_id}/default")
async def set_default_payment_method(
    pm_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await billing_service.set_default_payment_method(db, current_user.user_id, pm_id)
    return {"ok": True}
