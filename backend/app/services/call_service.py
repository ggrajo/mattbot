"""Call service: state machine, idempotent record creation, provider events."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.encryption import encrypt_field
from app.core.twilio_utils import (
    compute_payload_hash,
    extract_last4,
    hash_phone,
    mask_phone,
    redact_twilio_params,
)
from app.models.call import Call
from app.models.call_event import CallEvent
from app.models.provider_event import ProviderEvent
from app.models.user_number import UserNumber
from app.core.clock import utcnow

logger = logging.getLogger(__name__)


STATE_ORDER: dict[str, int] = {
    "created": 0,
    "inbound_received": 1,
    "twiml_responded": 2,
    "in_progress": 3,
    "completed": 10,
    "partial": 10,
    "failed": 10,
    "canceled": 10,
}

TERMINAL_STATES = frozenset({"completed", "partial", "failed", "canceled"})

TWILIO_STATUS_MAP: dict[str, str] = {
    "queued": "created",
    "ringing": "inbound_received",
    "in-progress": "in_progress",
    "completed": "completed",
    "busy": "failed",
    "failed": "failed",
    "no-answer": "failed",
    "canceled": "canceled",
}


class InvalidTransitionError(Exception):
    pass


def is_valid_transition(current: str, new: str) -> bool:
    current_order = STATE_ORDER.get(current, 0)
    new_order = STATE_ORDER.get(new, 0)
    if current in TERMINAL_STATES and new not in TERMINAL_STATES:
        return False
    return new_order >= current_order


def map_twilio_status(twilio_status: str) -> str | None:
    return TWILIO_STATUS_MAP.get(twilio_status)


async def find_user_by_called_number(
    db: AsyncSession,
    called_e164: str,
) -> UserNumber | None:
    stmt = select(UserNumber).where(
        UserNumber.e164 == called_e164,
        UserNumber.status == "active",
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_or_get_call(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    call_sid: str,
    caller_e164: str,
    called_e164: str,
    source_type: str = "dedicated_number",
    forwarding_detected: bool = False,
    forwarding_hint: str | None = None,
    parent_call_sid: str | None = None,
    retention_days: int = settings.DEFAULT_CALL_RETENTION_DAYS,
    agent_id: uuid.UUID | None = None,
    voice_id: uuid.UUID | None = None,
) -> tuple[Call, bool]:
    """Create or return existing call record. Returns (call, created)."""
    stmt = select(Call).where(Call.provider_call_sid == call_sid)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing, False

    caller_for_encrypt = caller_e164 or "anonymous"
    ciphertext, nonce, key_version = encrypt_field(caller_for_encrypt.encode("utf-8"))

    call = Call(
        owner_user_id=user_id,
        source_type=source_type,
        direction="inbound",
        status="inbound_received",
        caller_phone_ciphertext=ciphertext,
        caller_phone_nonce=nonce,
        caller_phone_key_version=key_version,
        caller_phone_hash=hash_phone(caller_for_encrypt),
        caller_phone_last4=extract_last4(caller_for_encrypt),
        caller_display=None,
        provider="twilio",
        provider_call_sid=call_sid,
        provider_parent_call_sid=parent_call_sid,
        forwarding_detected=forwarding_detected,
        forwarding_verification_hint=forwarding_hint,
        missing_summary=True,
        missing_transcript=True,
        missing_labels=True,
        from_masked=mask_phone(caller_e164) if caller_e164 else "Unknown",
        to_masked=mask_phone(called_e164) if called_e164 else "Unknown",
        retention_expires_at=utcnow() + timedelta(days=retention_days),
        agent_id=agent_id,
        voice_id=voice_id,
    )
    db.add(call)
    await db.flush()
    return call, True


async def transition_call_status(
    db: AsyncSession,
    call: Call,
    new_status: str,
    *,
    provider_status: str | None = None,
    event_type: str = "provider_status_update",
    event_details: dict | None = None,
    ended_at: datetime | None = None,
    duration_seconds: int | None = None,
) -> CallEvent | None:
    """Transition call status and insert a call_event. Returns None if duplicate."""
    if not is_valid_transition(call.status, new_status):
        logger.info(
            "Ignoring invalid transition %s -> %s for call %s",
            call.status,
            new_status,
            call.id,
        )
        return None

    existing = (
        await db.execute(
            select(CallEvent).where(
                CallEvent.call_id == call.id,
                CallEvent.event_type == event_type,
                CallEvent.provider_status == provider_status,
            )
        )
    ).scalar_one_or_none()

    if existing is not None:
        logger.debug("Duplicate call event ignored for call %s", call.id)
        return None

    call.status = new_status
    if ended_at is not None:
        call.ended_at = ended_at
    if duration_seconds is not None:
        call.duration_seconds = duration_seconds

    event = CallEvent(
        call_id=call.id,
        owner_user_id=call.owner_user_id,
        event_type=event_type,
        provider_status=provider_status,
        details_redacted=event_details,
    )
    db.add(event)
    await db.flush()
    return event


async def record_provider_event(
    db: AsyncSession,
    *,
    provider: str,
    event_type: str,
    call_sid: str | None,
    raw_params: dict[str, str],
    signature_valid: bool,
    call_id: uuid.UUID | None = None,
    owner_user_id: uuid.UUID | None = None,
) -> ProviderEvent:
    payload_hash = compute_payload_hash(raw_params)
    redacted = redact_twilio_params(raw_params)

    pe = ProviderEvent(
        provider=provider,
        provider_call_sid=call_sid,
        event_type=event_type,
        payload_hash=payload_hash,
        payload_redacted=redacted,
        signature_valid=signature_valid,
        call_id=call_id,
        owner_user_id=owner_user_id,
        process_status="received",
    )
    db.add(pe)
    await db.flush()
    return pe


async def get_call_for_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    call_id: uuid.UUID,
) -> Call | None:
    stmt = select(Call).where(
        Call.id == call_id,
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_calls_for_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    cursor: str | None = None,
    limit: int = 20,
    status: str | None = None,
    source_type: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    duration_min: int | None = None,
    duration_max: int | None = None,
    country_prefix: str | None = None,
    has_recording: bool | None = None,
    search: str | None = None,
    label: str | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
) -> tuple[list[Call], str | None, bool]:
    """Return (calls, next_cursor, has_more). Cursor is the last item's id."""
    from app.models.call_artifact import CallArtifact

    stmt = select(Call).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
        Call.provider_parent_call_sid.is_(None),
    )

    if status:
        stmt = stmt.where(Call.status == status)
    if source_type:
        stmt = stmt.where(Call.source_type == source_type)
    if date_from:
        stmt = stmt.where(Call.started_at >= date_from)
    if date_to:
        stmt = stmt.where(Call.started_at <= date_to)
    if duration_min is not None:
        stmt = stmt.where(Call.duration_seconds >= duration_min)
    if duration_max is not None:
        stmt = stmt.where(Call.duration_seconds <= duration_max)
    if country_prefix:
        stmt = stmt.where(Call.from_masked.startswith(country_prefix))
    if search:
        stmt = stmt.where(Call.from_masked.ilike(f"%{search}%"))

    need_artifact_join = (has_recording is True) or label
    if need_artifact_join:
        stmt = stmt.join(CallArtifact, CallArtifact.call_id == Call.id)

    if has_recording is True:
        stmt = stmt.where(
            CallArtifact.transcript_provider_ref.isnot(None),
            CallArtifact.transcript_status.in_(["ready", "partial"]),
        )

    if label:
        from sqlalchemy import cast, type_coerce
        from sqlalchemy.dialects.postgresql import JSONB

        target = [{"label_name": label}]
        stmt = stmt.where(
            CallArtifact.labels_json.isnot(None),
            CallArtifact.labels_status == "ready",
            cast(CallArtifact.labels_json, JSONB).op("@>")(type_coerce(target, JSONB)),
        )

    order_col = Call.started_at if sort_by == "started_at" else Call.created_at

    if sort_dir == "asc":
        stmt = stmt.order_by(order_col.asc())
    else:
        stmt = stmt.order_by(order_col.desc())

    stmt = stmt.limit(limit + 1)

    if cursor:
        try:
            cursor_id = uuid.UUID(cursor)

            ref_ts = (
                select(Call.created_at)
                .where(Call.id == cursor_id)
                .correlate(None)
                .scalar_subquery()
            )

            stmt = stmt.where(Call.created_at < ref_ts)
        except (ValueError, TypeError):
            pass

    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    next_cursor = str(rows[-1].id) if rows and has_more else None
    return rows, next_cursor, has_more


async def get_call_events(
    db: AsyncSession,
    call_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[CallEvent]:
    stmt = (
        select(CallEvent)
        .where(
            CallEvent.call_id == call_id,
            CallEvent.owner_user_id == user_id,
        )
        .order_by(CallEvent.event_at.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_call_by_sid(db: AsyncSession, call_sid: str) -> Call | None:
    stmt = select(Call).where(Call.provider_call_sid == call_sid)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def soft_delete_call(
    db: AsyncSession,
    user_id: uuid.UUID,
    call_id: uuid.UUID,
) -> bool:
    """Soft-delete a call. Returns True if deleted.

    Dependent rows (artifacts, AI sessions) reference calls with ON DELETE
    CASCADE and will be purged during the hard-delete phase.  Memory items
    confirmed by the user keep their data but lose the call link.
    """
    call = await get_call_for_user(db, user_id, call_id)
    if call is None:
        return False

    now = utcnow()
    call.deleted_at = now

    from app.models.call_memory_item import CallMemoryItem

    memory_stmt = select(CallMemoryItem).where(
        CallMemoryItem.source_call_id == call_id,
        CallMemoryItem.owner_user_id == user_id,
    )
    memory_items = (await db.execute(memory_stmt)).scalars().all()
    for item in memory_items:
        if item.user_confirmed:
            item.source_call_id = None
        else:
            item.deleted_at = now

    await db.flush()
    return True


async def soft_delete_all_calls(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """Soft-delete all calls for a user. Returns count of deleted calls."""
    from sqlalchemy import func as sa_func
    from sqlalchemy import update as sa_update

    from app.models.call_memory_item import CallMemoryItem

    now = utcnow()

    count_stmt = (
        select(sa_func.count())
        .select_from(Call)
        .where(
            Call.owner_user_id == user_id,
            Call.deleted_at.is_(None),
        )
    )
    count = (await db.execute(count_stmt)).scalar() or 0

    await db.execute(
        sa_update(Call)
        .where(
            Call.owner_user_id == user_id,
            Call.deleted_at.is_(None),
        )
        .values(deleted_at=now)
    )

    if count:
        await db.execute(
            sa_update(CallMemoryItem)
            .where(
                CallMemoryItem.owner_user_id == user_id,
                CallMemoryItem.user_confirmed.is_(False),
                CallMemoryItem.deleted_at.is_(None),
            )
            .values(deleted_at=now)
        )

        await db.execute(
            sa_update(CallMemoryItem)
            .where(
                CallMemoryItem.owner_user_id == user_id,
                CallMemoryItem.user_confirmed.is_(True),
            )
            .values(source_call_id=None)
        )

    await db.flush()
    return count
