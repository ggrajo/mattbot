"""Call service – state machine, CRUD, and Twilio status mapping."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.call import Call
from app.models.call_event import CallEvent

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[str, set[str]] = {
    "ringing": {"answered", "missed", "rejected"},
    "answered": {"in_progress", "ended"},
    "in_progress": {"ended"},
    "screening": {"answered", "ended"},
}

TWILIO_STATUS_MAP: dict[str, str] = {
    "ringing": "ringing",
    "in-progress": "in_progress",
    "completed": "ended",
    "busy": "missed",
    "no-answer": "missed",
    "canceled": "missed",
    "failed": "ended",
}


async def create_call(
    db: AsyncSession,
    user_id: uuid.UUID,
    from_number: str,
    to_number: str,
    twilio_call_sid: str | None = None,
    direction: str = "inbound",
) -> Call:
    call = Call(
        user_id=user_id,
        twilio_call_sid=twilio_call_sid,
        from_number=from_number,
        to_number=to_number,
        direction=direction,
        status="ringing",
        started_at=datetime.now(UTC),
    )
    db.add(call)

    event = CallEvent(
        call_id=call.id,
        event_type="call_created",
        from_status=None,
        to_status="ringing",
    )
    db.add(event)
    await db.flush()
    return call


async def transition_call(
    db: AsyncSession,
    call_id: uuid.UUID,
    event_type: str,
    to_status: str,
    metadata: dict | None = None,
) -> Call:
    call = await db.get(Call, call_id)
    if call is None:
        raise AppError("CALL_NOT_FOUND", "Call not found", 404)

    allowed = VALID_TRANSITIONS.get(call.status, set())
    if to_status not in allowed:
        raise AppError(
            "INVALID_TRANSITION",
            f"Cannot transition from '{call.status}' to '{to_status}'",
            422,
        )

    from_status = call.status
    call.status = to_status

    if to_status == "answered" and call.answered_at is None:
        call.answered_at = datetime.now(UTC)

    if to_status == "ended":
        call.ended_at = datetime.now(UTC)

    event = CallEvent(
        call_id=call.id,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        metadata_json=metadata,
    )
    db.add(event)
    await db.flush()
    return call


async def get_call(
    db: AsyncSession,
    call_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Call:
    call = await db.get(Call, call_id)
    if call is None or call.user_id != user_id:
        raise AppError("CALL_NOT_FOUND", "Call not found", 404)
    return call


async def list_calls(
    db: AsyncSession,
    user_id: uuid.UUID,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Call], int]:
    base = select(Call).where(Call.user_id == user_id)
    if status:
        base = base.where(Call.status == status)

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    rows_q = base.order_by(Call.started_at.desc()).limit(limit).offset(offset)
    result = await db.execute(rows_q)
    calls = list(result.scalars().all())

    return calls, total


async def end_call(
    db: AsyncSession,
    call_id: uuid.UUID,
    reason: str,
    duration_seconds: int | None = None,
) -> Call:
    call = await db.get(Call, call_id)
    if call is None:
        raise AppError("CALL_NOT_FOUND", "Call not found", 404)

    allowed = VALID_TRANSITIONS.get(call.status, set())
    if "ended" not in allowed:
        raise AppError(
            "INVALID_TRANSITION",
            f"Cannot end call in '{call.status}' state",
            422,
        )

    from_status = call.status
    call.status = "ended"
    call.ended_reason = reason
    call.ended_at = datetime.now(UTC)
    if duration_seconds is not None:
        call.duration_seconds = duration_seconds

    event = CallEvent(
        call_id=call.id,
        event_type="call_ended",
        from_status=from_status,
        to_status="ended",
        metadata_json={"reason": reason, "duration_seconds": duration_seconds},
    )
    db.add(event)
    await db.flush()
    return call


async def delete_call(
    db: AsyncSession,
    call_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete a call, enforcing user ownership.

    Hard-deletes the call row; cascade removes associated call_events.
    """
    call = await db.get(Call, call_id)
    if call is None:
        raise AppError("CALL_NOT_FOUND", "Call not found", 404)
    if call.user_id != user_id:
        raise AppError("CALL_NOT_FOUND", "Call not found", 404)

    await db.delete(call)
    await db.flush()


async def handle_twilio_status_callback(
    db: AsyncSession,
    twilio_call_sid: str,
    twilio_status: str,
    duration: int | None = None,
) -> Call:
    result = await db.execute(
        select(Call).where(Call.twilio_call_sid == twilio_call_sid)
    )
    call = result.scalars().first()
    if call is None:
        raise AppError("CALL_NOT_FOUND", f"No call for SID {twilio_call_sid}", 404)

    mapped_status = TWILIO_STATUS_MAP.get(twilio_status)
    if mapped_status is None:
        logger.warning("Unknown Twilio status: %s", twilio_status)
        return call

    if mapped_status == call.status:
        return call

    allowed = VALID_TRANSITIONS.get(call.status, set())
    if mapped_status not in allowed:
        logger.warning(
            "Ignoring invalid Twilio transition %s -> %s for call %s",
            call.status,
            mapped_status,
            call.id,
        )
        return call

    from_status = call.status
    call.status = mapped_status

    if mapped_status == "answered" and call.answered_at is None:
        call.answered_at = datetime.now(UTC)

    if mapped_status == "ended":
        call.ended_at = datetime.now(UTC)
        call.ended_reason = twilio_status
        if duration is not None:
            call.duration_seconds = duration

    event = CallEvent(
        call_id=call.id,
        event_type=f"twilio_{twilio_status}",
        from_status=from_status,
        to_status=mapped_status,
        metadata_json={"twilio_status": twilio_status, "duration": duration},
    )
    db.add(event)
    await db.flush()
    return call
