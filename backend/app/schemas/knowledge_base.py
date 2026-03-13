"""Pydantic schemas for the knowledge-base endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, HttpUrl


class KBCreateTextRequest(BaseModel):
    name: str
    text: str


class KBCreateUrlRequest(BaseModel):
    name: str
    url: HttpUrl


class KBDocResponse(BaseModel):
    id: str
    name: str
    source_type: str
    source_ref: str | None = None
    created_at: datetime


class KBDocListResponse(BaseModel):
    items: list[KBDocResponse]
    total: int


class KBDeleteResponse(BaseModel):
    deleted: bool
