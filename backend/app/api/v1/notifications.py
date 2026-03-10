"""Notification delivery tracking and receipt endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clock import utcnow
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.notification import Notification
from app.models.notification_delivery import NotificationDelivery
from app.schemas.notifications import (
    NotificationListResponse,
    NotificationReceiptRequest,
    NotificationResponse,
)
from app.services.audit_service import log_event

router = APIRouter()


@router.post("/{notification_id}/receipt", status_code=204)
async def record_delivery_receipt(
    notification_id: uuid.UUID,
    body: NotificationReceiptRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    allowed, _ = await check_rate_limit(
        f"notif:receipt:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    try:
        device_uuid = uuid.UUID(body.device_id)
    except ValueError:
        raise AppError(
            code="INVALID_DEVICE_ID",
            message="device_id must be a valid UUID",
            status_code=400,
        ) from None

    notification = await db.get(Notification, notification_id)
    if notification is None or notification.owner_user_id != current_user.user_id:
        raise AppError(
            code="NOTIFICATION_NOT_FOUND",
            message="Notification not found",
            status_code=404,
        )

    delivery = (
        await db.execute(
            select(NotificationDelivery).where(
                NotificationDelivery.notification_id == notification_id,
                NotificationDelivery.device_id == device_uuid,
            )
        )
    ).scalar_one_or_none()

    if not delivery:
        raise AppError(
            code="DELIVERY_NOT_FOUND",
            message="No delivery record for this device",
            status_code=404,
        )

    delivery.status = "delivered_ack"
    delivery.last_attempt_at = utcnow()


@router.post("/{notification_id}/opened", status_code=204)
async def record_notification_opened(
    notification_id: uuid.UUID,
    body: NotificationReceiptRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    allowed, _ = await check_rate_limit(
        f"notif:opened:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    try:
        device_uuid = uuid.UUID(body.device_id)
    except ValueError:
        raise AppError(
            code="INVALID_DEVICE_ID",
            message="device_id must be a valid UUID",
            status_code=400,
        ) from None

    notification = await db.get(Notification, notification_id)
    if notification is None or notification.owner_user_id != current_user.user_id:
        raise AppError(
            code="NOTIFICATION_NOT_FOUND",
            message="Notification not found",
            status_code=404,
        )

    await log_event(
        db,
        owner_user_id=current_user.user_id,
        event_type="NOTIFICATION_OPENED",
        actor_type="user",
        actor_id=current_user.user_id,
        target_type="notification",
        target_id=notification_id,
        details={"device_id": str(device_uuid)},
    )


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    cursor: str | None = Query(None, description="Opaque pagination cursor (created_at ISO)"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    allowed, _ = await check_rate_limit(
        f"notif:list:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = (
        select(Notification)
        .where(Notification.owner_user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(settings.DEFAULT_PAGE_SIZE + 1)
    )

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
        except ValueError:
            raise AppError(
                code="INVALID_CURSOR",
                message="Invalid cursor value",
                status_code=400,
            ) from None
        stmt = stmt.where(Notification.created_at < cursor_dt)

    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    has_more = len(rows) > settings.DEFAULT_PAGE_SIZE
    items = rows[: settings.DEFAULT_PAGE_SIZE]

    next_cursor = None
    if has_more and items:
        next_cursor = items[-1].created_at.isoformat()

    return NotificationListResponse(
        items=[
            NotificationResponse(
                id=str(n.id),
                type=n.type,
                priority=n.priority,
                source_entity_type=n.source_entity_type,
                source_entity_id=str(n.source_entity_id) if n.source_entity_id else None,
                created_at=n.created_at,
            )
            for n in items
        ],
        next_cursor=next_cursor,
        has_more=has_more,
    )
