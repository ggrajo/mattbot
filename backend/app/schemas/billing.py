from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class BillingPlanResponse(BaseModel):
    code: str
    name: str
    price_usd: str
    included_minutes: int
    requires_credit_card: bool = True
    limited: bool = False
    sort_order: int = 0
    description: str = ""
    icon: str = ""
    features: list[str] = []
    recommended: bool = False


class BillingPlansListResponse(BaseModel):
    plans: list[BillingPlanResponse]
    billing_provider: str = "manual"


class PaymentMethodInfo(BaseModel):
    brand: str | None = None
    last4: str | None = None
    exp_month: int | None = None
    exp_year: int | None = None


class BillingStatusResponse(BaseModel):
    plan: str | None = None
    status: str | None = None
    minutes_included: int = 0
    minutes_used: int = 0
    minutes_remaining: int = 0
    minutes_carried_over: int = 0
    payment_method: PaymentMethodInfo | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    has_subscription: bool = False

    model_config = {"from_attributes": True}


class SetupIntentResponse(BaseModel):
    client_secret: str
    customer_id: str


def _validate_plan_code(v: str) -> str:
    from app.services.billing_config_service import get_billing_config

    config = get_billing_config()
    valid = config.valid_plan_codes()
    if v not in valid:
        raise ValueError(f"Plan must be one of: {', '.join(valid)}")
    return v


class SubscribeRequest(BaseModel):
    plan: str
    payment_method_id: str = ""

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, v: str) -> str:
        return _validate_plan_code(v)


class SubscribeResponse(BaseModel):
    plan: str
    status: str
    minutes_included: int
    current_period_end: datetime | None = None


class ChangePlanRequest(BaseModel):
    new_plan: str

    @field_validator("new_plan")
    @classmethod
    def validate_plan(cls, v: str) -> str:
        return _validate_plan_code(v)


class ChangePlanResponse(BaseModel):
    plan: str
    status: str
    minutes_included: int
    minutes_carried_over: int = 0
    current_period_end: datetime | None = None


class CancelResponse(BaseModel):
    status: str
    cancel_at_period_end: bool
    current_period_end: datetime | None = None


class PaymentMethodResponse(BaseModel):
    id: str
    brand: str | None = None
    last4: str | None = None
    exp_month: int | None = None
    exp_year: int | None = None
    is_default: bool = False
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentMethodsListResponse(BaseModel):
    payment_methods: list[PaymentMethodResponse]


class AddPaymentMethodRequest(BaseModel):
    payment_method_id: str
    set_as_default: bool = True


class DevSetPlanRequest(BaseModel):
    plan: str
    status: str = "active"

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, v: str) -> str:
        return _validate_plan_code(v)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = ("active", "past_due", "canceled", "incomplete", "trialing")
        if v not in valid:
            raise ValueError(f"Status must be one of: {', '.join(valid)}")
        return v


class DevSimulateUsageRequest(BaseModel):
    minutes: int = Field(..., gt=0)
