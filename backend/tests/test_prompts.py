"""Tests for system prompt building in agent service and prompts module."""

import uuid

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.agent_service import AgentService
from app.services.prompts import (
    build_system_prompt,
    _identity_section,
    _user_preferences_section,
    _call_mode_section,
    _guidelines_section,
    PERSONALITY_DESCRIPTORS,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_agent(**overrides):
    agent = MagicMock()
    agent.id = overrides.get("id", uuid.uuid4())
    agent.user_id = overrides.get("user_id", uuid.uuid4())
    agent.system_prompt = overrides.get("system_prompt", "You are MattBot.")
    agent.language = overrides.get("language", "English")
    agent.personality = overrides.get("personality", "professional")
    agent.name = overrides.get("name", "MattBot")
    return agent


def _make_user(**overrides):
    user = MagicMock()
    user.id = overrides.get("id", uuid.uuid4())
    user.display_name = overrides.get("display_name", "Alice")
    user.default_timezone = overrides.get("default_timezone", "UTC")
    return user


def _mock_db_no_results():
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.scalar = AsyncMock(return_value=None)
    return mock_db


# ---------------------------------------------------------------------------
# AgentService.build_system_prompt tests (legacy interface)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_build_system_prompt_basic():
    agent = _make_agent()
    user = _make_user(display_name="Alice")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    prompt = await AgentService.build_system_prompt(mock_db, agent, user)
    assert "MattBot" in prompt or "You are" in prompt
    assert "Alice" in prompt
    assert "English" in prompt


@pytest.mark.asyncio
async def test_prompt_includes_calendar():
    """If a calendar config is present, it should appear in the prompt."""
    agent = _make_agent()
    user = _make_user()

    mock_config = MagicMock()
    mock_config.config_key = "calendar_connected"
    mock_config.config_value = "Google Calendar (alice@gmail.com)"

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_config]
    mock_db.execute = AsyncMock(return_value=mock_result)

    prompt = await AgentService.build_system_prompt(mock_db, agent, user)
    assert "calendar_connected" in prompt
    assert "Google Calendar" in prompt


@pytest.mark.asyncio
async def test_prompt_includes_memory():
    """Agent config entries for memory context should appear in prompt."""
    agent = _make_agent()
    user = _make_user()

    mock_config = MagicMock()
    mock_config.config_key = "memory_context"
    mock_config.config_value = "User prefers morning meetings."

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_config]
    mock_db.execute = AsyncMock(return_value=mock_result)

    prompt = await AgentService.build_system_prompt(mock_db, agent, user)
    assert "memory_context" in prompt
    assert "morning meetings" in prompt


@pytest.mark.asyncio
async def test_prompt_no_leak_between_users():
    """Two different users' prompts should not contain each other's data."""
    agent_a = _make_agent(system_prompt="Agent for Alice")
    user_a = _make_user(display_name="Alice")

    agent_b = _make_agent(system_prompt="Agent for Bob")
    user_b = _make_user(display_name="Bob")

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    prompt_a = await AgentService.build_system_prompt(mock_db, agent_a, user_a)
    prompt_b = await AgentService.build_system_prompt(mock_db, agent_b, user_b)

    assert "Alice" in prompt_a
    assert "Bob" not in prompt_a
    assert "Bob" in prompt_b
    assert "Alice" not in prompt_b


# ---------------------------------------------------------------------------
# prompts.build_system_prompt tests (enhanced natural-conversation builder)
# ---------------------------------------------------------------------------

class TestIdentitySection:
    def test_default_identity(self):
        section = _identity_section(
            agent_name=None, personality=None, language=None, base_prompt=None
        )
        assert "MattBot" in section
        assert "polished" in section  # professional personality

    def test_custom_agent_name(self):
        section = _identity_section(
            agent_name="JarvisBot", personality=None, language=None, base_prompt=None
        )
        assert "JarvisBot" in section
        assert "MattBot" not in section

    def test_friendly_personality(self):
        section = _identity_section(
            agent_name=None, personality="friendly", language=None, base_prompt=None
        )
        assert "warm" in section

    def test_language_included_when_not_english(self):
        section = _identity_section(
            agent_name=None, personality=None, language="Spanish", base_prompt=None
        )
        assert "Spanish" in section

    def test_language_omitted_for_english(self):
        section = _identity_section(
            agent_name=None, personality=None, language="en", base_prompt=None
        )
        assert "Speak in" not in section

    def test_base_prompt_appended(self):
        section = _identity_section(
            agent_name=None, personality=None, language=None,
            base_prompt="Always ask for the caller's name first."
        )
        assert "Always ask for the caller's name first." in section

    def test_all_personalities_have_descriptors(self):
        for key in ("professional", "friendly", "formal", "casual"):
            assert key in PERSONALITY_DESCRIPTORS


class TestUserPreferencesSection:
    def test_includes_display_name(self):
        section = _user_preferences_section(display_name="Alice", timezone="UTC")
        assert "Alice" in section

    def test_fallback_when_no_name(self):
        section = _user_preferences_section(display_name=None, timezone="UTC")
        assert "the subscriber" in section

    def test_includes_timezone(self):
        section = _user_preferences_section(
            display_name="Bob", timezone="America/New_York"
        )
        assert "America/New_York" in section

    def test_defaults_to_utc(self):
        section = _user_preferences_section(display_name="Bob", timezone=None)
        assert "UTC" in section


class TestCallModeSection:
    def test_screen_mode(self):
        section = _call_mode_section("screen")
        assert "SCREENING" in section

    def test_assistant_mode(self):
        section = _call_mode_section("assistant")
        assert "ASSISTANT" in section

    def test_away_mode(self):
        section = _call_mode_section("away")
        assert "AWAY" in section
        assert "unavailable" in section

    def test_dnd_mode(self):
        section = _call_mode_section("dnd")
        assert "DO NOT DISTURB" in section

    def test_unknown_mode_fallback(self):
        section = _call_mode_section("custom_mode")
        assert "custom_mode" in section


class TestGuidelinesSection:
    def test_guidelines_present(self):
        section = _guidelines_section()
        assert "naturally" in section
        assert "concise" in section
        assert "memory" in section.lower()


@pytest.mark.asyncio
async def test_full_prompt_assembly_minimal():
    """Minimal call: no calendar, no memory, no call mode."""
    mock_db = _mock_db_no_results()
    user_id = uuid.uuid4()

    prompt = await build_system_prompt(
        mock_db,
        user_id,
        base_prompt="Handle calls professionally.",
        agent_name="TestBot",
        personality="professional",
        user_display_name="Alice",
        user_timezone="UTC",
    )
    assert "TestBot" in prompt
    assert "Alice" in prompt
    assert "Guidelines" in prompt
    assert "Handle calls professionally." in prompt


@pytest.mark.asyncio
async def test_full_prompt_includes_call_mode():
    """Call mode section should appear when provided."""
    mock_db = _mock_db_no_results()

    prompt = await build_system_prompt(
        mock_db,
        uuid.uuid4(),
        agent_name="MattBot",
        user_display_name="Alice",
        call_mode="screen",
    )
    assert "SCREENING" in prompt


@pytest.mark.asyncio
async def test_full_prompt_no_caller_memory_without_hash():
    """Without a caller_phone_hash, no memory section should appear."""
    mock_db = _mock_db_no_results()

    prompt = await build_system_prompt(
        mock_db,
        uuid.uuid4(),
        agent_name="MattBot",
        user_display_name="Alice",
    )
    assert "[CALLER MEMORY]" not in prompt


@pytest.mark.asyncio
async def test_full_prompt_isolation_between_users():
    """Two users get different prompts with no cross-contamination."""
    mock_db = _mock_db_no_results()

    prompt_a = await build_system_prompt(
        mock_db, uuid.uuid4(),
        user_display_name="Alice", user_timezone="US/Eastern",
    )
    prompt_b = await build_system_prompt(
        mock_db, uuid.uuid4(),
        user_display_name="Bob", user_timezone="Europe/London",
    )

    assert "Alice" in prompt_a
    assert "Bob" not in prompt_a
    assert "Bob" in prompt_b
    assert "Alice" not in prompt_b


@pytest.mark.asyncio
async def test_prompt_with_memory_section():
    """When caller memories exist, they should appear in the prompt."""
    user_id = uuid.uuid4()
    phone_hash = "abc123"

    mock_memory = MagicMock()
    mock_memory.caller_name = "Dave"
    mock_memory.memory_type = "preference"
    mock_memory.content = "Prefers morning calls"
    mock_memory.importance = 5

    mock_db = AsyncMock()
    mock_result = MagicMock()

    # _calendar_section query returns no token
    cal_result = MagicMock()
    cal_result.scalars.return_value.first.return_value = None

    # _memory_section query returns our mock memory
    mem_result = MagicMock()
    mem_result.scalars.return_value.all.return_value = [mock_memory]

    mock_db.execute = AsyncMock(side_effect=[cal_result, mem_result])

    prompt = await build_system_prompt(
        mock_db,
        user_id,
        caller_phone_hash=phone_hash,
        agent_name="MattBot",
        user_display_name="Alice",
    )

    assert "[CALLER MEMORY]" in prompt
    assert "Dave" in prompt
    assert "morning calls" in prompt
