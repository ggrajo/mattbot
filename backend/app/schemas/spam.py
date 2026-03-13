"""Pydantic schemas for spam list endpoints."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, field_validator


class SpamCreateRequest(BaseModel):
    phone_number: str
    reason: str | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_e164(cls, v: str) -> str:
        v = re.sub(r"[\s\-\(\)\.]+", "", v.strip())
        if not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Phone number must be in E.164 format (e.g. +14155551234)")
        return v


class SpamEntryResponse(BaseModel):
    id: str
    phone_last4: str
    spam_score: float
    spam_call_count: int
    first_flagged_at: datetime
    last_flagged_at: datetime
    auto_blocked: bool
    source: str

    model_config = {"from_attributes": True}


class SpamListResponse(BaseModel):
    items: list[SpamEntryResponse]
