"""Pydantic schemas for onboarding state management."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class OnboardingStepUpdate(BaseModel):
    current_step: str = Field(..., max_length=60)


class OnboardingStateOut(BaseModel):
    current_step: str
    completed_steps: list[str] = []
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OnboardingCompleteOut(BaseModel):
    current_step: str
    completed_steps: list[str]
    completed_at: datetime

    class Config:
        from_attributes = True
