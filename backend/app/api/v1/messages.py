"""Messaging / text-back API endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clock import utcnow
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import decrypt_field, encrypt_field
from app.core.rate_limiter import check_rate_limit
from app.core.twilio_utils import extract_last4, hash_phone
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.call import Call
from app.models.outbound_message import OutboundMessage
from app.models.text_back_template import TextBackTemplate
from app.schemas.messaging import (
    TemplateListResponse,
    TemplateResponse,
    TextBackApproveRequest,
    TextBackDraftRequest,
    TextBackResponse,
    TextBackUpdateRequest,
)
from app.services import audit_service

router = APIRouter()

_DRAFT_STATUSES = ("drafted", "awaiting_approval")
_APPROVABLE_STATUSES = ("drafted", "awaiting_approval")


# ── Templates ────────────────────────────────────────────────────────────────


@router.get("/templates/text-back", response_model=TemplateListResponse)
async def list_text_back_templates(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    category: str | None = Query(default=None),
    tone_tag: str | None = Query(default=None),
) -> TemplateListResponse:
    stmt = select(TextBackTemplate).where(TextBackTemplate.is_builtin.is_(True))
    if category:
        stmt = stmt.where(TextBackTemplate.category == category)
    if tone_tag:
        stmt = stmt.where(TextBackTemplate.tone_tag == tone_tag)
    stmt = stmt.order_by(TextBackTemplate.category, TextBackTemplate.title)

    result = await db.execute(stmt)
    templates = result.scalars().all()

    return TemplateListResponse(
        items=[
            TemplateResponse(
                id=str(t.id),
                category=t.category,
                title=t.title,
                body=t.body,
                tone_tag=t.tone_tag,
            )
            for t in templates
        ]
    )


# ── Draft ────────────────────────────────────────────────────────────────────


@router.post("/calls/{call_id}/text-back/draft", response_model=TextBackResponse)
async def create_text_back_draft(
    call_id: uuid.UUID,
    body: TextBackDraftRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TextBackResponse:
    allowed, _ = await check_rate_limit(
        f"text_back_draft:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await _get_owned_call(db, current_user.user.id, call_id)

    existing = await _find_draft_for_call(db, current_user.user.id, call_id)
    if existing:
        return _build_response(existing)

    draft_body = body.custom_body or ""
    template_id_used = None

    if body.template_id and not body.custom_body:
        template = await db.get(TextBackTemplate, uuid.UUID(body.template_id))
        if not template:
            raise AppError(
                code="TEMPLATE_NOT_FOUND",
                message="Template not found",
                status_code=404,
            )
        draft_body = template.body
        template_id_used = template.id

    if not draft_body:
        raise AppError(
            code="EMPTY_BODY",
            message="Provide either template_id or custom_body",
            status_code=422,
        )

    to_number = body.to_number
    if not to_number:
        to_number = _decrypt_caller_phone(call)
    if not to_number:
        raise AppError(
            code="MISSING_RECIPIENT",
            message="Cannot determine recipient; provide to_number",
            status_code=422,
        )

    ct_body, nonce_body, kv_body = encrypt_field(draft_body.encode("utf-8"))
    ct_to, nonce_to, kv_to = encrypt_field(to_number.encode("utf-8"))

    msg = OutboundMessage(
        owner_user_id=current_user.user.id,
        call_id=call_id,
        action_type="text_back",
        status="drafted",
        to_number_ciphertext=ct_to,
        to_number_nonce=nonce_to,
        to_number_key_version=kv_to,
        to_number_hash=hash_phone(to_number),
        to_number_last4=extract_last4(to_number),
        draft_body_ciphertext=ct_body,
        draft_body_nonce=nonce_body,
        draft_body_key_version=kv_body,
        template_id_used=template_id_used,
    )

    db.add(msg)
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="TEXT_BACK_DRAFT_CREATED",
        target_type="outbound_message",
        target_id=msg.id,
        details={"call_id": str(call_id)},
    )

    return _build_response(msg, draft_body_plain=draft_body)


# ── Update draft ─────────────────────────────────────────────────────────────


@router.patch("/actions/{action_id}/text-back", response_model=TextBackResponse)
async def update_text_back_draft(
    action_id: uuid.UUID,
    body: TextBackUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TextBackResponse:

    msg = await _get_owned_message(db, current_user.user.id, action_id)

    if msg.status not in _DRAFT_STATUSES:
        raise AppError(
            code="NOT_EDITABLE",
            message="Message is no longer in a draft state",
            status_code=409,
        )

    if body.body is not None:
        ct, nonce, kv = encrypt_field(body.body.encode("utf-8"))
        msg.draft_body_ciphertext = ct
        msg.draft_body_nonce = nonce
        msg.draft_body_key_version = kv

    if body.to_number is not None:
        ct, nonce, kv = encrypt_field(body.to_number.encode("utf-8"))
        msg.to_number_ciphertext = ct
        msg.to_number_nonce = nonce
        msg.to_number_key_version = kv
        msg.to_number_hash = hash_phone(body.to_number)
        msg.to_number_last4 = extract_last4(body.to_number)

    await db.flush()
    return _build_response(msg)


# ── Approve ──────────────────────────────────────────────────────────────────


@router.post("/actions/{action_id}/approve", response_model=TextBackResponse)
async def approve_text_back(
    action_id: uuid.UUID,
    body: TextBackApproveRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TextBackResponse:
    allowed, _ = await check_rate_limit(
        f"text_back_approve:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    msg = await _get_owned_message(db, current_user.user.id, action_id)

    if msg.status not in _APPROVABLE_STATUSES:
        raise AppError(
            code="NOT_APPROVABLE",
            message=f"Cannot approve message in '{msg.status}' status",
            status_code=409,
        )

    ct_final, nonce_final, kv_final = encrypt_field(body.final_body.encode("utf-8"))

    msg.final_body_ciphertext = ct_final
    msg.final_body_nonce = nonce_final
    msg.final_body_key_version = kv_final

    ct_to, nonce_to, kv_to = encrypt_field(body.to_number.encode("utf-8"))
    msg.to_number_ciphertext = ct_to
    msg.to_number_nonce = nonce_to
    msg.to_number_key_version = kv_to
    msg.to_number_hash = hash_phone(body.to_number)
    msg.to_number_last4 = extract_last4(body.to_number)

    now = utcnow()
    msg.status = "approved"
    msg.approved_at = now
    msg.approved_by_device_id = uuid.UUID(body.device_id)

    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="TEXT_BACK_APPROVED",
        target_type="outbound_message",
        target_id=msg.id,
        details={
            "device_id": body.device_id,
            "idempotency_key": body.idempotency_key,
        },
    )

    return _build_response(msg, final_body_plain=body.final_body)


# ── Retry ────────────────────────────────────────────────────────────────────


@router.post("/actions/{action_id}/retry", response_model=TextBackResponse)
async def retry_text_back(
    action_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TextBackResponse:

    msg = await _get_owned_message(db, current_user.user.id, action_id)

    if msg.status != "failed":
        raise AppError(
            code="NOT_RETRYABLE",
            message="Only failed messages can be retried",
            status_code=409,
        )

    msg.status = "approved"
    msg.last_error_code = None
    msg.last_error_message_short = None

    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="TEXT_BACK_RETRY",
        target_type="outbound_message",
        target_id=msg.id,
    )

    return _build_response(msg)


# ── Cancel ───────────────────────────────────────────────────────────────────


@router.post("/actions/{action_id}/cancel", response_model=TextBackResponse)
async def cancel_text_back(
    action_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TextBackResponse:

    msg = await _get_owned_message(db, current_user.user.id, action_id)

    if msg.status not in _DRAFT_STATUSES:
        raise AppError(
            code="NOT_CANCELLABLE",
            message="Only drafted/awaiting_approval messages can be cancelled",
            status_code=409,
        )

    msg.status = "cancelled"
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="TEXT_BACK_CANCELLED",
        target_type="outbound_message",
        target_id=msg.id,
    )

    return _build_response(msg)


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _get_owned_call(
    db: AsyncSession,
    user_id: uuid.UUID,
    call_id: uuid.UUID,
) -> Call:
    stmt = select(Call).where(
        Call.id == call_id,
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    call = result.scalar_one_or_none()
    if not call:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)
    return call


async def _get_owned_message(
    db: AsyncSession,
    user_id: uuid.UUID,
    message_id: uuid.UUID,
) -> OutboundMessage:
    stmt = select(OutboundMessage).where(
        OutboundMessage.id == message_id,
        OutboundMessage.owner_user_id == user_id,
    )
    result = await db.execute(stmt)
    msg = result.scalar_one_or_none()
    if not msg:
        raise AppError(
            code="MESSAGE_NOT_FOUND",
            message="Message not found",
            status_code=404,
        )
    return msg


async def _find_draft_for_call(
    db: AsyncSession,
    user_id: uuid.UUID,
    call_id: uuid.UUID,
) -> OutboundMessage | None:
    stmt = select(OutboundMessage).where(
        OutboundMessage.owner_user_id == user_id,
        OutboundMessage.call_id == call_id,
        OutboundMessage.action_type == "text_back",
        OutboundMessage.status.in_(_DRAFT_STATUSES),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def _decrypt_caller_phone(call: Call) -> str | None:
    """Best-effort decrypt the caller phone from the call record."""
    try:
        plaintext = decrypt_field(
            call.caller_phone_ciphertext,
            call.caller_phone_nonce,
            call.caller_phone_key_version,
        )
        return plaintext.decode("utf-8")
    except Exception:
        return None


def _decrypt_body(ct: bytes, nonce: bytes, kv: int) -> str | None:
    try:
        return decrypt_field(ct, nonce, kv).decode("utf-8")
    except Exception:
        return None


def _build_response(
    msg: OutboundMessage,
    *,
    draft_body_plain: str | None = None,
    final_body_plain: str | None = None,
) -> TextBackResponse:

    if draft_body_plain is None:
        draft_body_plain = _decrypt_body(
            msg.draft_body_ciphertext,
            msg.draft_body_nonce,
            msg.draft_body_key_version,
        )

    if final_body_plain is None and msg.final_body_ciphertext is not None:
        final_body_plain = _decrypt_body(
            msg.final_body_ciphertext,
            msg.final_body_nonce,
            msg.final_body_key_version,
        )

    return TextBackResponse(
        id=str(msg.id),
        call_id=str(msg.call_id) if msg.call_id else None,
        status=msg.status,
        to_number_last4=msg.to_number_last4,
        draft_body=draft_body_plain,
        final_body=final_body_plain,
        template_id_used=str(msg.template_id_used) if msg.template_id_used else None,
        approved_at=msg.approved_at,
        last_error_code=msg.last_error_code,
        created_at=msg.created_at,
    )
