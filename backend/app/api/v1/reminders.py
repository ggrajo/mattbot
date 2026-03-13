"""Reminder CRUD API endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clock import utcnow
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.reminder import Reminder
from app.schemas.common import MessageResponse
from app.schemas.reminders import (
    ReminderCreateRequest,
    ReminderListResponse,
    ReminderResponse,
    ReminderUpdateRequest,
)
from app.services import audit_service
from app.services.notification_service import create_and_enqueue_notification

router = APIRouter()

_STATUS_MAP = {
    "scheduled": "pending",
    "triggered": "overdue",
}


def _to_response(r: Reminder, call_from_masked: str | None = None) -> ReminderResponse:
    return ReminderResponse(
        id=str(r.id),
        call_id=str(r.call_id) if r.call_id else None,
        title=r.title,
        due_at=r.due_at,
        timezone_at_creation=r.timezone_at_creation,
        status=_STATUS_MAP.get(r.status, r.status),
        created_at=r.created_at,
        call_from_masked=call_from_masked,
    )


async def _get_user_reminder(
    db: AsyncSession,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
) -> Reminder:
    stmt = select(Reminder).where(
        Reminder.id == reminder_id,
        Reminder.owner_user_id == user_id,
    )
    result = await db.execute(stmt)
    reminder = result.scalar_one_or_none()
    if reminder is None:
        raise AppError(
            code="REMINDER_NOT_FOUND",
            message="Reminder not found",
            status_code=404,
        )
    return reminder


@router.get("", response_model=ReminderListResponse)
async def list_reminders(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReminderListResponse:
    from app.models.call import Call

    allowed, _ = await check_rate_limit(
        f"reminders:list:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = (
        select(Reminder, Call.from_masked)
        .outerjoin(Call, Reminder.call_id == Call.id)
        .where(Reminder.owner_user_id == current_user.user.id)
        .order_by(Reminder.due_at)
    )

    rows = (await db.execute(stmt)).all()
    return ReminderListResponse(items=[_to_response(r, call_from_masked=fm) for r, fm in rows])


@router.post(
    "/calls/{call_id}",
    response_model=ReminderResponse,
    status_code=201,
)
async def create_reminder(
    call_id: uuid.UUID,
    body: ReminderCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReminderResponse:
    allowed, _ = await check_rate_limit(
        f"reminders:create:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    now = utcnow()
    due = body.due_at.replace(tzinfo=None) if body.due_at.tzinfo else body.due_at
    if due <= now:
        raise AppError(
            code="INVALID_DUE_DATE",
            message="due_at must be in the future",
            status_code=422,
        )

    from app.models.call import Call

    stmt = select(Call).where(
        Call.id == call_id,
        Call.owner_user_id == current_user.user.id,
    )
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    reminder = Reminder(
        owner_user_id=current_user.user.id,
        call_id=call_id,
        title=body.title,
        due_at=due,
        status="scheduled",
        timezone_at_creation=body.timezone,
        created_by_device_id=current_user.device_id,
    )
    db.add(reminder)

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="REMINDER_CREATED",
        target_type="reminder",
        target_id=reminder.id,
        details={"call_id": str(call_id)},
    )

    await db.commit()
    await db.refresh(reminder)

    try:
        await create_and_enqueue_notification(
            db,
            owner_user_id=current_user.user.id,
            notification_type="reminder_created",
            priority="normal",
            source_entity_type="reminder",
            source_entity_id=reminder.id,
        )
        await db.commit()
    except Exception:
        await db.rollback()

    return _to_response(reminder, call_from_masked=call.from_masked)


@router.patch("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: uuid.UUID,
    body: ReminderUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReminderResponse:
    allowed, _ = await check_rate_limit(
        f"reminders:update:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    reminder = await _get_user_reminder(db, current_user.user.id, reminder_id)

    if reminder.status != "scheduled":
        raise AppError(
            code="REMINDER_NOT_EDITABLE",
            message="Only scheduled reminders can be updated",
            status_code=409,
        )

    changes: dict = {}

    if body.title is not None:
        reminder.title = body.title
        changes["title"] = body.title

    if body.due_at is not None:
        due = body.due_at.replace(tzinfo=None) if body.due_at.tzinfo else body.due_at
        if due <= utcnow():
            raise AppError(
                code="INVALID_DUE_DATE",
                message="due_at must be in the future",
                status_code=422,
            )
        reminder.due_at = due
        changes["due_at"] = due.isoformat()

    if not changes:
        return _to_response(reminder)

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="REMINDER_UPDATED",
        target_type="reminder",
        target_id=reminder_id,
        details=changes,
    )

    await db.commit()
    await db.refresh(reminder)
    return _to_response(reminder)


@router.post("/{reminder_id}/complete", response_model=ReminderResponse)
async def complete_reminder(
    reminder_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReminderResponse:
    allowed, _ = await check_rate_limit(
        f"reminders:complete:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    reminder = await _get_user_reminder(db, current_user.user.id, reminder_id)
    reminder.status = "completed"

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="REMINDER_COMPLETED",
        target_type="reminder",
        target_id=reminder_id,
    )

    await db.commit()
    await db.refresh(reminder)
    return _to_response(reminder)


@router.post("/{reminder_id}/cancel", response_model=ReminderResponse)
async def cancel_reminder(
    reminder_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReminderResponse:
    allowed, _ = await check_rate_limit(
        f"reminders:cancel:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    reminder = await _get_user_reminder(db, current_user.user.id, reminder_id)
    reminder.status = "cancelled"

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="REMINDER_CANCELLED",
        target_type="reminder",
        target_id=reminder_id,
    )

    await db.commit()
    await db.refresh(reminder)
    return _to_response(reminder)


@router.delete("/{reminder_id}", response_model=MessageResponse)
async def delete_reminder(
    reminder_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    allowed, _ = await check_rate_limit(
        f"reminders:delete:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    reminder = await _get_user_reminder(db, current_user.user.id, reminder_id)

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="REMINDER_DELETED",
        target_type="reminder",
        target_id=reminder_id,
    )

    await db.delete(reminder)
    await db.commit()
    return MessageResponse(message="Reminder deleted successfully")
