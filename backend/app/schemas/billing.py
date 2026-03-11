from datetime import datetime

from pydantic import BaseModel, Field


class BillingStatusResponse(BaseModel):
    plan: str
    status: str
    minutes_included: int
    minutes_used: int
    minutes_remaining: int
    payment_method_present: bool
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False


class SetupIntentResponse(BaseModel):
    client_secret: str


class AttachPaymentMethodRequest(BaseModel):
    payment_method_id: str


class SubscribeRequest(BaseModel):
    plan: str = Field(..., pattern="^(free|standard|pro)$")


class ChangePlanRequest(BaseModel):
    new_plan: str = Field(..., pattern="^(free|standard|pro)$")


class CancelSubscriptionRequest(BaseModel):
    immediate: bool = False


class DevSetPlanRequest(BaseModel):
    plan: str = Field(..., pattern="^(free|standard|pro)$")
    status: str = "active"


class DevSimulateUsageRequest(BaseModel):
    minutes: int = Field(..., gt=0)


class PaymentMethodInfo(BaseModel):
    brand: str | None = None
    last4: str | None = None
    exp_month: int | None = None
    exp_year: int | None = None
    is_default: bool = True
