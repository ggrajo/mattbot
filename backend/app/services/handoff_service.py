"""Handoff service: eligibility evaluation, offer lifecycle, expiry sweeper."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.call import Call
from app.models.call_event import CallEvent
from app.models.handoff_offer import HandoffOffer
from app.models.user_settings import UserSettings
from app.models.vip_entry import VipEntry

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Eligibility
# ---------------------------------------------------------------------------


async def evaluate_eligibility(
    db: AsyncSession,
    call: Call,
    user_settings: UserSettings,
    caller_phone_hash: str,
) -> dict:
    if not user_settings.handoff_enabled:
        return {"eligible": False, "reason": "handoff_disabled", "is_vip": False}

    vip_row = await db.scalar(
        select(VipEntry).where(
            VipEntry.owner_user_id == call.owner_user_id,
            VipEntry.phone_hash == caller_phone_hash,
        )
    )

    is_vip = vip_row is not None

    trigger = user_settings.handoff_trigger

    if trigger == "never":
        return {"eligible": False, "reason": "trigger_never", "is_vip": is_vip}

    if trigger == "vip_only" and not is_vip:
        return {"eligible": False, "reason": "not_vip", "is_vip": False}

    is_urgent = (
        call.handoff_status == "urgent_candidate"
        or getattr(call, "urgency_level", None) == "urgent"
    )

    if trigger == "urgent_only" and not is_urgent:
        return {"eligible": False, "reason": "not_urgent", "is_vip": is_vip}

    if trigger == "vip_and_urgent" and not is_vip and not is_urgent:
        return {"eligible": False, "reason": "not_vip_or_urgent", "is_vip": is_vip}

    reason = "vip" if is_vip else ("urgent" if is_urgent else "always")

    return {"eligible": True, "reason": reason, "is_vip": is_vip}


# ---------------------------------------------------------------------------
# Screening check
# ---------------------------------------------------------------------------


async def check_minimum_screening(db: AsyncSession, call_id: uuid.UUID) -> bool:
    rows = (
        await db.scalars(
            select(CallEvent).where(
                CallEvent.call_id == call_id,
                CallEvent.event_type == "screening_field_captured",
            )
        )
    ).all()

    captured_fields = set()
    for event in rows:
        details = event.details_redacted or {}
        field_name = details.get("field_name")
        if not field_name:
            continue
        captured_fields.add(field_name)

    return "caller_name" in captured_fields and "reason" in captured_fields


# ---------------------------------------------------------------------------
# Offer lifecycle
# ---------------------------------------------------------------------------


async def create_offer(
    db: AsyncSession,
    call: Call,
    user_id: uuid.UUID,
    reason: str,
    preview_payload: dict | None,
    timeout_seconds: int | None = None,
) -> HandoffOffer:
    if timeout_seconds is None:
        timeout_seconds = settings.HANDOFF_OFFER_DEFAULT_TIMEOUT

    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=timeout_seconds)

    offer = HandoffOffer(
        call_id=call.id,
        owner_user_id=user_id,
        status="offered",
        offer_reason=reason,
        expires_at=expires_at,
        preview_payload=preview_payload,
    )
    db.add(offer)

    call.handoff_status = "offered"
    call.handoff_offered_at = now
    call.handoff_offer_expires_at = expires_at

    event = CallEvent(
        call_id=call.id,
        owner_user_id=user_id,
        event_type="handoff_offer_created",
        event_at=now,
        details_redacted={"offer_reason": reason, "timeout_seconds": timeout_seconds},
    )
    db.add(event)

    await db.flush()
    return offer


async def accept_offer(
    db: AsyncSession,
    offer_id: uuid.UUID,
    device_id: uuid.UUID,
    idempotency_key: str,
) -> dict:
    result = await db.execute(
        select(HandoffOffer).where(HandoffOffer.id == offer_id).with_for_update()
    )

    offer = result.scalar_one_or_none()

    if offer is None:
        return {"result": "not_found"}

    now = datetime.now(UTC)

    if offer.status != "offered":
        return {"result": "lost", "current_status": offer.status}

    if not offer.expires_at.tzinfo:
        exp = offer.expires_at.replace(tzinfo=UTC)
    else:
        exp = offer.expires_at

    if exp < now:
        offer.status = "expired"
        await _sync_call_handoff_status(db, offer.call_id, "expired")
        await db.flush()
        return {"result": "expired"}

    offer.status = "accepted"
    offer.selected_device_id = device_id
    offer.accepted_at = now

    await _sync_call_handoff_status(
        db,
        offer.call_id,
        "accepted",
        accepted_at=now,
        selected_device_id=device_id,
    )

    await db.flush()
    return {"result": "won"}


async def decline_offer(
    db: AsyncSession,
    offer_id: uuid.UUID,
    device_id: uuid.UUID,
) -> dict:
    offer = await db.get(HandoffOffer, offer_id)
    if offer is None:
        return {"result": "not_found"}

    if offer.status != "offered":
        return {"result": "already_resolved", "current_status": offer.status}

    now = datetime.now(UTC)
    offer.status = "declined"
    offer.declined_at = now

    await _sync_call_handoff_status(db, offer.call_id, "declined")
    await db.flush()
    return {"result": "declined"}


# ---------------------------------------------------------------------------
# Expiry sweeper
# ---------------------------------------------------------------------------


async def expire_stale_offers(db: AsyncSession) -> int:
    now = datetime.now(UTC)

    stale = (
        await db.scalars(
            select(HandoffOffer).where(
                HandoffOffer.status == "offered",
                HandoffOffer.expires_at < now,
            )
        )
    ).all()

    for offer in stale:
        offer.status = "expired"
        await _sync_call_handoff_status(db, offer.call_id, "expired")

    if stale:
        await db.flush()

    return len(stale)


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------


async def _sync_call_handoff_status(
    db: AsyncSession,
    call_id: uuid.UUID,
    status: str,
    *,
    accepted_at: datetime | None = None,
    selected_device_id: uuid.UUID | None = None,
) -> None:
    values = {"handoff_status": status}
    if accepted_at is not None:
        values["handoff_accepted_at"] = accepted_at
    if selected_device_id is not None:
        values["handoff_selected_device_id"] = selected_device_id

    await db.execute(update(Call).where(Call.id == call_id).values(**values))
