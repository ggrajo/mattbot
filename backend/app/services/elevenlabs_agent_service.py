"""ElevenLabs agent management: create, update, delete per-user agents + voice catalog sync."""

from __future__ import annotations

import logging

import httpx

from app.config import settings as app_settings

logger = logging.getLogger(__name__)

_API_BASE = "https://api.elevenlabs.io/v1"
_TIMEOUT = 30.0


def _headers() -> dict[str, str]:
    return {"xi-api-key": app_settings.ELEVENLABS_API_KEY}


# Maps user-facing temperament presets to ElevenLabs turn_eagerness values.
# "normal" is the balanced default; "eager" means the agent jumps in
# sooner, "patient" means it waits longer before responding.
TURN_EAGERNESS_MAP: dict[str, str] = {
    "professional_polite": "normal",
    "casual_friendly": "eager",
    "short_and_direct": "eager",
    "warm_and_supportive": "patient",
    "formal": "patient",
    "custom": "normal",
}


# All MattBot-created tools in ElevenLabs share this prefix so they can
# be identified and managed independently of any user-created tools.
_MATTBOT_TOOL_PREFIX = "mattbot_"


def _make_property(prop_type: str, description: str) -> dict:
    """Build a user-provided parameter property."""
    return {"type": prop_type, "description": description}


def _const_property(prop_type: str, value: str) -> dict:
    """Build a constant-value parameter (always the same, hidden from LLM)."""
    return {"type": prop_type, "constant_value": value}


def _dynamic_var_property(prop_type: str, var_name: str) -> dict:
    """Build a parameter populated from a conversation dynamic variable."""
    return {"type": prop_type, "dynamic_variable": var_name}


def _booking_tool_body(webhook_url: str, tool_secret: str = "") -> dict:
    """POST body for creating the book_appointment tool via /v1/convai/tools."""
    headers = {"X-Tool-Secret": tool_secret} if tool_secret else {}
    return {
        "tool_config": {
            "name": f"{_MATTBOT_TOOL_PREFIX}book_appointment",
            "description": ("Book an appointment on the user's calendar for the caller."),
            "type": "webhook",
            "api_schema": {
                "url": webhook_url,
                "method": "POST",
                "request_headers": headers,
                "path_params_schema": {},
                "query_params_schema": None,
                "request_body_schema": {
                    "type": "object",
                    "description": "",
                    "required": [
                        "tool_name",
                        "date",
                        "time",
                        "caller_name",
                        "reason",
                    ],
                    "properties": {
                        "tool_name": _const_property("string", "book_appointment"),
                        "agent_id": _dynamic_var_property("string", "el_agent_id"),
                        "date": _make_property("string", "Date in YYYY-MM-DD format"),
                        "time": _make_property("string", "Time in HH:MM 24-hour format"),
                        "duration_minutes": _make_property(
                            "integer",
                            "Duration in minutes (default 30)",
                        ),
                        "caller_name": _make_property("string", "Name of the person booking"),
                        "reason": _make_property("string", "Purpose of the appointment"),
                        "caller_phone": _make_property("string", "Phone number of the caller"),
                    },
                },
                "content_type": "application/json",
                "auth_connection": None,
            },
        }
    }


def _availability_tool_body(webhook_url: str, tool_secret: str = "") -> dict:
    """POST body for creating the get_available_slots tool via /v1/convai/tools."""
    headers = {"X-Tool-Secret": tool_secret} if tool_secret else {}
    return {
        "tool_config": {
            "name": f"{_MATTBOT_TOOL_PREFIX}get_available_slots",
            "description": (
                "Check the calendar owner's availability for a given date "
                "and return ALL open appointment slots for that day. Call "
                "this BEFORE offering any times to the caller. You must "
                "convert the caller's natural language date (e.g. 'next "
                "Monday', 'tomorrow', 'March 10th') into YYYY-MM-DD "
                "format yourself before calling this tool. IMPORTANT: "
                "Only present up to 3 slots at a time to the caller to "
                "avoid overwhelming them. If they don't like those, offer "
                "the next batch from the remaining slots."
            ),
            "type": "webhook",
            "api_schema": {
                "url": webhook_url,
                "method": "POST",
                "request_headers": headers,
                "path_params_schema": {},
                "query_params_schema": None,
                "request_body_schema": {
                    "type": "object",
                    "description": "",
                    "required": ["tool_name", "date"],
                    "properties": {
                        "tool_name": _const_property("string", "get_available_slots"),
                        "agent_id": _dynamic_var_property("string", "el_agent_id"),
                        "date": _make_property("string", "Date to check in YYYY-MM-DD format"),
                        "duration_minutes": _make_property(
                            "integer",
                            "Desired appointment duration in minutes (default 30)",
                        ),
                    },
                },
                "content_type": "application/json",
                "auth_connection": None,
            },
        }
    }


async def _create_tool(body: dict) -> str:
    """Create a tool via POST /v1/convai/tools and return its ID."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"{_API_BASE}/convai/tools",
            json=body,
            headers=_headers(),
        )
        if resp.status_code not in (200, 201):
            logger.error(
                "ElevenLabs create tool failed: %d %s",
                resp.status_code,
                resp.text[:500],
            )
            resp.raise_for_status()
        data = resp.json()
        tool_id = data.get("id", "")
        logger.info(
            "ElevenLabs tool created: id=%s name=%s",
            tool_id,
            body.get("tool_config", {}).get("name"),
        )
        return tool_id


async def _list_tools() -> list[dict]:
    """List all tools in the workspace."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{_API_BASE}/convai/tools",
            headers=_headers(),
        )
        if resp.status_code != 200:
            logger.error("ElevenLabs list tools failed: %d", resp.status_code)
            return []
        data = resp.json()
        return data.get("tools", [])


async def _delete_tool(tool_id: str) -> None:
    """Delete a tool by ID."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.delete(
            f"{_API_BASE}/convai/tools/{tool_id}",
            headers=_headers(),
        )
        if resp.status_code in (200, 204):
            logger.info("ElevenLabs tool deleted: %s", tool_id)
        else:
            logger.warning(
                "ElevenLabs delete tool %s: %d",
                tool_id,
                resp.status_code,
            )


async def _update_tool(tool_id: str, body: dict) -> None:
    """Update an existing tool via PATCH."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.patch(
            f"{_API_BASE}/convai/tools/{tool_id}",
            json=body,
            headers=_headers(),
        )
        if resp.status_code not in (200, 201):
            logger.error(
                "ElevenLabs update tool %s failed: %d %s",
                tool_id,
                resp.status_code,
                resp.text[:300],
            )
        else:
            logger.info("ElevenLabs tool updated: %s", tool_id)


async def ensure_booking_tools(
    webhook_url: str,
    tool_secret: str = "",
) -> list[str]:
    """Ensure the two MattBot booking tools exist, creating if needed.

    Returns the list of tool IDs for [get_available_slots, book_appointment].
    """
    existing = await _list_tools()

    mattbot_tools: dict[str, str] = {}
    for t in existing:
        tc = t.get("tool_config", {})
        name = tc.get("name", "")
        if not name.startswith(_MATTBOT_TOOL_PREFIX):
            continue
        mattbot_tools[name] = t["id"]

    avail_name = f"{_MATTBOT_TOOL_PREFIX}get_available_slots"
    book_name = f"{_MATTBOT_TOOL_PREFIX}book_appointment"

    avail_body = _availability_tool_body(webhook_url, tool_secret)
    book_body = _booking_tool_body(webhook_url, tool_secret)

    if avail_name in mattbot_tools:
        await _update_tool(mattbot_tools[avail_name], avail_body)
        avail_id = mattbot_tools[avail_name]
    else:
        avail_id = await _create_tool(avail_body)

    if book_name in mattbot_tools:
        await _update_tool(mattbot_tools[book_name], book_body)
        book_id = mattbot_tools[book_name]
    else:
        book_id = await _create_tool(book_body)

    return [avail_id, book_id]


def build_booking_tool_config(webhook_base_url: str, tool_secret: str) -> dict:
    """Deprecated — use ensure_booking_tools() instead."""
    return _booking_tool_body(f"{webhook_base_url}/webhooks/elevenlabs/tool")


def build_availability_tool_config(
    webhook_base_url: str,
    tool_secret: str,
) -> dict:
    """Deprecated — use ensure_booking_tools() instead."""
    return _availability_tool_body(f"{webhook_base_url}/webhooks/elevenlabs/tool")


async def create_agent(
    name: str,
    system_prompt: str,
    first_message: str,
    *,
    voice_id: str | None = None,
    language: str = "en",
    max_duration_seconds: int = 180,
    temperament_preset: str = "professional_polite",
    silence_end_call_timeout: float = 30.0,
    custom_tools: list[dict] | None = None,
    tool_ids: list[str] | None = None,
) -> dict:
    """Create an ElevenLabs conversational agent. Returns the raw API response dict."""
    turn_eagerness = TURN_EAGERNESS_MAP.get(temperament_preset, "normal")

    prompt_cfg: dict = {"prompt": system_prompt}
    if tool_ids:
        prompt_cfg["tool_ids"] = tool_ids

    payload = {
        "name": name,
        "conversation_config": {
            "agent": {
                "prompt": prompt_cfg,
                "first_message": first_message,
                "language": language,
                "built_in_tools": {
                    "end_call": {
                        "type": "system",
                        "name": "end_call",
                        "params": {"system_tool_type": "end_call"},
                    },
                },
            },
            "tts": {},
            "conversation": {
                "max_duration_seconds": max_duration_seconds,
            },
            "turn": {
                "turn_eagerness": turn_eagerness,
                "silence_end_call_timeout": silence_end_call_timeout,
            },
        },
    }

    if voice_id:
        payload["conversation_config"]["tts"]["voice_id"] = voice_id

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"{_API_BASE}/convai/agents/create",
            json=payload,
            headers=_headers(),
        )
        if resp.status_code not in (200, 201):
            logger.error(
                "ElevenLabs create_agent failed: %d %s",
                resp.status_code,
                resp.text[:500],
            )
            resp.raise_for_status()
        data = resp.json()
        logger.info(
            "ElevenLabs agent created: id=%s name=%s",
            data.get("agent_id", "?"),
            name,
        )
        return data


async def update_agent(
    el_agent_id: str,
    *,
    system_prompt: str | None = None,
    first_message: str | None = None,
    voice_id: str | None = None,
    language: str | None = None,
    max_duration_seconds: int | None = None,
    temperament_preset: str | None = None,
    silence_end_call_timeout: float | None = None,
    enable_end_call_tool: bool = False,
    custom_tools: list[dict] | None = None,
    tool_ids: list[str] | None = None,
) -> dict:
    """Patch an existing ElevenLabs agent. Only non-None fields are sent."""
    payload: dict = {"conversation_config": {}}
    agent_cfg: dict = {}
    tts_cfg: dict = {}
    conv_cfg: dict = {}
    turn_cfg: dict = {}

    prompt_cfg: dict = {}
    if system_prompt is not None:
        prompt_cfg["prompt"] = system_prompt
    if tool_ids is not None:
        prompt_cfg["tool_ids"] = tool_ids
    if prompt_cfg:
        agent_cfg["prompt"] = prompt_cfg

    if first_message is not None:
        agent_cfg["first_message"] = first_message
    if language is not None:
        agent_cfg["language"] = language
    if enable_end_call_tool:
        agent_cfg["built_in_tools"] = {
            "end_call": {
                "type": "system",
                "name": "end_call",
                "params": {"system_tool_type": "end_call"},
            },
        }

    if voice_id is not None:
        tts_cfg["voice_id"] = voice_id

    if max_duration_seconds is not None:
        conv_cfg["max_duration_seconds"] = max_duration_seconds

    if temperament_preset is not None:
        turn_eagerness = TURN_EAGERNESS_MAP.get(temperament_preset, "normal")
        turn_cfg["turn_eagerness"] = turn_eagerness
    if silence_end_call_timeout is not None:
        turn_cfg["silence_end_call_timeout"] = silence_end_call_timeout

    if agent_cfg:
        payload["conversation_config"]["agent"] = agent_cfg
    if tts_cfg:
        payload["conversation_config"]["tts"] = tts_cfg
    if conv_cfg:
        payload["conversation_config"]["conversation"] = conv_cfg
    if turn_cfg:
        payload["conversation_config"]["turn"] = turn_cfg

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.patch(
            f"{_API_BASE}/convai/agents/{el_agent_id}",
            json=payload,
            headers=_headers(),
        )
        if resp.status_code not in (200, 201):
            logger.error(
                "ElevenLabs update_agent failed: %d %s",
                resp.status_code,
                resp.text[:500],
            )
            resp.raise_for_status()
        data = resp.json()
        logger.info("ElevenLabs agent updated: id=%s", el_agent_id)
        return data


async def delete_agent(el_agent_id: str) -> bool:
    """Delete an ElevenLabs agent. Returns True on success."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.delete(
            f"{_API_BASE}/convai/agents/{el_agent_id}",
            headers=_headers(),
        )
        if resp.status_code in (200, 204):
            logger.info("ElevenLabs agent deleted: id=%s", el_agent_id)
            return True
        logger.error(
            "ElevenLabs delete_agent failed: %d %s",
            resp.status_code,
            resp.text[:500],
        )
        return False


async def fetch_voices() -> list[dict]:
    """Fetch all voices from ElevenLabs GET /v1/voices."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{_API_BASE}/voices",
            headers=_headers(),
        )
        if resp.status_code != 200:
            logger.error("ElevenLabs fetch_voices failed: %d", resp.status_code)
            return []
        data = resp.json()
        voices = data.get("voices", [])
        return voices


async def sync_voice_catalog(db_session: object) -> int:
    """Sync voices from ElevenLabs into the local voice_catalog table.

    Returns the number of voices upserted.
    """
    from sqlalchemy import select as sa_select

    from app.models.voice_catalog import VoiceCatalog

    db = db_session

    remote_voices = await fetch_voices()
    if not remote_voices:
        return 0

    seen_provider_ids: set[str] = set()
    upserted = 0

    for v in remote_voices:
        provider_voice_id = v.get("voice_id", "")
        if not provider_voice_id:
            continue
        seen_provider_ids.add(provider_voice_id)

        existing = (
            await db.execute(
                sa_select(VoiceCatalog).where(VoiceCatalog.provider_voice_id == provider_voice_id)
            )
        ).scalar_one_or_none()

        display_name = v.get("name", "Unknown Voice")[:100]
        labels = v.get("labels", {})
        gender_tag = (labels.get("gender") or "")[:20] or None
        locale = (labels.get("accent") or "en")[:50]
        preview_url = v.get("preview_url", "")

        if existing:
            existing.display_name = display_name
            existing.gender_tag = gender_tag
            existing.locale = locale or "en"
            existing.preview_url = preview_url
            existing.is_active = True
        else:
            entry = VoiceCatalog(
                provider_voice_id=provider_voice_id,
                display_name=display_name,
                gender_tag=gender_tag,
                locale=locale or "en",
                preview_url=preview_url,
                is_active=True,
            )
            db.add(entry)
        upserted += 1

    all_local = (await db.execute(sa_select(VoiceCatalog))).scalars().all()
    for local_voice in all_local:
        if local_voice.provider_voice_id not in seen_provider_ids:
            local_voice.is_active = False

    await db.flush()
    logger.info("Voice catalog synced: %d voices upserted", upserted)
    return upserted


async def fetch_conversation_audio(conversation_id: str) -> bytes | None:
    """Fetch recording audio from ElevenLabs for a conversation."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(
            f"{_API_BASE}/convai/conversations/{conversation_id}/audio",
            headers=_headers(),
        )
        if resp.status_code == 200:
            return resp.content
        logger.warning(
            "ElevenLabs audio fetch returned %d for %s",
            resp.status_code,
            conversation_id[:12],
        )
        return None
