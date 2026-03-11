"""Google Calendar integration service.

In development mode, returns mock data instead of calling the Google API.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

_DEV_MODE = settings.ENVIRONMENT == "development"


async def _get_token(db: AsyncSession, user_id: uuid.UUID):
    from app.models.google_calendar_token import GoogleCalendarToken

    result = await db.execute(
        select(GoogleCalendarToken).where(
            GoogleCalendarToken.user_id == user_id,
            GoogleCalendarToken.is_active.is_(True),
        )
    )
    return result.scalars().first()


async def refresh_token_if_needed(db: AsyncSession, token) -> None:
    """Refresh the Google OAuth access token if it has expired."""
    if token.token_expiry is None:
        return
    now = datetime.now(timezone.utc)
    if token.token_expiry.replace(tzinfo=timezone.utc) > now:
        return

    if _DEV_MODE:
        token.token_expiry = now + timedelta(hours=1)
        await db.flush()
        return

    from google.auth.transport.requests import Request as GoogleRequest
    from google.oauth2.credentials import Credentials

    creds = Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CALENDAR_CLIENT_ID,
        client_secret=settings.GOOGLE_CALENDAR_CLIENT_SECRET,
    )
    creds.refresh(GoogleRequest())
    token.access_token = creds.token
    token.token_expiry = creds.expiry
    await db.flush()


async def connect_google_calendar(
    db: AsyncSession, user_id: uuid.UUID, auth_code: str
):
    """Exchange an OAuth authorization code for tokens and persist them."""
    from app.models.google_calendar_token import GoogleCalendarToken

    if _DEV_MODE:
        existing = await _get_token(db, user_id)
        if existing:
            existing.access_token = "dev-access-token"
            existing.refresh_token = "dev-refresh-token"
            existing.token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
            existing.is_active = True
            await db.flush()
            return existing

        token = GoogleCalendarToken(
            user_id=user_id,
            access_token="dev-access-token",
            refresh_token="dev-refresh-token",
            token_expiry=datetime.now(timezone.utc) + timedelta(hours=1),
            calendar_id="primary",
            is_active=True,
        )
        db.add(token)
        await db.flush()
        return token

    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
                "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=["https://www.googleapis.com/auth/calendar"],
        redirect_uri=settings.GOOGLE_CALENDAR_REDIRECT_URI,
    )
    flow.fetch_token(code=auth_code)
    creds = flow.credentials

    existing = await _get_token(db, user_id)
    if existing:
        existing.access_token = creds.token
        existing.refresh_token = creds.refresh_token
        existing.token_expiry = creds.expiry
        existing.is_active = True
        await db.flush()
        return existing

    token = GoogleCalendarToken(
        user_id=user_id,
        access_token=creds.token,
        refresh_token=creds.refresh_token,
        token_expiry=creds.expiry,
        calendar_id="primary",
        is_active=True,
    )
    db.add(token)
    await db.flush()
    return token


async def disconnect_calendar(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Deactivate the stored calendar token for a user."""
    token = await _get_token(db, user_id)
    if token:
        token.is_active = False
        await db.flush()


async def get_availability(
    db: AsyncSession,
    user_id: uuid.UUID,
    date: str,
    duration_minutes: int = 30,
) -> list[dict]:
    """Return available time slots for the given date.

    ``date`` should be in ``YYYY-MM-DD`` format.
    """
    token = await _get_token(db, user_id)
    if token is None:
        return []

    if _DEV_MODE:
        base = datetime.strptime(date, "%Y-%m-%d").replace(
            hour=9, minute=0, tzinfo=timezone.utc
        )
        slots = []
        for i in range(8):
            start = base + timedelta(minutes=i * duration_minutes)
            end = start + timedelta(minutes=duration_minutes)
            slots.append({"start_time": start.isoformat(), "end_time": end.isoformat()})
        return slots

    await refresh_token_if_needed(db, token)

    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials

    creds = Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CALENDAR_CLIENT_ID,
        client_secret=settings.GOOGLE_CALENDAR_CLIENT_SECRET,
    )
    service = build("calendar", "v3", credentials=creds)

    day_start = datetime.strptime(date, "%Y-%m-%d").replace(
        hour=9, minute=0, tzinfo=timezone.utc
    )
    day_end = day_start.replace(hour=17)

    body = {
        "timeMin": day_start.isoformat(),
        "timeMax": day_end.isoformat(),
        "items": [{"id": token.calendar_id}],
    }
    freebusy = service.freebusy().query(body=body).execute()

    busy = freebusy["calendars"].get(token.calendar_id, {}).get("busy", [])
    busy_ranges = [
        (
            datetime.fromisoformat(b["start"]),
            datetime.fromisoformat(b["end"]),
        )
        for b in busy
    ]

    slots: list[dict] = []
    current = day_start
    while current + timedelta(minutes=duration_minutes) <= day_end:
        slot_end = current + timedelta(minutes=duration_minutes)
        conflict = any(s < slot_end and e > current for s, e in busy_ranges)
        if not conflict:
            slots.append(
                {"start_time": current.isoformat(), "end_time": slot_end.isoformat()}
            )
        current += timedelta(minutes=duration_minutes)

    return slots


async def create_booking(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    start_time: datetime,
    end_time: datetime,
    attendee_email: str | None = None,
) -> dict:
    """Create a Google Calendar event and return its details."""
    token = await _get_token(db, user_id)
    if token is None:
        raise ValueError("Calendar not connected")

    if _DEV_MODE:
        event_id = str(uuid.uuid4())
        return {
            "event_id": event_id,
            "title": title,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "link": f"https://calendar.google.com/event?eid={event_id}",
        }

    await refresh_token_if_needed(db, token)

    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials

    creds = Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CALENDAR_CLIENT_ID,
        client_secret=settings.GOOGLE_CALENDAR_CLIENT_SECRET,
    )
    service = build("calendar", "v3", credentials=creds)

    event_body: dict = {
        "summary": title,
        "start": {"dateTime": start_time.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end_time.isoformat(), "timeZone": "UTC"},
    }
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]

    event = (
        service.events()
        .insert(calendarId=token.calendar_id, body=event_body)
        .execute()
    )

    return {
        "event_id": event["id"],
        "title": event.get("summary", title),
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "link": event.get("htmlLink"),
    }


async def get_upcoming_events(
    db: AsyncSession, user_id: uuid.UUID, limit: int = 10
) -> list[dict]:
    """Fetch upcoming events from the user's Google Calendar."""
    token = await _get_token(db, user_id)
    if token is None:
        return []

    if _DEV_MODE:
        now = datetime.now(timezone.utc)
        events = []
        for i in range(min(limit, 5)):
            start = now + timedelta(hours=i + 1)
            events.append(
                {
                    "event_id": str(uuid.uuid4()),
                    "title": f"Mock Event {i + 1}",
                    "start_time": start.isoformat(),
                    "end_time": (start + timedelta(minutes=30)).isoformat(),
                    "attendees": [],
                }
            )
        return events

    await refresh_token_if_needed(db, token)

    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials

    creds = Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CALENDAR_CLIENT_ID,
        client_secret=settings.GOOGLE_CALENDAR_CLIENT_SECRET,
    )
    service = build("calendar", "v3", credentials=creds)

    now = datetime.now(timezone.utc).isoformat()
    result = (
        service.events()
        .list(
            calendarId=token.calendar_id,
            timeMin=now,
            maxResults=limit,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    events = []
    for item in result.get("items", []):
        start_raw = item["start"].get("dateTime", item["start"].get("date"))
        end_raw = item["end"].get("dateTime", item["end"].get("date"))
        attendees = [a.get("email", "") for a in item.get("attendees", [])]
        events.append(
            {
                "event_id": item["id"],
                "title": item.get("summary", "(No title)"),
                "start_time": start_raw,
                "end_time": end_raw,
                "attendees": attendees,
            }
        )

    return events
