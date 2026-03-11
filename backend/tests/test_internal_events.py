"""Test internal events API."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.call import Call
from app.services import call_service


@pytest.mark.asyncio
async def test_bridge_event_call_answered(db: AsyncSession):
    """Bridge event transitions call from ringing to answered."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222", "CA_int_001"
    )
    assert call.status == "ringing"

    updated = await call_service.transition_call(
        db, call.id, "bridge_answered", "answered"
    )
    assert updated.status == "answered"
    assert updated.answered_at is not None


@pytest.mark.asyncio
async def test_bridge_event_call_in_progress(db: AsyncSession):
    """Bridge event transitions call to in_progress."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "bridge_answered", "answered")

    updated = await call_service.transition_call(
        db, call.id, "bridge_in_progress", "in_progress"
    )
    assert updated.status == "in_progress"


@pytest.mark.asyncio
async def test_bridge_event_end_call(db: AsyncSession):
    """Bridge end_call event properly ends the call."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "bridge_answered", "answered")

    ended = await call_service.end_call(db, call.id, "bridge_ended", 90)
    assert ended.status == "ended"
    assert ended.ended_reason == "bridge_ended"
    assert ended.duration_seconds == 90


@pytest.mark.asyncio
async def test_bridge_event_invalid_transition(db: AsyncSession):
    """Bridge event with invalid transition raises error."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    with pytest.raises(AppError) as exc_info:
        await call_service.transition_call(
            db, call.id, "bridge_in_progress", "in_progress"
        )
    assert exc_info.value.code == "INVALID_TRANSITION"


@pytest.mark.asyncio
async def test_bridge_event_nonexistent_call(db: AsyncSession):
    """Bridge event for nonexistent call raises 404."""
    fake_id = uuid.uuid4()
    with pytest.raises(AppError) as exc_info:
        await call_service.transition_call(
            db, fake_id, "bridge_answered", "answered"
        )
    assert exc_info.value.code == "CALL_NOT_FOUND"


@pytest.mark.asyncio
async def test_bridge_event_creates_call_event(db: AsyncSession):
    """Bridge events create CallEvent records."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "bridge_answered", "answered")

    await db.refresh(call, ["events"])
    event_types = [e.event_type for e in call.events]
    assert "call_created" in event_types
    assert "bridge_answered" in event_types
