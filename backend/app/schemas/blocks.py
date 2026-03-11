"""Pydantic schemas for block list endpoints."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, field_validator


class BlockCreateRequest(BaseModel):
    phone_number: str
    display_name: str | None = None
    reason: str | None = None
    company: str | None = None
    relationship: str | None = None
    email: str | None = None
    notes: str | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_e164(cls, v: str) -> str:
        v = re.sub(r"[\s\-\(\)\.]+", "", v.strip())
        if not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Phone number must be in E.164 format (e.g. +14155551234)")
        return v

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 100:
            raise ValueError("Display name must be 100 characters or fewer")
        return v

    @field_validator("company")
    @classmethod
    def validate_company(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 200:
            raise ValueError("Company must be 200 characters or fewer")
        return v

    @field_validator("relationship")
    @classmethod
    def validate_relationship(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 100:
            raise ValueError("Relationship must be 100 characters or fewer")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 254:
                raise ValueError("Email must be 254 characters or fewer")
            if v and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
                raise ValueError("Invalid email format")
        return v

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 1000:
            raise ValueError("Notes must be 1000 characters or fewer")
        return v


class BlockEntryResponse(BaseModel):
    id: str
    phone_last4: str
    display_name: str | None = None
    reason: str | None = None
    company: str | None = None
    relationship: str | None = None
    email: str | None = None
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BlockListResponse(BaseModel):
    items: list[BlockEntryResponse]
