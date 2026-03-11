"""Prompt builder that enriches the agent system prompt with live context.

When the user has Google Calendar connected, the builder fetches today's
availability and injects it so the AI agent can offer booking during calls.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import calendar_service

logger = logging.getLogger(__name__)


async def build_system_prompt(
    db: AsyncSession,
    user_id,
    base_prompt: str | None = None,
) -> str:
    """Return the final system prompt with calendar context appended."""
    parts: list[str] = []

    if base_prompt:
        parts.append(base_prompt)

    calendar_section = await _calendar_section(db, user_id)
    if calendar_section:
        parts.append(calendar_section)

    return "\n\n".join(parts) if parts else ""


async def _calendar_section(db: AsyncSession, user_id) -> str | None:
    """Generate the calendar availability block, or ``None`` if not connected."""
    try:
        from app.models.google_calendar_token import GoogleCalendarToken
        from sqlalchemy import select

        result = await db.execute(
            select(GoogleCalendarToken).where(
                GoogleCalendarToken.user_id == user_id,
                GoogleCalendarToken.is_active.is_(True),
            )
        )
        token = result.scalars().first()
        if token is None:
            return None

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        slots = await calendar_service.get_availability(db, user_id, today)

        if not slots:
            return (
                "[CALENDAR]\n"
                "The user's Google Calendar is connected but there are no "
                "available slots today. Offer to check another day if the "
                "caller wants to book an appointment."
            )

        slot_lines = "\n".join(
            f"  - {s['start_time']} to {s['end_time']}" for s in slots[:8]
        )
        return (
            "[CALENDAR]\n"
            f"Today's date is {today}. The user's Google Calendar is connected.\n"
            f"Available slots today:\n{slot_lines}\n"
            "You may offer to book an appointment in one of these slots if the "
            "caller requests it. Confirm the time before booking."
        )
    except Exception:
        logger.exception("Failed to build calendar prompt section for user %s", user_id)
        return None
