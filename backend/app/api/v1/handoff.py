"""Handoff API: accept / decline / status endpoints for live call handoff."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.call import Call
from app.models.handoff_offer import HandoffOffer
from app.services import audit_service, handoff_service

router = APIRouter()


class HandoffAcceptRequest(BaseModel):
    device_id: uuid.UUID
    idempotency_key: str = Field(..., min_length=1, max_length=128)


class HandoffDeclineRequest(BaseModel):
    device_id: uuid.UUID


class HandoffAcceptResponse(BaseModel):
    result: str
    current_status: str | None = None


class HandoffDeclineResponse(BaseModel):
    result: str
    current_status: str | None = None


class HandoffStatusResponse(BaseModel):
    call_id: str
    handoff_status: str | None
    offer_id: str | None = None
    offer_status: str | None = None
    expires_at: str | None = None
    preview_payload: dict | None = None


async def _get_owned_call(
    db: AsyncSession,
    user_id: uuid.UUID,
    call_id: uuid.UUID,
) -> Call:
    call = await db.scalar(select(Call).where(Call.id == call_id, Call.owner_user_id == user_id))
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)
    return call


async def _get_offer_for_call(
    db: AsyncSession,
    call_id: uuid.UUID,
) -> HandoffOffer | None:
    result = await db.scalar(select(HandoffOffer).where(HandoffOffer.call_id == call_id))
    return result


@router.post("/{call_id}/handoff/accept", response_model=HandoffAcceptResponse)
async def accept_handoff(
    call_id: uuid.UUID,
    body: HandoffAcceptRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HandoffAcceptResponse:
    allowed, _ = await check_rate_limit(
        f"handoff_accept:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await _get_owned_call(db, current_user.user.id, call_id)

    offer = await _get_offer_for_call(db, call.id)
    if offer is None:
        raise AppError(
            code="NO_HANDOFF_OFFER",
            message="No handoff offer exists for this call",
            status_code=404,
        )

    result = await handoff_service.accept_offer(db, offer.id, body.device_id, body.idempotency_key)

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="HANDOFF_ACCEPT_ATTEMPTED",
        target_type="call",
        target_id=call_id,
        details={"result": result["result"], "device_id": str(body.device_id)},
    )

    await db.commit()

    return HandoffAcceptResponse(
        result=result["result"],
        current_status=result.get("current_status"),
    )


@router.post("/{call_id}/handoff/decline", response_model=HandoffDeclineResponse)
async def decline_handoff(
    call_id: uuid.UUID,
    body: HandoffDeclineRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HandoffDeclineResponse:
    allowed, _ = await check_rate_limit(
        f"handoff_decline:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await _get_owned_call(db, current_user.user.id, call_id)

    offer = await _get_offer_for_call(db, call.id)
    if offer is None:
        raise AppError(
            code="NO_HANDOFF_OFFER",
            message="No handoff offer exists for this call",
            status_code=404,
        )

    result = await handoff_service.decline_offer(db, offer.id, body.device_id)

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="HANDOFF_DECLINE_ATTEMPTED",
        target_type="call",
        target_id=call_id,
        details={"result": result["result"], "device_id": str(body.device_id)},
    )

    await db.commit()

    return HandoffDeclineResponse(
        result=result["result"],
        current_status=result.get("current_status"),
    )


@router.get("/{call_id}/handoff", response_model=HandoffStatusResponse)
async def get_handoff_status(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HandoffStatusResponse:
    allowed, _ = await check_rate_limit(
        f"handoff_status:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await _get_owned_call(db, current_user.user.id, call_id)
    offer = await _get_offer_for_call(db, call.id)

    return HandoffStatusResponse(
        call_id=str(call.id),
        handoff_status=call.handoff_status,
        offer_id=str(offer.id) if offer else None,
        offer_status=offer.status if offer else None,
        expires_at=offer.expires_at.isoformat() if offer else None,
        preview_payload=offer.preview_payload if offer else None,
    )
