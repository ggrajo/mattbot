"""Agent service: creation, retrieval, update, and runtime config assembly."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.config import settings as app_settings
from app.core.clock import utcnow
from app.core.encryption import decrypt_field
from app.models.agent import Agent
from app.models.agent_config import AgentConfig
from app.models.call_memory_item import CallMemoryItem
from app.models.contact_profile import ContactProfile
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.voice_catalog import VoiceCatalog
from app.services.prompts import assemble_final_prompt

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Agent CRUD
# ---------------------------------------------------------------------------


async def get_or_create_default_agent(
    db: AsyncSession,
    user_id: uuid.UUID,
    display_name: str | None = None,
    voice_id: uuid.UUID | None = None,
    user_instructions: str | None = None,
) -> Agent:
    """Return the user's default agent, creating it (with config) if missing."""
    stmt = (
        select(Agent)
        .options(joinedload(Agent.config))
        .where(Agent.owner_user_id == user_id, Agent.is_default.is_(True))
    )

    result = await db.execute(stmt)
    agent = result.unique().scalar_one_or_none()

    if agent is not None:
        return agent

    agent = Agent(
        owner_user_id=user_id,
        display_name=display_name or "Call Screener",
        function_type="call_screener",
        is_default=True,
        status="active",
    )
    db.add(agent)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        result = await db.execute(stmt)
        agent = result.unique().scalar_one_or_none()
        if agent is not None:
            return agent
        raise

    config = AgentConfig(
        agent_id=agent.id,
        voice_id=voice_id,
        user_instructions=user_instructions,
        system_prompt_key=app_settings.AGENT_DEFAULT_SYSTEM_PROMPT_KEY,
    )
    db.add(config)
    await db.flush()

    await db.refresh(agent, ["config"])
    return agent


async def get_agents_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[Agent]:
    """Return all active agents for a user."""
    stmt = (
        select(Agent)
        .options(joinedload(Agent.config))
        .where(Agent.owner_user_id == user_id, Agent.status == "active")
        .order_by(Agent.created_at.asc())
    )
    result = await db.execute(stmt)
    return list(result.unique().scalars().all())


async def get_agent_for_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    agent_id: uuid.UUID,
) -> Agent | None:
    """Return a single agent with ownership check."""
    stmt = (
        select(Agent)
        .options(joinedload(Agent.config))
        .where(Agent.id == agent_id, Agent.owner_user_id == user_id)
    )
    result = await db.execute(stmt)
    return result.unique().scalar_one_or_none()


async def update_agent(
    db: AsyncSession,
    user_id: uuid.UUID,
    agent_id: uuid.UUID,
    display_name: str | None = None,
    voice_id: str | None = None,
    user_instructions: str | None = ...,
    greeting_instructions: str | None = ...,
    expected_revision: int | None = None,
) -> Agent:
    """Partial update of agent and its config. Returns updated agent."""
    from app.middleware.error_handler import AppError

    agent = await get_agent_for_user(db, user_id, agent_id)
    if agent is None:
        raise AppError("AGENT_NOT_FOUND", "Agent not found", 404)

    if agent.config is None:
        config = AgentConfig(
            agent_id=agent.id,
            system_prompt_key=app_settings.AGENT_DEFAULT_SYSTEM_PROMPT_KEY,
        )
        db.add(config)
        await db.flush()
        await db.refresh(agent, ["config"])

    cfg = agent.config
    assert cfg
    config = cfg

    if expected_revision is not None and config.revision != expected_revision:
        raise AppError(
            "REVISION_CONFLICT",
            f"Expected revision {expected_revision}, current is {config.revision}",
            409,
        )

    if display_name is not None:
        agent.display_name = display_name
        agent.updated_at = utcnow()

    if voice_id is not None:
        resolved_voice_id = None
        if voice_id != "":
            try:
                vid = uuid.UUID(voice_id)
            except ValueError as err:
                raise AppError(
                    "INVALID_VOICE_ID",
                    "Invalid voice_id format",
                    400,
                ) from err
            voice = await db.get(VoiceCatalog, vid)
            if voice is None or not voice.is_active:
                raise AppError("VOICE_NOT_FOUND", "Voice not found or inactive", 404)
            resolved_voice_id = vid
        config.voice_id = resolved_voice_id

    if user_instructions is not ...:
        config.user_instructions = user_instructions

    if greeting_instructions is not ...:
        config.greeting_instructions = greeting_instructions

    config.revision += 1
    config.updated_at = utcnow()
    await db.flush()
    await db.refresh(agent, ["config"])
    return agent


# ---------------------------------------------------------------------------
# ElevenLabs sync
# ---------------------------------------------------------------------------


async def ensure_elevenlabs_agent(
    db: AsyncSession,
    agent: Agent,
    user_id: uuid.UUID,
) -> str | None:
    """Ensure the agent has a provisioned ElevenLabs agent.

    If ``agent.elevenlabs_agent_id`` is already set, the remote agent is
    updated with the latest prompt/voice/settings.  Otherwise a new
    ElevenLabs agent is created and the ID is persisted.

    Returns the ElevenLabs agent ID on success, or ``None`` on failure.
    """
    from app.services import elevenlabs_agent_service
    from app.services.prompts import build_greeting_block

    user = await db.get(User, user_id)
    if user is None:
        logger.warning("ensure_elevenlabs_agent: user %s not found", str(user_id)[:8])
        return None

    settings_row = await db.get(UserSettings, user_id)
    user_display = user.display_name or user.nickname or "the user"
    agent_name = settings_row.assistant_name if settings_row else None
    agent_name = agent_name or agent.display_name

    gi = agent.config.greeting_instructions if agent.config else None
    cal_enabled = settings_row.calendar_booking_enabled if settings_row else False

    prompt = assemble_final_prompt(
        agent_name=agent_name,
        user_display_name=user_display,
        function_type=agent.function_type,
        user_instructions=agent.config.user_instructions if agent.config else None,
        greeting_instructions=gi,
        temperament_preset=settings_row.temperament_preset
        if settings_row
        else "professional_polite",
        swearing_rule=settings_row.swearing_rule if settings_row else "no_swearing",
        greeting_template=settings_row.greeting_template if settings_row else "standard",
        recording_enabled=settings_row.recording_enabled if settings_row else False,
        recording_announcement_required=(
            settings_row.recording_announcement_required if settings_row else True
        ),
        transcript_disclosure_mode=(
            settings_row.transcript_disclosure_mode if settings_row else "ai_says_it"
        ),
        handoff_enabled=settings_row.handoff_enabled if settings_row else False,
        handoff_trigger=settings_row.handoff_trigger if settings_row else "vip_only",
        max_call_length_seconds=settings_row.max_call_length_seconds if settings_row else 180,
        calendar_booking_enabled=cal_enabled,
        calendar_default_duration_minutes=(
            settings_row.calendar_default_duration_minutes if settings_row else 30
        ),
        calendar_booking_window_days=(
            settings_row.calendar_booking_window_days if settings_row else 14
        ),
        for_sync=True,
    )

    greeting = build_greeting_block(
        settings_row.greeting_template if settings_row else "standard",
        agent_name,
        user_display,
        gi,
    )

    provider_voice_id = None
    if agent.config and agent.config.voice_id:
        voice = await db.get(VoiceCatalog, agent.config.voice_id)
        if voice and voice.is_active:
            provider_voice_id = voice.provider_voice_id

    booking_tool_ids: list = []
    if cal_enabled:
        webhook_url = f"{app_settings.TWILIO_WEBHOOK_BASE_URL}/webhooks/elevenlabs/tool"
        booking_tool_ids = await elevenlabs_agent_service.ensure_booking_tools(
            webhook_url,
            app_settings.ELEVENLABS_TOOL_WEBHOOK_SECRET,
        )

    from app.models.knowledge_base_doc import KnowledgeBaseDoc

    kb_rows = (
        await db.execute(
            select(KnowledgeBaseDoc).where(KnowledgeBaseDoc.owner_user_id == user_id)
        )
    ).scalars().all()
    kb_entries = [
        {"type": "file", "name": row.name, "id": row.el_document_id}
        for row in kb_rows
    ] if kb_rows else None

    try:
        if agent.elevenlabs_agent_id:
            await elevenlabs_agent_service.update_agent(
                agent.elevenlabs_agent_id,
                system_prompt=prompt,
                first_message=greeting,
                voice_id=provider_voice_id,
                language=settings_row.language_primary if settings_row else "en",
                max_duration_seconds=(
                    settings_row.max_call_length_seconds if settings_row else 180
                ),
                temperament_preset=(
                    settings_row.temperament_preset if settings_row else "professional_polite"
                ),
                tool_ids=booking_tool_ids,
                knowledge_base_ids=kb_entries,
            )
            logger.info(
                "ElevenLabs agent updated for user %s: %s",
                str(user_id)[:8],
                agent.elevenlabs_agent_id[:12],
            )
            return agent.elevenlabs_agent_id

        el_resp = await elevenlabs_agent_service.create_agent(
            name=f"mattbot_{str(user_id)[:8]}",
            system_prompt=prompt,
            first_message=greeting,
            voice_id=provider_voice_id,
            language=settings_row.language_primary if settings_row else "en",
            max_duration_seconds=(settings_row.max_call_length_seconds if settings_row else 180),
            temperament_preset=(
                settings_row.temperament_preset if settings_row else "professional_polite"
            ),
            tool_ids=booking_tool_ids,
            knowledge_base_ids=kb_entries,
        )
        new_id = el_resp.get("agent_id", "")
        if new_id:
            agent.elevenlabs_agent_id = new_id
            await db.flush()
            logger.info(
                "ElevenLabs agent created for user %s: %s",
                str(user_id)[:8],
                new_id[:12],
            )
            return new_id
        logger.error("ElevenLabs create_agent returned no agent_id")
        return None
    except Exception:
        logger.exception("ensure_elevenlabs_agent failed for user %s", str(user_id)[:8])
        return None


# ---------------------------------------------------------------------------
# Contact-level AI overrides
# ---------------------------------------------------------------------------


def resolve_contact_ai_settings(
    contact: ContactProfile | None,
    settings_row: UserSettings,
) -> dict:
    """Resolve effective AI settings: contact override > category default > global.

    Returns a dict with keys: temperament_preset, swearing_rule,
    greeting_template, max_call_length_seconds, greeting_instructions (str|None),
    custom_instructions (str|None), is_vip (bool), category (str|None).
    """
    cat_defaults: dict = {}
    if contact:
        cat_defaults = (settings_row.contact_category_defaults or {}).get(
            contact.category,
            {},
        )

    def _pick(contact_field: str, cat_key: str, global_val: object) -> object:
        if contact and getattr(contact, contact_field, None) is not None:
            return getattr(contact, contact_field)
        if cat_defaults.get(cat_key) is not None:
            return cat_defaults[cat_key]
        return global_val

    is_vip = contact.is_vip if contact else False
    max_call_global = (
        settings_row.vip_max_call_length_seconds if is_vip else settings_row.max_call_length_seconds
    )

    greeting_instructions: str | None = None
    if contact and contact.ai_greeting_instructions_ciphertext is not None:
        try:
            greeting_instructions = decrypt_field(
                contact.ai_greeting_instructions_ciphertext,
                contact.ai_greeting_instructions_nonce,
                contact.ai_greeting_instructions_key_version,
            ).decode("utf-8")
        except Exception:
            logger.warning("Failed to decrypt greeting instructions for contact %s", contact.id)

    custom_instructions: str | None = None
    if contact and contact.ai_custom_instructions_ciphertext is not None:
        try:
            custom_instructions = decrypt_field(
                contact.ai_custom_instructions_ciphertext,
                contact.ai_custom_instructions_nonce,
                contact.ai_custom_instructions_key_version,
            ).decode("utf-8")
        except Exception:
            logger.warning("Failed to decrypt custom instructions for contact %s", contact.id)

    return {
        "temperament_preset": _pick(
            "ai_temperament_preset",
            "temperament_preset",
            settings_row.temperament_preset,
        ),
        "swearing_rule": _pick(
            "ai_swearing_rule",
            "swearing_rule",
            settings_row.swearing_rule,
        ),
        "greeting_template": _pick(
            "ai_greeting_template",
            "greeting_template",
            settings_row.greeting_template,
        ),
        "max_call_length_seconds": _pick(
            "ai_max_call_length_seconds",
            "max_call_length_seconds",
            max_call_global,
        ),
        "greeting_instructions": greeting_instructions,
        "custom_instructions": custom_instructions,
        "is_vip": is_vip,
        "category": contact.category if contact else None,
    }


# ---------------------------------------------------------------------------
# Runtime config assembly (used at call start)
# ---------------------------------------------------------------------------


async def get_agent_runtime_config(
    db: AsyncSession,
    call_id: uuid.UUID,
) -> dict | None:
    """Build the runtime config for a call. Returns None if call/agent not found."""
    from app.models.call import Call

    call = await db.get(Call, call_id)
    if call is None:
        return None

    user = await db.get(User, call.owner_user_id)
    if user is None:
        return None

    agent = None
    if call.agent_id:
        stmt = select(Agent).options(joinedload(Agent.config)).where(Agent.id == call.agent_id)
        result = await db.execute(stmt)
        agent = result.unique().scalar_one_or_none()

    if agent is None:
        agent = await get_or_create_default_agent(db, call.owner_user_id)

    config = agent.config

    provider_voice_id = app_settings.ELEVENLABS_DEFAULT_VOICE_ID
    if config and config.voice_id:
        voice = await db.get(VoiceCatalog, config.voice_id)
        if voice and voice.is_active:
            provider_voice_id = voice.provider_voice_id

    settings_row = await db.get(UserSettings, call.owner_user_id)

    from app.services.prompts import (
        SWEARING_BLOCKS,
        TEMPERAMENT_BLOCKS,
        build_caller_context_block,
        build_contact_instructions_block,
        build_greeting_block,
        build_memory_block,
        build_time_limit_block,
    )

    user_display = user.display_name or user.nickname or "the user"
    agent_name = agent.display_name

    contact_profile = None
    memory_enabled = settings_row.memory_enabled if settings_row else True
    memory_items = None
    vip_info = None
    repeat_caller_context = None

    if call.caller_phone_hash:
        contact_profile = (
            await db.execute(
                select(ContactProfile).where(
                    ContactProfile.owner_user_id == call.owner_user_id,
                    ContactProfile.phone_hash == call.caller_phone_hash,
                    ContactProfile.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()

        if memory_enabled:
            memory_items = await _load_caller_memory(
                db,
                call.owner_user_id,
                call.caller_phone_hash,
            )
            repeat_caller_context = await _build_repeat_caller_context(
                db,
                call.owner_user_id,
                call.caller_phone_hash,
                call.id,
                contact_profile=contact_profile,
            )

    resolved = resolve_contact_ai_settings(contact_profile, settings_row)
    is_vip = resolved["is_vip"]

    if is_vip and contact_profile:
        vip_info = {
            "display_name": contact_profile.display_name,
            "company": contact_profile.company,
            "relationship": contact_profile.relationship,
            "notes": contact_profile.notes,
        }

    gi = resolved.get("greeting_instructions") or (config.greeting_instructions if config else None)

    greeting_tpl = resolved["greeting_template"]

    memory_caller_name = _extract_caller_name_from_memory(memory_items)

    final_prompt = assemble_final_prompt(
        system_prompt_key=config.system_prompt_key if config else "screening_v2",
        agent_name=agent_name,
        user_display_name=user_display,
        function_type=agent.function_type,
        user_instructions=config.user_instructions if config else None,
        greeting_instructions=gi,
        temperament_preset=resolved["temperament_preset"],
        swearing_rule=resolved["swearing_rule"],
        greeting_template=greeting_tpl,
        recording_enabled=settings_row.recording_enabled if settings_row else False,
        recording_announcement_required=(
            settings_row.recording_announcement_required if settings_row else True
        ),
        transcript_disclosure_mode=(
            settings_row.transcript_disclosure_mode if settings_row else "ai_says_it"
        ),
        handoff_enabled=settings_row.handoff_enabled if settings_row else False,
        handoff_trigger=settings_row.handoff_trigger if settings_row else "vip_only",
        max_call_length_seconds=resolved["max_call_length_seconds"],
        is_vip=is_vip,
        memory_items=memory_items,
        vip_info=vip_info,
        repeat_caller_context=repeat_caller_context,
        calendar_booking_enabled=(settings_row.calendar_booking_enabled if settings_row else False),
        calendar_default_duration_minutes=(
            settings_row.calendar_default_duration_minutes if settings_row else 30
        ),
        calendar_booking_window_days=(
            settings_row.calendar_booking_window_days if settings_row else 14
        ),
        caller_name_from_memory=memory_caller_name,
    )

    vip_name = vip_info.get("display_name") if vip_info else None
    greeting_text = build_greeting_block(
        greeting_tpl,
        agent_name,
        user_display,
        gi,
        vip_name=vip_name,
        caller_name_from_memory=memory_caller_name,
    )

    caller_ctx = build_caller_context_block(is_vip, vip_info)
    contact_instr = build_contact_instructions_block(resolved.get("custom_instructions"))
    caller_ctx = caller_ctx + contact_instr
    memory_ctx = build_memory_block(memory_items, vip_info, repeat_caller_context)

    temperament_text = TEMPERAMENT_BLOCKS.get(
        resolved["temperament_preset"],
        TEMPERAMENT_BLOCKS["professional_polite"],
    )
    swearing_text = SWEARING_BLOCKS.get(
        resolved["swearing_rule"],
        SWEARING_BLOCKS["no_swearing"],
    )

    time_limit_text = build_time_limit_block(
        resolved["max_call_length_seconds"],
        is_vip,
    )

    return {
        "agent_id": str(agent.id),
        "agent_display_name": agent.display_name,
        "agent_function_type": agent.function_type,
        "provider_voice_id": provider_voice_id,
        "final_prompt": final_prompt,
        "greeting_text": greeting_text,
        "elevenlabs_agent_id": agent.elevenlabs_agent_id or "",
        "call_objective_mode": (
            settings_row.call_objective_mode if settings_row else "screen_and_summarize"
        ),
        "max_call_length_seconds": resolved["max_call_length_seconds"],
        "recording_enabled": settings_row.recording_enabled if settings_row else False,
        "memory_enabled": memory_enabled,
        "calendar_booking_enabled": (
            settings_row.calendar_booking_enabled if settings_row else False
        ),
        "business_hours_enabled": settings_row.business_hours_enabled if settings_row else False,
        "business_hours_start": (
            settings_row.business_hours_start.strftime("%H:%M")
            if settings_row and settings_row.business_hours_start
            else None
        ),
        "business_hours_end": (
            settings_row.business_hours_end.strftime("%H:%M")
            if settings_row and settings_row.business_hours_end
            else None
        ),
        "business_hours_days": settings_row.business_hours_days if settings_row else [],
        "quiet_hours_enabled": settings_row.quiet_hours_enabled if settings_row else False,
        "quiet_hours_start": (
            settings_row.quiet_hours_start.strftime("%H:%M")
            if settings_row and settings_row.quiet_hours_start
            else None
        ),
        "quiet_hours_end": (
            settings_row.quiet_hours_end.strftime("%H:%M")
            if settings_row and settings_row.quiet_hours_end
            else None
        ),
        "quiet_hours_days": settings_row.quiet_hours_days if settings_row else [],
        "quiet_hours_allow_vip": settings_row.quiet_hours_allow_vip if settings_row else True,
        "timezone": settings_row.timezone if settings_row else "UTC",
        "dynamic_variables": {
            "caller_context": caller_ctx,
            "memory_context": memory_ctx,
            "temperament_block": temperament_text,
            "swearing_block": swearing_text,
            "time_limit_block": time_limit_text,
        },
    }


# ---------------------------------------------------------------------------
# Memory / caller helpers
# ---------------------------------------------------------------------------


def _extract_caller_name_from_memory(
    memory_items: list[dict] | None,
) -> str | None:
    """Pull the caller's display name from decrypted memory items, if present."""
    if not memory_items:
        return None
    for item in memory_items:
        subj = (item.get("subject") or "").lower()
        if subj not in ("caller_display_name", "name"):
            continue
        name = (item.get("value") or "").strip()
        if not name:
            continue
        return name
    return None


_FULL_TRANSCRIPT_LIMIT = 3
_MAX_TRANSCRIPT_CHARS = 2500
_MAX_SUMMARY_LEN = 250
_MAX_PAST_CALLS = 10


async def _build_repeat_caller_context(
    db: AsyncSession,
    user_id: uuid.UUID,
    caller_phone_hash: str,
    current_call_id: uuid.UUID,
    *,
    contact_profile: ContactProfile | None = None,
) -> str | None:
    """Build organised context about a repeat caller.

    Structure:
    1. CALLER PROFILE — name, category, company, notes from ContactProfile
    2. KEY FACTS — aggregated topics / preferences from memory items + extractions
    3. RECENT CONVERSATIONS — full transcripts for the 3 most recent calls
    4. EARLIER CALLS — summaries for calls 4-10
    """
    from app.models.call import Call
    from app.models.call_artifact import CallArtifact
    from app.services.artifact_service import decrypt_summary, decrypt_transcript_text

    stmt = (
        select(Call)
        .where(
            Call.owner_user_id == user_id,
            Call.caller_phone_hash == caller_phone_hash,
            Call.deleted_at.is_(None),
            Call.id != current_call_id,
            Call.status == "completed",
        )
        .order_by(Call.started_at.desc())
        .limit(_MAX_PAST_CALLS)
    )

    result = await db.execute(stmt)
    past_calls = list(result.scalars().all())

    if not past_calls:
        return None

    lines: list[str] = []

    # ---- CALLER PROFILE ----
    profile_parts: list[str] = []
    if contact_profile:
        if contact_profile.display_name:
            profile_parts.append(f"Name: {contact_profile.display_name}")
        if contact_profile.category and contact_profile.category != "other":
            profile_parts.append(f"Category: {contact_profile.category.title()}")
        if contact_profile.company:
            profile_parts.append(f"Company: {contact_profile.company}")
        if contact_profile.relationship:
            profile_parts.append(f"Relationship: {contact_profile.relationship}")
        if contact_profile.notes:
            profile_parts.append(f"Notes: {contact_profile.notes}")

    if profile_parts:
        lines.append("=== CALLER PROFILE ===")
        lines.append(" | ".join(profile_parts))
        lines.append("")

    # ---- Load artifacts for all past calls ----
    call_ids = [c.id for c in past_calls]
    artifact_stmt = select(CallArtifact).where(CallArtifact.call_id.in_(call_ids))
    artifact_result = await db.execute(artifact_stmt)
    artifacts_by_call = {a.call_id: a for a in artifact_result.scalars().all()}

    # ---- KEY FACTS ----
    reasons: list[str] = []
    for pc in past_calls:
        art = artifacts_by_call.get(pc.id)
        if not art:
            continue
        if not art.structured_extraction:
            continue
        r = art.structured_extraction.get("reason", "")
        if not r:
            continue
        if r in reasons:
            continue
        reasons.append(r)

    call_count = len(past_calls)
    first_date = past_calls[-1].started_at.strftime("%b %d, %Y")
    last_date = past_calls[0].started_at.strftime("%b %d, %Y")

    lines.append(f"=== KEY FACTS (from {call_count} past call{'s' if call_count != 1 else ''}) ===")
    lines.append(f"Call history: {first_date} to {last_date}")
    if reasons:
        lines.append(f"Topics discussed: {'; '.join(reasons[:5])}")
    lines.append("")

    # ---- RECENT CONVERSATIONS (full transcripts) ----
    recent_added = 0
    recent_lines: list[str] = []
    for _idx, past_call in enumerate(past_calls):
        if recent_added >= _FULL_TRANSCRIPT_LIMIT:
            break
        artifact = artifacts_by_call.get(past_call.id)
        if not artifact:
            continue
        transcript = decrypt_transcript_text(artifact)
        if not transcript:
            continue

        call_date = past_call.started_at.strftime("%B %d, %Y")
        truncated = transcript
        if len(transcript) > _MAX_TRANSCRIPT_CHARS:
            truncated = (
                transcript[:_MAX_TRANSCRIPT_CHARS].rsplit("\n", 1)[0]
                + "\n[...conversation continues]"
            )
        recent_lines.append(f"\n--- {call_date} ---")
        recent_lines.append(truncated)
        recent_added += 1

    if recent_lines:
        lines.append("=== RECENT CONVERSATIONS ===")
        lines.extend(recent_lines)
        lines.append("")

    # ---- EARLIER CALLS (summaries) ----
    earlier_lines: list[str] = []
    for idx, past_call in enumerate(past_calls):
        if idx < _FULL_TRANSCRIPT_LIMIT:
            continue
        call_date = past_call.started_at.strftime("%b %d, %Y")
        artifact = artifacts_by_call.get(past_call.id)

        entry_parts: list[str] = []
        if artifact and artifact.structured_extraction:
            ext = artifact.structured_extraction
            reason = ext.get("reason", "")
            if reason:
                entry_parts.append(f"Called about: {reason}.")
            urgency = ext.get("urgency_level", "")
            if urgency:
                entry_parts.append(f"Urgency: {urgency}.")

        if artifact:
            summary_text = decrypt_summary(artifact)
            if summary_text:
                truncated = (
                    summary_text[:_MAX_SUMMARY_LEN].rsplit(" ", 1)[0] + "..."
                    if len(summary_text) > _MAX_SUMMARY_LEN
                    else summary_text
                )
                entry_parts.append(truncated)

        if not entry_parts:
            continue
        earlier_lines.append(f"- {call_date}: {' '.join(entry_parts)}")

    if earlier_lines:
        lines.append("=== EARLIER CALLS (summaries) ===")
        lines.extend(earlier_lines)

    return "\n".join(lines)


async def _load_caller_memory(
    db: AsyncSession,
    user_id: uuid.UUID,
    caller_phone_hash: str,
) -> list[dict] | None:
    """Load and decrypt active memory items for a specific caller."""
    stmt = (
        select(CallMemoryItem)
        .where(
            CallMemoryItem.owner_user_id == user_id,
            CallMemoryItem.caller_phone_hash == caller_phone_hash,
            CallMemoryItem.deleted_at.is_(None),
        )
        .order_by(CallMemoryItem.created_at.desc())
        .limit(20)
    )

    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    if not rows:
        return None

    items: list[dict] = []
    for row in rows:
        try:
            value = decrypt_field(
                row.value_ciphertext,
                row.value_nonce,
                row.value_key_version,
            ).decode("utf-8")
        except Exception:
            logger.warning("Failed to decrypt memory item %s", row.id)
            continue
        items.append(
            {
                "subject": row.subject or row.memory_type,
                "value": value,
            }
        )

    return items or None
