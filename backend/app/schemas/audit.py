"""Pydantic schemas for audit events endpoint."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    event_type: str
    actor_type: str
    target_type: str | None = None
    target_id: str | None = None
    created_at: datetime
    details: dict | None = None

    model_config = {"from_attributes": True}


class AuditEventListResponse(BaseModel):
    items: list[AuditEventResponse]
    next_cursor: str | None = None
    has_more: bool = False
