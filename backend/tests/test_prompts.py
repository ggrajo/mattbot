"""Tests for system prompt building in agent service."""

import uuid

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.agent_service import AgentService


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
