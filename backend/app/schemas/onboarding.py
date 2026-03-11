from __future__ import annotations

from pydantic import BaseModel, field_validator

ONBOARDING_STEPS = [
    "account_created",
    "email_verified",
    "mfa_enrolled",
    "privacy_review",
    "profile_setup",
    "settings_configured",
    "assistant_setup",
    "calendar_setup",
    "plan_selected",
    "payment_method_added",
    "number_provisioned",
    "call_modes_configured",
    "onboarding_complete",
]

COMPLETABLE_STEPS = {
    "privacy_review",
    "profile_setup",
    "settings_configured",
    "assistant_setup",
    "calendar_setup",
    "plan_selected",
    "payment_method_added",
    "number_provisioned",
    "call_modes_configured",
    "onboarding_complete",
}


class OnboardingResponse(BaseModel):
    current_step: str
    steps_completed: list[str]
    is_complete: bool
    next_step: str | None = None

    model_config = {"from_attributes": True}


class OnboardingCompleteStepRequest(BaseModel):
    step: str

    @field_validator("step")
    @classmethod
    def validate_step(cls, v: str) -> str:
        if v not in COMPLETABLE_STEPS:
            raise ValueError(f"Step must be one of: {', '.join(sorted(COMPLETABLE_STEPS))}")
        return v


class OnboardingCompleteStepResponse(BaseModel):
    current_step: str
    steps_completed: list[str]
    is_complete: bool
    next_step: str | None = None
