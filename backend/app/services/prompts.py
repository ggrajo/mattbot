"""Prompt builder that enriches the agent system prompt with live context.

Builds natural-conversation style prompts by combining:
- Agent personality and role
- User preferences (name, timezone, business hours)
- Calendar context if connected
- Memory context for the specific caller
- Call mode information

The result reads like a briefing to a real assistant, not a robotic instruction set.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import calendar_service

logger = logging.getLogger(__name__)

PERSONALITY_DESCRIPTORS: dict[str, str] = {
    "professional": (
        "You are polished, courteous, and efficient. "
        "You keep responses concise and respectful."
    ),
    "friendly": (
        "You are warm, approachable, and conversational. "
        "You use a casual but respectful tone."
    ),
    "formal": (
        "You are highly formal, precise, and deferential. "
        "You use proper titles and measured language."
    ),
    "casual": (
        "You are relaxed and easygoing. "
        "You speak like a helpful neighbour — natural and unpretentious."
    ),
}


async def build_system_prompt(
    db: AsyncSession,
    user_id,
    base_prompt: str | None = None,
    caller_phone_hash: str | None = None,
    *,
    agent_name: str | None = None,
    personality: str | None = None,
    language: str | None = None,
    user_display_name: str | None = None,
    user_timezone: str | None = None,
    call_mode: str | None = None,
) -> str:
    """Return the final system prompt with all context sections assembled.

    The prompt is structured as a natural briefing:
      1. Identity & personality
      2. User preferences
      3. Call mode / scenario
      4. Calendar availability
      5. Caller memory
      6. Behavioral guidelines
    """
    sections: list[str] = []

    sections.append(
        _identity_section(
            agent_name=agent_name,
            personality=personality,
            language=language,
            base_prompt=base_prompt,
        )
    )

    sections.append(
        _user_preferences_section(
            display_name=user_display_name,
            timezone=user_timezone,
        )
    )

    if call_mode:
        sections.append(_call_mode_section(call_mode))

    calendar_section = await _calendar_section(db, user_id)
    if calendar_section:
        sections.append(calendar_section)

    if caller_phone_hash:
        memory_section = await _memory_section(db, user_id, caller_phone_hash)
        if memory_section:
            sections.append(memory_section)

    sections.append(_guidelines_section())

    return "\n\n".join(s for s in sections if s)


def _identity_section(
    *,
    agent_name: str | None,
    personality: str | None,
    language: str | None,
    base_prompt: str | None,
) -> str:
    name = agent_name or "MattBot"
    personality_text = PERSONALITY_DESCRIPTORS.get(
        personality or "professional",
        PERSONALITY_DESCRIPTORS["professional"],
    )

    lines = [
        f"You are {name}, an AI phone assistant.",
        personality_text,
    ]

    if language and language not in ("en", "English"):
        lines.append(f"Speak in {language}.")

    if base_prompt:
        lines.append(base_prompt)

    return "\n".join(lines)


def _user_preferences_section(
    *,
    display_name: str | None,
    timezone: str | None,
) -> str:
    owner = display_name or "the subscriber"
    tz = timezone or "UTC"
    return (
        f"You are answering calls on behalf of {owner}. "
        f"Their timezone is {tz}. Keep this in mind when discussing times or "
        f"scheduling."
    )


def _call_mode_section(call_mode: str) -> str:
    mode_descriptions: dict[str, str] = {
        "screen": (
            "This call is in SCREENING mode. Your job is to find out who is "
            "calling and why, then relay that to the owner. Be polite but "
            "gather the essentials quickly."
        ),
        "assistant": (
            "This call is in ASSISTANT mode. Help the caller with whatever "
            "they need — answer questions, take messages, or schedule "
            "appointments if the calendar is available."
        ),
        "away": (
            "This call is in AWAY mode. The owner is unavailable. Take a "
            "detailed message and let the caller know someone will get back "
            "to them."
        ),
        "dnd": (
            "This call is in DO NOT DISTURB mode. Keep the interaction brief. "
            "Take a message unless the caller indicates it's an emergency."
        ),
    }
    return mode_descriptions.get(
        call_mode,
        f"The current call mode is '{call_mode}'.",
    )


def _guidelines_section() -> str:
    return (
        "Guidelines:\n"
        "- Speak naturally, as a real person would on the phone.\n"
        "- Keep responses concise — callers don't like long monologues.\n"
        "- If you don't know something, say so honestly.\n"
        "- Never reveal that you are reading from memory or a database.\n"
        "- Confirm important details (names, numbers, times) by repeating them back."
    )


async def _calendar_section(db: AsyncSession, user_id) -> str | None:
    """Generate the calendar availability block, or ``None`` if not connected."""
    try:
        from app.models.google_calendar_token import GoogleCalendarToken

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
                "The owner's Google Calendar is connected but there are no "
                "available slots today. Offer to check another day if the "
                "caller wants to book an appointment."
            )

        slot_lines = "\n".join(
            f"  - {s['start_time']} to {s['end_time']}" for s in slots[:8]
        )
        return (
            "[CALENDAR]\n"
            f"Today's date is {today}. The owner's Google Calendar is connected.\n"
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
