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
        expiry = datetime.now(UTC) + timedelta(seconds=int(tokens["expires_in"]))

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
        existing.updated_at = datetime.now(UTC)
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

    if row.token_expiry and row.token_expiry < datetime.now(UTC) + timedelta(minutes=2):
        refresh_token = decrypt_field(
            row.refresh_token_ciphertext,
            row.refresh_token_nonce,
            row.key_version,
        ).decode()
        try:
            new_tokens = await _refresh_access_token(refresh_token)
        except httpx.HTTPStatusError:
            logger.warning("Failed to refresh Google token for user %s", str(user_id)[:8])
            return None

        access_token = new_tokens["access_token"]
        ct, nonce, kv = encrypt_field(access_token.encode())
        row.access_token_ciphertext = ct
        row.access_token_nonce = nonce
        row.key_version = kv

        if "expires_in" in new_tokens:
            row.token_expiry = datetime.now(UTC) + timedelta(seconds=int(new_tokens["expires_in"]))

        if "refresh_token" in new_tokens:
            rct, rnonce, _ = encrypt_field(new_tokens["refresh_token"].encode())
            row.refresh_token_ciphertext = rct
            row.refresh_token_nonce = rnonce

        row.updated_at = datetime.now(UTC)
        await session.flush()

    return access_token


async def get_calendar_status(db: object, user_id: uuid.UUID) -> dict:
    """Return connection status for the user's Google Calendar."""

    from app.models.google_calendar_token import GoogleCalendarToken

    session = db
    row = await session.get(GoogleCalendarToken, user_id)
    if row is None:
        return {"connected": False, "email": None, "calendar_id": None}

    return {
        "connected": True,
        "email": row.google_email,
        "calendar_id": row.calendar_id,
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


async def list_events(
    db: object,
    user_id: uuid.UUID,
    time_min: str,
    time_max: str,
    timezone: str = "UTC",
) -> list[dict]:
    """List events from the user's primary Google Calendar.

    All returned ``start`` / ``end`` ISO strings are normalised to the
    caller-supplied *timezone* so the mobile app can display them
    without knowing the user's timezone itself.
    """
    token = await get_valid_access_token(db, user_id)
    if not token:
        return []

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
        if resp.status_code != 200:
            logger.error("Google Calendar list_events failed: %d", resp.status_code)
            return []
        data = resp.json()
        items = data.get("items", [])
        results = []
        for ev in items:
            ext_private = ev.get("extendedProperties", {}).get("private", {})
            mattbot_call_id = ext_private.get("mattbot_call_id")
            desc = ev.get("description", "")
            results.append(
                {
                    "id": ev.get("id", ""),
                    "summary": ev.get("summary", "(No title)"),
                    "start": (
                        ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date", "")
                    ),
                    "end": (ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date", "")),
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

    return results


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
