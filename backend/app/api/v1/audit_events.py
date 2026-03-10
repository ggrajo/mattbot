"""Audit events API: paginated list of user audit trail."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.audit_event import AuditEvent
from app.schemas.audit import AuditEventListResponse, AuditEventResponse

router = APIRouter()

_SENSITIVE_DETAIL_KEYS = frozenset(
    {
        "call_transcript",
        "recording_url",
        "summary",
        "otp",
        "voicemail_text",
        "transcript",
        "otp_code",
    }
)


def _strip_sensitive(details: dict | None) -> dict | None:
    if not details:
        return details
    return {k: v for k, v in details.items() if k not in _SENSITIVE_DETAIL_KEYS}


@router.get("", response_model=AuditEventListResponse)
async def list_audit_events(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    category: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    cursor: uuid.UUID | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
) -> AuditEventListResponse:
    allowed, _ = await check_rate_limit(
        f"audit:list:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = (
        select(AuditEvent)
        .where(AuditEvent.owner_user_id == current_user.user.id)
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
    )

    if category is not None:
        stmt = stmt.where(AuditEvent.event_type.startswith(category))

    if date_from is not None:
        stmt = stmt.where(AuditEvent.event_at >= date_from)

    if date_to is not None:
        stmt = stmt.where(AuditEvent.event_at <= date_to)

    if cursor is not None:
        cursor_row = await db.get(AuditEvent, cursor)
        if cursor_row is not None:
            stmt = stmt.where(
                (AuditEvent.created_at < cursor_row.created_at)
                | (
                    (AuditEvent.created_at == cursor_row.created_at)
                    & (AuditEvent.id < cursor_row.id)
                )
            )

    stmt = stmt.limit(limit + 1)

    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    has_more = len(rows) > limit
    items = rows[:limit]

    response_items = [
        AuditEventResponse(
            id=str(row.id),
            event_type=row.event_type,
            actor_type=row.actor_type,
            target_type=row.target_type,
            target_id=str(row.target_id) if row.target_id else None,
            created_at=row.created_at,
            details=_strip_sensitive(row.details),
        )
        for row in items
    ]

    next_cursor = str(items[-1].id) if has_more and items else None

    return AuditEventListResponse(
        items=response_items,
        next_cursor=next_cursor,
        has_more=has_more,
    )
