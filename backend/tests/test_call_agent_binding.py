"""Test call-agent relationship via CallAiSession."""

import uuid
from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.call import Call
from app.models.call_ai_session import CallAiSession
from app.services import call_service


@pytest.mark.asyncio
async def test_call_ai_session_binds_call_to_agent(db: AsyncSession):
    """A CallAiSession links a call to an agent."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222", "CA_bind_001"
    )
    agent = Agent(user_id=user_id, name="Bound Agent")
    db.add(agent)
    await db.flush()

    session = CallAiSession(
        call_id=call.id,
        agent_id=agent.id,
        status="active",
    )
    db.add(session)
    await db.flush()

    result = await db.execute(
        select(CallAiSession).where(CallAiSession.call_id == call.id)
    )
    saved = result.scalars().first()
    assert saved is not None
    assert saved.agent_id == agent.id
    assert saved.status == "active"


@pytest.mark.asyncio
async def test_call_ai_session_without_agent(db: AsyncSession):
    """A CallAiSession can exist without an agent (agent_id is nullable)."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )

    session = CallAiSession(
        call_id=call.id,
        agent_id=None,
        status="active",
    )
    db.add(session)
    await db.flush()

    result = await db.execute(
        select(CallAiSession).where(CallAiSession.call_id == call.id)
    )
    saved = result.scalars().first()
    assert saved is not None
    assert saved.agent_id is None


@pytest.mark.asyncio
async def test_call_ai_session_with_elevenlabs_id(db: AsyncSession):
    """CallAiSession stores the ElevenLabs conversation ID."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )

    session = CallAiSession(
        call_id=call.id,
        elevenlabs_conversation_id="conv_abc123",
        status="active",
    )
    db.add(session)
    await db.flush()

    result = await db.execute(
        select(CallAiSession).where(CallAiSession.call_id == call.id)
    )
    saved = result.scalars().first()
    assert saved.elevenlabs_conversation_id == "conv_abc123"


@pytest.mark.asyncio
async def test_multiple_sessions_per_call(db: AsyncSession):
    """A call can have multiple AI sessions (e.g. retry after failure)."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )

    s1 = CallAiSession(call_id=call.id, status="failed")
    s2 = CallAiSession(call_id=call.id, status="active")
    db.add_all([s1, s2])
    await db.flush()

    result = await db.execute(
        select(CallAiSession).where(CallAiSession.call_id == call.id)
    )
    sessions = list(result.scalars().all())
    assert len(sessions) == 2
    statuses = {s.status for s in sessions}
    assert "active" in statuses
    assert "failed" in statuses


@pytest.mark.asyncio
async def test_session_ended_state(db: AsyncSession):
    """A CallAiSession can transition to ended."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )

    session = CallAiSession(call_id=call.id, status="active")
    db.add(session)
    await db.flush()

    session.status = "ended"
    await db.flush()

    result = await db.execute(
        select(CallAiSession).where(CallAiSession.id == session.id)
    )
    saved = result.scalars().first()
    assert saved.status == "ended"
