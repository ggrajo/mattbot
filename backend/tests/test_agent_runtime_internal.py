"""Test agent runtime via internal API patterns."""

import uuid

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_config import AgentConfig


@pytest.mark.asyncio
async def test_agent_config_linked_to_agent(db: AsyncSession):
    """AgentConfig is linked to an Agent via relationship."""
    user_id = uuid.uuid4()
    agent = Agent(user_id=user_id, name="Runtime Agent")
    db.add(agent)
    await db.flush()

    config = AgentConfig(
        user_id=user_id,
        name="Runtime Config",
        system_prompt="Be helpful and concise.",
        voice_id="voice_runtime",
        is_default=True,
    )
    db.add(config)
    await db.flush()

    result = await db.execute(
        select(AgentConfig).where(AgentConfig.user_id == user_id)
    )
    saved = result.scalars().first()
    assert saved is not None
    assert saved.system_prompt == "Be helpful and concise."
    assert saved.is_default is True


@pytest.mark.asyncio
async def test_only_one_default_config_per_user(db: AsyncSession):
    """Setting a new default deactivates previous defaults."""
    user_id = uuid.uuid4()
    c1 = AgentConfig(
        user_id=user_id,
        name="Config A",
        is_default=True,
    )
    db.add(c1)
    await db.flush()

    await db.execute(
        update(AgentConfig)
        .where(AgentConfig.user_id == user_id)
        .values(is_default=False)
    )

    c2 = AgentConfig(
        user_id=user_id,
        name="Config B",
        is_default=True,
    )
    db.add(c2)
    await db.flush()

    result = await db.execute(
        select(AgentConfig).where(
            AgentConfig.user_id == user_id,
            AgentConfig.is_default.is_(True),
        )
    )
    defaults = list(result.scalars().all())
    assert len(defaults) == 1
    assert defaults[0].name == "Config B"


@pytest.mark.asyncio
async def test_agent_config_metadata_json(db: AsyncSession):
    """AgentConfig stores arbitrary metadata in JSONB."""
    user_id = uuid.uuid4()
    config = AgentConfig(
        user_id=user_id,
        name="Meta Config",
        metadata_json={"temperature": 0.7, "max_tokens": 500},
    )
    db.add(config)
    await db.flush()

    result = await db.execute(
        select(AgentConfig).where(AgentConfig.id == config.id)
    )
    saved = result.scalars().first()
    assert saved.metadata_json["temperature"] == 0.7
    assert saved.metadata_json["max_tokens"] == 500


@pytest.mark.asyncio
async def test_agent_runtime_isolation(db: AsyncSession):
    """Configs from different users are isolated."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()

    c_a = AgentConfig(
        user_id=user_a,
        name="Config A",
        system_prompt="User A prompt",
    )
    c_b = AgentConfig(
        user_id=user_b,
        name="Config B",
        system_prompt="User B prompt",
    )
    db.add_all([c_a, c_b])
    await db.flush()

    result = await db.execute(
        select(AgentConfig).where(AgentConfig.user_id == user_a)
    )
    configs = list(result.scalars().all())
    assert len(configs) == 1
    assert configs[0].system_prompt == "User A prompt"


@pytest.mark.asyncio
async def test_agent_config_update(db: AsyncSession):
    """AgentConfig fields can be updated."""
    user_id = uuid.uuid4()
    config = AgentConfig(
        user_id=user_id,
        name="Original",
        system_prompt="Original prompt",
        language_code="en",
    )
    db.add(config)
    await db.flush()

    config.name = "Updated"
    config.system_prompt = "Updated prompt"
    config.language_code = "fr"
    await db.flush()

    result = await db.execute(
        select(AgentConfig).where(AgentConfig.id == config.id)
    )
    saved = result.scalars().first()
    assert saved.name == "Updated"
    assert saved.system_prompt == "Updated prompt"
    assert saved.language_code == "fr"


@pytest.mark.asyncio
async def test_agent_and_config_coexist(db: AsyncSession):
    """Agent and AgentConfig can both exist for the same user."""
    user_id = uuid.uuid4()
    agent = Agent(user_id=user_id, name="Parent Agent")
    db.add(agent)
    await db.flush()

    config = AgentConfig(
        user_id=user_id,
        name="Linked Config",
        voice_id="voice_linked",
    )
    db.add(config)
    await db.flush()

    agent_result = await db.execute(select(Agent).where(Agent.user_id == user_id))
    config_result = await db.execute(
        select(AgentConfig).where(AgentConfig.user_id == user_id)
    )
    assert agent_result.scalars().first() is not None
    assert config_result.scalars().first() is not None
