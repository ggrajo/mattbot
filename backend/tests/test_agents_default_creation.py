"""Test default agent creation."""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent


@pytest.mark.asyncio
async def test_create_default_agent(db: AsyncSession):
    """Creating an agent with default values persists correctly."""
    user_id = uuid.uuid4()
    agent = Agent(
        user_id=user_id,
        name="MattBot",
        language="en",
        personality="professional",
    )
    db.add(agent)
    await db.flush()

    result = await db.execute(select(Agent).where(Agent.user_id == user_id))
    saved = result.scalars().first()
    assert saved is not None
    assert saved.name == "MattBot"
    assert saved.language == "en"
    assert saved.personality == "professional"
    assert saved.is_active is True


@pytest.mark.asyncio
async def test_create_agent_with_custom_fields(db: AsyncSession):
    """Agent with custom prompt and greeting is stored correctly."""
    user_id = uuid.uuid4()
    agent = Agent(
        user_id=user_id,
        name="Custom Agent",
        system_prompt="You are a helpful assistant.",
        greeting_message="Hi there! How can I help?",
        voice_id="voice_abc123",
        language="es",
        personality="friendly",
    )
    db.add(agent)
    await db.flush()

    result = await db.execute(select(Agent).where(Agent.user_id == user_id))
    saved = result.scalars().first()
    assert saved.name == "Custom Agent"
    assert saved.system_prompt == "You are a helpful assistant."
    assert saved.greeting_message == "Hi there! How can I help?"
    assert saved.voice_id == "voice_abc123"
    assert saved.language == "es"


@pytest.mark.asyncio
async def test_create_multiple_agents(db: AsyncSession):
    """User can have multiple agents."""
    user_id = uuid.uuid4()
    for i in range(3):
        agent = Agent(
            user_id=user_id,
            name=f"Agent {i}",
            language="en",
            personality="professional",
        )
        db.add(agent)
    await db.flush()

    result = await db.execute(select(Agent).where(Agent.user_id == user_id))
    agents = list(result.scalars().all())
    assert len(agents) == 3


@pytest.mark.asyncio
async def test_agent_default_is_active(db: AsyncSession):
    """New agents default to is_active=True."""
    user_id = uuid.uuid4()
    agent = Agent(user_id=user_id, name="Test")
    db.add(agent)
    await db.flush()

    result = await db.execute(select(Agent).where(Agent.id == agent.id))
    saved = result.scalars().first()
    assert saved.is_active is True


@pytest.mark.asyncio
async def test_agent_timestamps(db: AsyncSession):
    """Agent has created_at and updated_at timestamps."""
    user_id = uuid.uuid4()
    agent = Agent(user_id=user_id, name="Timestamp Test")
    db.add(agent)
    await db.flush()

    result = await db.execute(select(Agent).where(Agent.id == agent.id))
    saved = result.scalars().first()
    assert saved.created_at is not None
    assert saved.updated_at is not None
