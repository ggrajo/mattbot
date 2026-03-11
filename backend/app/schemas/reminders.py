"""Pydantic schemas for reminder endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ReminderCreateRequest(BaseModel):
    title: str = Field(..., max_length=200)
    due_at: datetime
    timezone: str | None = None


class ReminderUpdateRequest(BaseModel):
    title: str | None = Field(None, max_length=200)
    due_at: datetime | None = None


class ReminderResponse(BaseModel):
    id: str
    call_id: str | None = None
    title: str
    due_at: datetime
    timezone_at_creation: str | None = None
    status: str
    created_at: datetime
    call_from_masked: str | None = None

    model_config = {"from_attributes": True}


class ReminderListResponse(BaseModel):
    items: list[ReminderResponse]
