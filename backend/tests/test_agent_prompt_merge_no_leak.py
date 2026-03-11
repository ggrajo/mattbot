"""Test that agent prompts don't leak between users."""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent


@pytest.mark.asyncio
async def test_agents_isolated_per_user(db: AsyncSession):
    """Querying agents by user_id only returns that user's agents."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()

    agent_a = Agent(
        user_id=user_a,
        name="Agent A",
        system_prompt="Secret prompt for user A",
    )
    agent_b = Agent(
        user_id=user_b,
        name="Agent B",
        system_prompt="Secret prompt for user B",
    )
    db.add_all([agent_a, agent_b])
    await db.flush()

    result_a = await db.execute(select(Agent).where(Agent.user_id == user_a))
    agents_a = list(result_a.scalars().all())
    assert len(agents_a) == 1
    assert agents_a[0].system_prompt == "Secret prompt for user A"
    assert agents_a[0].name == "Agent A"

    result_b = await db.execute(select(Agent).where(Agent.user_id == user_b))
    agents_b = list(result_b.scalars().all())
    assert len(agents_b) == 1
    assert agents_b[0].system_prompt == "Secret prompt for user B"
    assert agents_b[0].name == "Agent B"


@pytest.mark.asyncio
async def test_user_cannot_access_other_user_prompt(db: AsyncSession):
    """Explicitly verify that user A's query cannot return user B's prompt."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()

    agent_b = Agent(
        user_id=user_b,
        name="B's Private Agent",
        system_prompt="This is B's private system prompt",
    )
    db.add(agent_b)
    await db.flush()

    result = await db.execute(select(Agent).where(Agent.user_id == user_a))
    agents = list(result.scalars().all())
    assert len(agents) == 0

    for a in agents:
        assert a.system_prompt != "This is B's private system prompt"


@pytest.mark.asyncio
async def test_agent_update_does_not_affect_other_user(db: AsyncSession):
    """Updating user A's agent doesn't change user B's agent."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()

    agent_a = Agent(
        user_id=user_a,
        name="Shared Name",
        system_prompt="Original A",
    )
    agent_b = Agent(
        user_id=user_b,
        name="Shared Name",
        system_prompt="Original B",
    )
    db.add_all([agent_a, agent_b])
    await db.flush()

    agent_a.system_prompt = "Updated A prompt"
    await db.flush()

    result = await db.execute(select(Agent).where(Agent.user_id == user_b))
    b = result.scalars().first()
    assert b.system_prompt == "Original B"


@pytest.mark.asyncio
async def test_multiple_agents_same_user_no_prompt_bleed(db: AsyncSession):
    """Different agents for the same user keep separate prompts."""
    user_id = uuid.uuid4()

    agent_1 = Agent(
        user_id=user_id,
        name="Work Agent",
        system_prompt="Professional tone",
    )
    agent_2 = Agent(
        user_id=user_id,
        name="Personal Agent",
        system_prompt="Casual tone",
    )
    db.add_all([agent_1, agent_2])
    await db.flush()

    result = await db.execute(
        select(Agent).where(Agent.user_id == user_id).order_by(Agent.name)
    )
    agents = list(result.scalars().all())
    assert len(agents) == 2
    prompts = {a.name: a.system_prompt for a in agents}
    assert prompts["Personal Agent"] == "Casual tone"
    assert prompts["Work Agent"] == "Professional tone"
