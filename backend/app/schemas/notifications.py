"""Notification delivery and receipt schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class NotificationReceiptRequest(BaseModel):
    device_id: str = Field(..., description="UUID of the device acknowledging receipt")


class NotificationResponse(BaseModel):
    id: str
    type: str
    priority: str
    source_entity_type: str | None = None
    source_entity_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    next_cursor: str | None = None
    has_more: bool = False
