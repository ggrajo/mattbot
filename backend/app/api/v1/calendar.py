"""Google Calendar booking API."""

import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.calendar import (
    AvailabilityResponse,
    AvailabilitySlot,
    BookingRequest,
    BookingResponse,
    CalendarConnectRequest,
    CalendarEventResponse,
    CalendarStatusResponse,
)
from app.services import calendar_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/status", response_model=CalendarStatusResponse)
async def get_calendar_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CalendarStatusResponse:
    try:
        from app.models.google_calendar_token import GoogleCalendarToken
        from sqlalchemy import select

        result = await db.execute(
            select(GoogleCalendarToken).where(
                GoogleCalendarToken.user_id == current_user.user_id,
                GoogleCalendarToken.is_active.is_(True),
            )
        )
        token = result.scalars().first()
        return CalendarStatusResponse(
            is_connected=token is not None,
            calendar_id=token.calendar_id if token else None,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get calendar status for user %s", current_user.user_id)
        raise AppError("CALENDAR_ERROR", f"Failed to get calendar status: {e}", 500)


@router.post("/connect", response_model=CalendarStatusResponse)
async def connect_calendar(
    body: CalendarConnectRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CalendarStatusResponse:
    try:
        token = await calendar_service.connect_google_calendar(
            db, current_user.user_id, body.auth_code
        )

        await _update_agent_calendar_status(db, current_user.user_id, connected=True)

        return CalendarStatusResponse(
            is_connected=True,
            calendar_id=token.calendar_id,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to connect calendar for user %s", current_user.user_id)
        raise AppError("CALENDAR_ERROR", f"Failed to connect calendar: {e}", 500)


@router.post("/disconnect", status_code=204)
async def disconnect_calendar(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await calendar_service.disconnect_calendar(db, current_user.user_id)

        await _update_agent_calendar_status(db, current_user.user_id, connected=False)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to disconnect calendar for user %s", current_user.user_id)
        raise AppError("CALENDAR_ERROR", f"Failed to disconnect calendar: {e}", 500)


async def _update_agent_calendar_status(
    db: AsyncSession, user_id, *, connected: bool
) -> None:
    """Keep the default agent config in sync with calendar connection state."""
    try:
        from sqlalchemy import select
        from app.models.agent_config import AgentConfig

        result = await db.execute(
            select(AgentConfig).where(
                AgentConfig.user_id == user_id,
                AgentConfig.is_default.is_(True),
            )
        )
        config = result.scalar_one_or_none()
        if config:
            meta = config.metadata_json or {}
            meta["calendar_connected"] = connected
            config.metadata_json = meta
            await db.flush()
    except Exception:
        logger.debug(
            "Could not update agent config calendar status for user %s", user_id
        )


@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    duration_minutes: int = Query(30, ge=15, le=120),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AvailabilityResponse:
    try:
        raw_slots = await calendar_service.get_availability(
            db, current_user.user_id, date, duration_minutes
        )
        slots = [AvailabilitySlot(**s) for s in raw_slots]
        return AvailabilityResponse(date=date, slots=slots)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get availability for user %s", current_user.user_id)
        raise AppError("CALENDAR_ERROR", f"Failed to get availability: {e}", 500)


@router.post("/book", response_model=BookingResponse)
async def book_event(
    body: BookingRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    try:
        result = await calendar_service.create_booking(
            db,
            current_user.user_id,
            body.title,
            body.start_time,
            body.end_time,
            body.attendee_email,
        )
        return BookingResponse(**result)
    except ValueError as ve:
        raise AppError("CALENDAR_NOT_CONNECTED", str(ve), 400)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to book event for user %s", current_user.user_id)
        raise AppError("CALENDAR_ERROR", f"Failed to book event: {e}", 500)


@router.get("/events", response_model=list[CalendarEventResponse])
async def list_events(
    limit: int = Query(10, ge=1, le=50),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CalendarEventResponse]:
    try:
        events = await calendar_service.get_upcoming_events(
            db, current_user.user_id, limit
        )
        return [CalendarEventResponse(**e) for e in events]
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to list events for user %s", current_user.user_id)
        raise AppError("CALENDAR_ERROR", f"Failed to list events: {e}", 500)
