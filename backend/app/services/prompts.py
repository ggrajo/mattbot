"""Prompt builder that enriches the agent system prompt with live context.

When the user has Google Calendar connected, the builder fetches today's
availability and injects it so the AI agent can offer booking during calls.
Memory context for known callers is also injected when available.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import calendar_service

logger = logging.getLogger(__name__)


async def build_system_prompt(
    db: AsyncSession,
    user_id,
    base_prompt: str | None = None,
    caller_phone_hash: str | None = None,
) -> str:
    """Return the final system prompt with calendar and memory context appended."""
    parts: list[str] = []

    if base_prompt:
        parts.append(base_prompt)

    calendar_section = await _calendar_section(db, user_id)
    if calendar_section:
        parts.append(calendar_section)

    if caller_phone_hash:
        memory_section = await _memory_section(db, user_id, caller_phone_hash)
        if memory_section:
            parts.append(memory_section)

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


async def _memory_section(
    db: AsyncSession, user_id, caller_phone_hash: str
) -> str | None:
    """Generate the memory context block for a known caller."""
    try:
        from app.models.call_memory_item import CallMemoryItem

        result = await db.execute(
            select(CallMemoryItem)
            .where(
                CallMemoryItem.user_id == user_id,
                CallMemoryItem.caller_phone_hash == caller_phone_hash,
            )
            .order_by(
                CallMemoryItem.importance.desc(),
                CallMemoryItem.created_at.desc(),
            )
            .limit(15)
        )
        memories = list(result.scalars().all())

        if not memories:
            return None

        caller_name = next(
            (m.caller_name for m in memories if m.caller_name), None
        )

        lines = ["[CALLER MEMORY]"]
        if caller_name:
            lines.append(f"This caller is known as: {caller_name}")
            lines.append(
                "Use their name naturally in conversation to build rapport."
            )

        lines.append("Relevant facts and preferences about this caller:")
        for m in memories:
            tag = m.memory_type.upper()
            lines.append(f"  - [{tag}] {m.content}")

        lines.append(
            "Use this context to personalise the conversation but do not "
            "explicitly reveal that you are reading from memory."
        )
        return "\n".join(lines)
    except Exception:
        logger.exception(
            "Failed to build memory prompt section for user %s, caller %s",
            user_id,
            caller_phone_hash,
        )
        return None
