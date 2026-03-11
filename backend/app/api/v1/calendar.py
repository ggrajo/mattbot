"""Google Calendar integration endpoints: OAuth, events, available slots."""

from __future__ import annotations

import logging
import secrets
import uuid

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.calendar import (
    AvailableSlotsResponse,
    CalendarAuthUrlResponse,
    CalendarEventsResponse,
    CalendarStatusResponse,
)
from app.services import audit_service, calendar_service

logger = logging.getLogger(__name__)

router = APIRouter()

_pending_oauth_states: dict[str, uuid.UUID] = {}


@router.get("/auth-url", response_model=CalendarAuthUrlResponse)
async def get_auth_url(
    current_user: CurrentUser = Depends(get_current_user),
) -> CalendarAuthUrlResponse:
    """Generate a Google OAuth authorization URL for calendar access."""
    state = secrets.token_urlsafe(32)
    _pending_oauth_states[state] = current_user.user_id
    auth_url = calendar_service.generate_auth_url(state)
    return CalendarAuthUrlResponse(auth_url=auth_url)


@router.get("/callback")
async def oauth_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Handle Google OAuth callback: exchange code, store tokens, redirect to app."""
    user_id = _pending_oauth_states.pop(state, None)
    if user_id is None:
        return HTMLResponse(
            content="<h1>Invalid or expired OAuth state.</h1><p>Please try again from the app.</p>",
            status_code=400,
        )

    try:
        tokens = await calendar_service.exchange_code_for_tokens(code)
    except Exception:
        logger.exception("Failed to exchange Google OAuth code")
        return HTMLResponse(
            content="<h1>Failed to connect Google Calendar.</h1><p>Please try again.</p>",
            status_code=500,
        )

    google_email = ""
    try:
        google_email = await calendar_service.fetch_google_email(tokens["access_token"])
    except Exception:
        logger.warning("Failed to fetch Google email during calendar OAuth")

    await calendar_service.store_tokens(db, user_id, tokens, google_email)

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="calendar.connected",
        actor_type="user",
        details={"google_email": google_email},
    )

    await db.commit()

    return HTMLResponse(
        content=(
            "<html><head><title>Calendar Connected</title></head>"
            "<body><h1>Google Calendar connected successfully!</h1>"
            "<p>You can close this window and return to the app.</p>"
            '<script>window.location.href="mattbot://calendar-connected";</script>'
            "</body></html>"
        )
    )


@router.get("/status", response_model=CalendarStatusResponse)
async def get_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CalendarStatusResponse:
    """Check if the user has connected their Google Calendar."""
    status = await calendar_service.get_calendar_status(db, current_user.user_id)
    return CalendarStatusResponse(**status)


@router.delete("/disconnect")
async def disconnect(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Disconnect Google Calendar and revoke tokens."""
    removed = await calendar_service.disconnect_calendar(db, current_user.user_id)

    if removed:
        from app.models.user_settings import UserSettings

        settings = await db.get(UserSettings, current_user.user_id)
        was_booking_enabled = settings.calendar_booking_enabled if settings else False
        if settings and settings.calendar_booking_enabled:
            settings.calendar_booking_enabled = False
            settings.revision += 1

        if was_booking_enabled:
            try:
                from app.services import agent_service

                agent = await agent_service.get_or_create_default_agent(db, current_user.user_id)
                await agent_service.ensure_elevenlabs_agent(db, agent, current_user.user_id)
            except Exception:
                logger.exception("Failed to sync ElevenLabs agent after calendar disconnect")

        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="calendar.disconnected",
            actor_type="user",
        )

    return {"disconnected": removed}


@router.get("/events", response_model=CalendarEventsResponse)
async def get_events(
    start: str = Query(..., description="ISO 8601 datetime for range start"),
    end: str = Query(..., description="ISO 8601 datetime for range end"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CalendarEventsResponse:
    """List events from the user's Google Calendar within a time range."""
    from app.models.user_settings import UserSettings

    settings = await db.get(UserSettings, current_user.user_id)
    user_tz = settings.timezone if settings and settings.timezone else "UTC"

    events = await calendar_service.list_events(
        db, current_user.user_id, start, end, timezone=user_tz
    )
    return CalendarEventsResponse(events=events, timezone=user_tz)


@router.get("/available-slots", response_model=AvailableSlotsResponse)
async def get_available_slots(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AvailableSlotsResponse:
    """Find available appointment slots on a given date."""
    from app.models.user_settings import UserSettings

    settings = await db.get(UserSettings, current_user.user_id)
    duration = settings.calendar_default_duration_minutes if settings else 30
    timezone = settings.timezone if settings else "UTC"

    bh_start = (
        settings.business_hours_start if settings and settings.business_hours_enabled else None
    )
    bh_end = settings.business_hours_end if settings and settings.business_hours_enabled else None

    slots = await calendar_service.find_available_slots(
        db,
        current_user.user_id,
        date,
        duration_minutes=duration,
        business_start=bh_start,
        business_end=bh_end,
        timezone=timezone,
    )

    return AvailableSlotsResponse(date=date, slots=slots)
