"""Pydantic schemas for messaging / text-back endpoints."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

_E164_RE = re.compile(r"^\+[1-9]\d{1,14}$")


def _validate_e164(v: str | None) -> str | None:
    if v is not None and not _E164_RE.match(v):
        raise ValueError("Phone number must be in E.164 format (e.g. +15551234567)")
    return v


class TextBackDraftRequest(BaseModel):
    template_id: str | None = None
    custom_body: str | None = Field(default=None, max_length=500)
    to_number: str | None = None

    @field_validator("to_number")
    @classmethod
    def validate_to_number(cls, v: str | None) -> str | None:
        return _validate_e164(v)


class TextBackUpdateRequest(BaseModel):
    body: str | None = Field(default=None, max_length=500)
    to_number: str | None = None

    @field_validator("to_number")
    @classmethod
    def validate_to_number(cls, v: str | None) -> str | None:
        return _validate_e164(v)


class TextBackApproveRequest(BaseModel):
    final_body: str = Field(..., max_length=500)
    to_number: str
    idempotency_key: str
    device_id: str

    @field_validator("to_number")
    @classmethod
    def validate_to_number(cls, v: str) -> str:
        if not _E164_RE.match(v):
            raise ValueError("Phone number must be in E.164 format")
        return v


class TextBackResponse(BaseModel):
    id: str
    call_id: str | None = None
    status: str
    to_number_last4: str
    draft_body: str | None = None
    final_body: str | None = None
    template_id_used: str | None = None
    approved_at: datetime | None = None
    last_error_code: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateResponse(BaseModel):
    id: str
    category: str
    title: str
    body: str
    tone_tag: str

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    items: list[TemplateResponse]
