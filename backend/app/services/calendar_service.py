"""Google Calendar integration: OAuth token management and Calendar API calls."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta
from datetime import time as dt_time
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import settings as app_settings
from app.core.encryption import decrypt_field, encrypt_field
from app.core.clock import utcnow

logger = logging.getLogger(__name__)

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
_GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
_TIMEOUT = 15.0


# ── helpers ──────────────────────────────────────────────────────────


def generate_auth_url(state: str) -> str:
    """Build Google OAuth2 authorization URL for calendar scope."""
    params = {
        "client_id": app_settings.GOOGLE_CALENDAR_CLIENT_ID,
        "redirect_uri": app_settings.GOOGLE_CALENDAR_REDIRECT_URI,
        "response_type": "code",
        "scope": app_settings.GOOGLE_CALENDAR_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    return f"{_GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    """Exchange authorization code for access/refresh tokens."""
    payload = {
        "code": code,
        "client_id": app_settings.GOOGLE_CALENDAR_CLIENT_ID,
        "client_secret": app_settings.GOOGLE_CALENDAR_CLIENT_SECRET,
        "redirect_uri": app_settings.GOOGLE_CALENDAR_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(_GOOGLE_TOKEN_URL, data=payload)
        if resp.status_code != 200:
            logger.error("Google token exchange failed: %d %s", resp.status_code, resp.text[:300])
            resp.raise_for_status()
        return resp.json()


async def _refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """Use refresh token to obtain a new access token."""
    payload = {
        "client_id": app_settings.GOOGLE_CALENDAR_CLIENT_ID,
        "client_secret": app_settings.GOOGLE_CALENDAR_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(_GOOGLE_TOKEN_URL, data=payload)
        if resp.status_code != 200:
            logger.error("Google token refresh failed: %d %s", resp.status_code, resp.text[:300])
            resp.raise_for_status()
        return resp.json()


async def fetch_google_email(access_token: str) -> str:
    """Fetch the authenticated user's email from Google userinfo."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        email = resp.json().get("email", "")
        return email


# ── token persistence ────────────────────────────────────────────────


async def store_tokens(
    db: object,
    user_id: uuid.UUID,
    tokens: dict,
    google_email: str,
) -> None:
    """Encrypt and store (or update) Google Calendar tokens."""

    from app.models.google_calendar_token import GoogleCalendarToken

    session = db

    access_ct, access_nonce, kv = encrypt_field(tokens["access_token"].encode())

    expiry = None
    if "expires_in" in tokens:
        expiry = utcnow() + timedelta(seconds=int(tokens["expires_in"]))

    existing = await session.get(GoogleCalendarToken, user_id)

    refresh_token_str = tokens.get("refresh_token")
    if refresh_token_str:
        refresh_ct, refresh_nonce, _ = encrypt_field(refresh_token_str.encode())
    elif existing:
        refresh_ct = existing.refresh_token_ciphertext
        refresh_nonce = existing.refresh_token_nonce
    else:
        raise ValueError("No refresh token received and no existing token on file")

    if existing:
        existing.access_token_ciphertext = access_ct
        existing.access_token_nonce = access_nonce
        existing.refresh_token_ciphertext = refresh_ct
        existing.refresh_token_nonce = refresh_nonce
        existing.key_version = kv
        existing.token_expiry = expiry
        existing.google_email = google_email
        existing.updated_at = utcnow()
    else:
        entry = GoogleCalendarToken(
            owner_user_id=user_id,
            access_token_ciphertext=access_ct,
            access_token_nonce=access_nonce,
            refresh_token_ciphertext=refresh_ct,
            refresh_token_nonce=refresh_nonce,
            key_version=kv,
            token_expiry=expiry,
            google_email=google_email,
        )
        session.add(entry)

    await session.flush()


async def get_valid_access_token(db: object, user_id: uuid.UUID) -> str | None:
    """Decrypt tokens, refresh if expired, return a valid access token."""

    from app.models.google_calendar_token import GoogleCalendarToken

    session = db
    row = await session.get(GoogleCalendarToken, user_id)
    if row is None:
        return None

    access_token = decrypt_field(
        row.access_token_ciphertext,
        row.access_token_nonce,
        row.key_version,
    ).decode()

    expiry = row.token_expiry.replace(tzinfo=None) if row.token_expiry else None
    if expiry and expiry < utcnow() + timedelta(minutes=2):
        refresh_token = decrypt_field(
            row.refresh_token_ciphertext,
            row.refresh_token_nonce,
            row.key_version,
        ).decode()
        try:
            new_tokens = await _refresh_access_token(refresh_token)
        except httpx.HTTPStatusError as exc:
            logger.warning("Failed to refresh Google token for user %s", str(user_id)[:8])
            if exc.response.status_code == 400:
                row.token_expiry = datetime(1970, 1, 1)
                row.updated_at = utcnow()
                await session.flush()
                logger.warning("Marked Google token as needing re-auth for user %s", str(user_id)[:8])
            return None

        access_token = new_tokens["access_token"]
        ct, nonce, kv = encrypt_field(access_token.encode())
        row.access_token_ciphertext = ct
        row.access_token_nonce = nonce
        row.key_version = kv

        if "expires_in" in new_tokens:
            row.token_expiry = utcnow() + timedelta(seconds=int(new_tokens["expires_in"]))

        if "refresh_token" in new_tokens:
            rct, rnonce, _ = encrypt_field(new_tokens["refresh_token"].encode())
            row.refresh_token_ciphertext = rct
            row.refresh_token_nonce = rnonce

        row.updated_at = utcnow()
        await session.flush()

    return access_token


async def get_calendar_status(db: object, user_id: uuid.UUID) -> dict:
    """Return connection status for the user's Google Calendar."""

    from app.models.google_calendar_token import GoogleCalendarToken

    session = db
    row = await session.get(GoogleCalendarToken, user_id)
    if row is None:
        return {"connected": False, "email": None, "calendar_id": None, "needs_reauth": False}

    needs_reauth = False
    if row.token_expiry:
        exp = row.token_expiry.replace(tzinfo=None) if row.token_expiry.tzinfo else row.token_expiry
        if exp <= datetime(1970, 1, 2):
            needs_reauth = True

    return {
        "connected": True,
        "email": row.google_email,
        "calendar_id": row.calendar_id,
        "needs_reauth": needs_reauth,
    }


# ── description helpers ──────────────────────────────────────────────


def _parse_caller_from_description(description: str, field: str) -> str | None:
    """Extract 'Caller: ...' or 'Phone: ...' from a MattBot event description."""
    prefix = "Caller: " if field == "name" else "Phone: "
    for line in description.splitlines():
        stripped = line.strip()
        if stripped.startswith(prefix):
            return stripped[len(prefix) :].strip()
    return None


# ── calendar CRUD ────────────────────────────────────────────────────


async def _get_local_bookings(
    db: object,
    user_id: uuid.UUID,
    time_min: str,
    time_max: str,
    timezone: str = "UTC",
) -> list[dict]:
    """Return MattBot-booked appointments from audit events.

    These are stored locally when the AI books an appointment during a call,
    so they remain available even when Google Calendar is disconnected.
    """
    from datetime import datetime as dt_cls
    from zoneinfo import ZoneInfo

    from sqlalchemy import select, cast, String
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.models.audit_event import AuditEvent

    session: AsyncSession = db  # type: ignore[assignment]

    try:
        range_start = dt_cls.fromisoformat(time_min.replace("Z", "+00:00"))
        range_end = dt_cls.fromisoformat(time_max.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return []

    stmt = (
        select(AuditEvent)
        .where(
            AuditEvent.owner_user_id == user_id,
            AuditEvent.event_type == "calendar.appointment_booked",
        )
        .order_by(AuditEvent.event_at.desc())
        .limit(500)
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()

    tz = ZoneInfo(timezone) if timezone else ZoneInfo("UTC")
    events: list[dict] = []

    for row in rows:
        details = row.details or {}
        date_str = details.get("date", "")
        time_str = details.get("time", "")
        duration = int(details.get("duration_minutes", 30))
        if not date_str or not time_str:
            continue

        try:
            naive = dt_cls.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            start_dt = naive.replace(tzinfo=tz)
            end_dt = start_dt + timedelta(minutes=duration)
        except (ValueError, TypeError):
            continue

        if end_dt.astimezone(ZoneInfo("UTC")) < range_start.astimezone(ZoneInfo("UTC")):
            continue
        if start_dt.astimezone(ZoneInfo("UTC")) > range_end.astimezone(ZoneInfo("UTC")):
            continue

        caller_name = details.get("caller_name")
        caller_phone = details.get("caller_phone")
        reason = details.get("reason", "Appointment")
        event_id = details.get("event_id", str(row.id))
        call_id = details.get("call_id")
        summary = f"{reason} - {caller_name}" if caller_name else reason

        events.append(
            {
                "id": event_id or str(row.id),
                "summary": summary,
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                "description": f"Caller: {caller_name}\nPhone: {caller_phone}" if caller_name else "",
                "location": "",
                "status": "confirmed",
                "organizer_email": "",
                "attendees_count": 0,
                "call_id": call_id,
                "is_mattbot_booked": True,
                "caller_name": caller_name,
                "caller_phone": caller_phone,
            }
        )

    return events


async def list_events(
    db: object,
    user_id: uuid.UUID,
    time_min: str,
    time_max: str,
    timezone: str = "UTC",
) -> list[dict]:
    """List events from the user's Google Calendar merged with local bookings.

    All returned ``start`` / ``end`` ISO strings are normalised to the
    caller-supplied *timezone* so the mobile app can display them
    without knowing the user's timezone itself.

    When Google Calendar is disconnected or the token is expired, locally
    tracked MattBot-booked appointments are still returned.
    """
    google_events: list[dict] = []
    token = await get_valid_access_token(db, user_id)
    if token:
        params = {
            "timeMin": time_min,
            "timeMax": time_max,
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": "250",
            "timeZone": timezone,
        }
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                f"{_GOOGLE_CALENDAR_API}/calendars/primary/events",
                headers={"Authorization": f"Bearer {token}"},
                params=params,
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                for ev in items:
                    ext_private = ev.get("extendedProperties", {}).get("private", {})
                    mattbot_call_id = ext_private.get("mattbot_call_id")
                    desc = ev.get("description", "")
                    google_events.append(
                        {
                            "id": ev.get("id", ""),
                            "summary": ev.get("summary", "(No title)"),
                            "start": (
                                ev.get("start", {}).get("dateTime")
                                or ev.get("start", {}).get("date", "")
                            ),
                            "end": (
                                ev.get("end", {}).get("dateTime")
                                or ev.get("end", {}).get("date", "")
                            ),
                            "description": desc,
                            "location": ev.get("location", ""),
                            "status": ev.get("status", "confirmed"),
                            "organizer_email": ev.get("organizer", {}).get("email", ""),
                            "attendees_count": len(ev.get("attendees", [])),
                            "call_id": mattbot_call_id,
                            "is_mattbot_booked": bool(mattbot_call_id),
                            "caller_name": _parse_caller_from_description(desc, "name"),
                            "caller_phone": _parse_caller_from_description(desc, "phone"),
                        }
                    )
            else:
                logger.error("Google Calendar list_events failed: %d", resp.status_code)

    local_bookings = await _get_local_bookings(db, user_id, time_min, time_max, timezone)

    google_event_ids = {e["id"] for e in google_events if e["id"]}
    for booking in local_bookings:
        if booking["id"] not in google_event_ids:
            google_events.append(booking)

    google_events.sort(key=lambda e: e.get("start", ""))
    return google_events


async def create_event(
    db: object,
    user_id: uuid.UUID,
    summary: str,
    start_datetime: str,
    end_datetime: str,
    description: str = "",
    attendee_email: str | None = None,
    timezone: str = "UTC",
    call_id: str | None = None,
) -> dict | None:
    """Create an event on the user's primary Google Calendar."""
    token = await get_valid_access_token(db, user_id)
    if not token:
        return None

    event_body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_datetime, "timeZone": timezone},
        "end": {"dateTime": end_datetime, "timeZone": timezone},
    }
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]
    if call_id:
        event_body["extendedProperties"] = {
            "private": {"mattbot_call_id": str(call_id)},
        }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"{_GOOGLE_CALENDAR_API}/calendars/primary/events",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=event_body,
        )
        if resp.status_code not in (200, 201):
            logger.error(
                "Google Calendar create_event failed: %d %s",
                resp.status_code,
                resp.text[:300],
            )
            return None

        data = resp.json()
        return {
            "id": data.get("id", ""),
            "summary": data.get("summary", ""),
            "start": data.get("start", {}).get("dateTime", ""),
            "end": data.get("end", {}).get("dateTime", ""),
            "html_link": data.get("htmlLink", ""),
        }


async def get_free_busy(
    db: object,
    user_id: uuid.UUID,
    time_min: str,
    time_max: str,
) -> list[dict]:
    """Query Google Calendar freebusy API to get busy intervals."""
    token = await get_valid_access_token(db, user_id)
    if not token:
        return []

    body = {
        "timeMin": time_min,
        "timeMax": time_max,
        "items": [{"id": "primary"}],
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"{_GOOGLE_CALENDAR_API}/freeBusy",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        if resp.status_code != 200:
            logger.error("Google Calendar freeBusy failed: %d", resp.status_code)
            return []

        data = resp.json()
        return data.get("calendars", {}).get("primary", {}).get("busy", [])


async def find_available_slots(
    db: object,
    user_id: uuid.UUID,
    date_str: str,
    duration_minutes: int = 30,
    business_start: dt_time | None = None,
    business_end: dt_time | None = None,
    timezone: str = "UTC",
) -> list[dict]:
    """Find available time slots on a given date.

    Checks freebusy data and returns open slots within business hours.
    """
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(timezone)
    day = datetime.strptime(date_str, "%Y-%m-%d").date()
    start_hour = business_start or dt_time(9, 0)
    end_hour = business_end or dt_time(17, 0)

    day_start = datetime.combine(day, start_hour, tzinfo=tz)
    day_end = datetime.combine(day, end_hour, tzinfo=tz)

    time_min = day_start.isoformat()
    time_max = day_end.isoformat()

    busy = await get_free_busy(db, user_id, time_min, time_max)

    busy_intervals = []
    for b in busy:
        bs = datetime.fromisoformat(b["start"])
        be = datetime.fromisoformat(b["end"])
        busy_intervals.append((bs, be))

    busy_intervals.sort(key=lambda x: x[0])

    slots = []
    slot_duration = timedelta(minutes=duration_minutes)
    cursor = day_start

    for busy_start, busy_end in busy_intervals:
        while cursor + slot_duration <= busy_start:
            slots.append(
                {
                    "start": cursor.isoformat(),
                    "end": (cursor + slot_duration).isoformat(),
                }
            )
            cursor += slot_duration
        if cursor < busy_end:
            cursor = busy_end.astimezone(tz)

    while cursor + slot_duration <= day_end:
        slots.append(
            {
                "start": cursor.isoformat(),
                "end": (cursor + slot_duration).isoformat(),
            }
        )
        cursor += slot_duration

    return slots


# ── disconnect ───────────────────────────────────────────────────────


async def disconnect_calendar(db: object, user_id: uuid.UUID) -> bool:
    """Revoke Google tokens and remove from DB."""

    from app.models.google_calendar_token import GoogleCalendarToken

    session = db
    row = await session.get(GoogleCalendarToken, user_id)
    if row is None:
        return False

    try:
        access_token = decrypt_field(
            row.access_token_ciphertext,
            row.access_token_nonce,
            row.key_version,
        ).decode()
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            await client.post(_GOOGLE_REVOKE_URL, params={"token": access_token})
    except Exception:
        logger.warning("Failed to revoke Google token for user %s", str(user_id)[:8])

    await session.delete(row)
    await session.flush()
    return True
