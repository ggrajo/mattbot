"""Tests for call state machine transitions."""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.call import Call
from app.services import call_service


@pytest.mark.asyncio
async def test_create_call(db: AsyncSession):
    """create_call produces a Call in 'ringing' status with an initial event."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222", "CA_sm_001"
    )
    assert call.status == "ringing"
    assert call.from_number == "+15551111111"
    assert call.twilio_call_sid == "CA_sm_001"


@pytest.mark.asyncio
async def test_transition_ringing_to_answered(db: AsyncSession):
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    updated = await call_service.transition_call(
        db, call.id, "call_answered", "answered"
    )
    assert updated.status == "answered"
    assert updated.answered_at is not None


@pytest.mark.asyncio
async def test_transition_ringing_to_missed(db: AsyncSession):
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    updated = await call_service.transition_call(
        db, call.id, "call_missed", "missed"
    )
    assert updated.status == "missed"


@pytest.mark.asyncio
async def test_transition_answered_to_in_progress(db: AsyncSession):
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "call_answered", "answered")
    updated = await call_service.transition_call(
        db, call.id, "screening_started", "in_progress"
    )
    assert updated.status == "in_progress"


@pytest.mark.asyncio
async def test_transition_in_progress_to_ended(db: AsyncSession):
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "call_answered", "answered")
    await call_service.transition_call(db, call.id, "started", "in_progress")
    updated = await call_service.transition_call(
        db, call.id, "call_ended", "ended"
    )
    assert updated.status == "ended"
    assert updated.ended_at is not None


@pytest.mark.asyncio
async def test_invalid_transition_raises(db: AsyncSession):
    """Attempting an illegal transition raises AppError."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    with pytest.raises(AppError) as exc_info:
        await call_service.transition_call(
            db, call.id, "bad_event", "ended"
        )
    assert exc_info.value.code == "INVALID_TRANSITION"


@pytest.mark.asyncio
async def test_invalid_transition_missed_to_answered(db: AsyncSession):
    """Once missed, cannot answer."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "call_missed", "missed")
    with pytest.raises(AppError) as exc_info:
        await call_service.transition_call(
            db, call.id, "late_answer", "answered"
        )
    assert exc_info.value.code == "INVALID_TRANSITION"


@pytest.mark.asyncio
async def test_end_call(db: AsyncSession):
    """end_call sets reason, duration, and ended timestamp."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    await call_service.transition_call(db, call.id, "call_answered", "answered")
    ended = await call_service.end_call(db, call.id, "caller_hangup", duration_seconds=30)
    assert ended.status == "ended"
    assert ended.ended_reason == "caller_hangup"
    assert ended.duration_seconds == 30


@pytest.mark.asyncio
async def test_end_call_from_ringing_fails(db: AsyncSession):
    """Cannot end a call that is still ringing (not in allowed transitions)."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    with pytest.raises(AppError) as exc_info:
        await call_service.end_call(db, call.id, "timeout")
    assert exc_info.value.code == "INVALID_TRANSITION"


@pytest.mark.asyncio
async def test_twilio_status_callback_transitions(db: AsyncSession):
    """handle_twilio_status_callback maps Twilio statuses and transitions."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222", "CA_cb_001"
    )
    assert call.status == "ringing"

    updated = await call_service.handle_twilio_status_callback(
        db, "CA_cb_001", "no-answer"
    )
    assert updated.status == "missed"


@pytest.mark.asyncio
async def test_screening_to_answered(db: AsyncSession):
    """screening -> answered is a valid transition (future AI screening)."""
    user_id = uuid.uuid4()
    call = await call_service.create_call(
        db, user_id, "+15551111111", "+15552222222"
    )
    call.status = "screening"
    await db.flush()

    updated = await call_service.transition_call(
        db, call.id, "screening_complete", "answered"
    )
    assert updated.status == "answered"
