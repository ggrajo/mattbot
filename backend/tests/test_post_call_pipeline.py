"""Test post-call artifact generation pipeline."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.call import Call
from app.services import call_service


@pytest.mark.asyncio
async def test_end_call_sets_ended_status(db: AsyncSession):
    """Ending a call transitions it to 'ended' and sets ended_at."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222", "CA_post_001"
    )
    await call_service.transition_call(db, call.id, "call_answered", "answered")

    ended = await call_service.end_call(db, call.id, "normal_hangup", 60)
    assert ended.status == "ended"
    assert ended.ended_at is not None
    assert ended.ended_reason == "normal_hangup"
    assert ended.duration_seconds == 60


@pytest.mark.asyncio
async def test_end_call_without_duration(db: AsyncSession):
    """end_call works even without duration_seconds."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "call_answered", "answered")

    ended = await call_service.end_call(db, call.id, "timeout")
    assert ended.status == "ended"
    assert ended.duration_seconds is None


@pytest.mark.asyncio
async def test_end_already_ended_call_fails(db: AsyncSession):
    """Cannot end a call that's already ended."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "call_answered", "answered")
    await call_service.end_call(db, call.id, "hangup")

    with pytest.raises(AppError) as exc_info:
        await call_service.end_call(db, call.id, "double_end")
    assert exc_info.value.code == "INVALID_TRANSITION"


@pytest.mark.asyncio
async def test_end_call_from_in_progress(db: AsyncSession):
    """in_progress -> ended is a valid post-call path."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "call_answered", "answered")
    await call_service.transition_call(db, call.id, "started", "in_progress")

    ended = await call_service.end_call(db, call.id, "agent_hangup", 120)
    assert ended.status == "ended"
    assert ended.ended_reason == "agent_hangup"


@pytest.mark.asyncio
async def test_post_call_creates_event(db: AsyncSession):
    """Ending a call creates a call_ended event."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "call_answered", "answered")
    await call_service.end_call(db, call.id, "completed", 30)

    await db.refresh(call, ["events"])
    event_types = [e.event_type for e in call.events]
    assert "call_ended" in event_types
