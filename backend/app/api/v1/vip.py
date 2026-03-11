"""VIP list API: list, add, remove VIP entries."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import encrypt_field
from app.core.rate_limiter import check_rate_limit
from app.core.twilio_utils import extract_last4, hash_phone
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.vip_entry import VipEntry
from app.schemas.vip import VipCreateRequest, VipEntryResponse, VipListResponse
from app.services.audit_service import log_event

router = APIRouter()


@router.get("", response_model=VipListResponse)
async def list_vip_entries(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VipListResponse:
    allowed, _ = await check_rate_limit(
        f"vip:list:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = (
        select(VipEntry)
        .where(VipEntry.owner_user_id == current_user.user.id)
        .order_by(VipEntry.created_at.desc())
    )

    result = await db.execute(stmt)
    entries = list(result.scalars().all())

    return VipListResponse(
        items=[
            VipEntryResponse(
                id=str(e.id),
                phone_last4=e.phone_last4,
                display_name=e.display_name,
                company=e.company,
                relationship=e.relationship,
                email=e.email,
                notes=e.notes,
                created_at=e.created_at,
            )
            for e in entries
        ]
    )


@router.post("", response_model=VipEntryResponse, status_code=201)
async def add_vip_entry(
    body: VipCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VipEntryResponse:
    allowed, _ = await check_rate_limit(
        f"vip:add:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    ph = hash_phone(body.phone_number)

    existing = await db.execute(
        select(VipEntry).where(
            VipEntry.owner_user_id == current_user.user.id,
            VipEntry.phone_hash == ph,
        )
    )

    if existing.scalar_one_or_none() is not None:
        raise AppError(
            code="VIP_DUPLICATE",
            message="This number is already in your VIP list",
            status_code=409,
        )

    ct, nonce, kv = encrypt_field(body.phone_number.encode("utf-8"))

    entry = VipEntry(
        owner_user_id=current_user.user.id,
        phone_ciphertext=ct,
        phone_nonce=nonce,
        phone_key_version=kv,
        phone_hash=ph,
        phone_last4=extract_last4(body.phone_number),
        display_name=body.display_name,
        company=body.company,
        relationship=body.relationship,
        email=body.email,
        notes=body.notes,
    )

    db.add(entry)

    await log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="vip_added",
        actor_id=current_user.user.id,
        target_type="vip_entry",
        target_id=entry.id,
    )

    await db.flush()

    return VipEntryResponse(
        id=str(entry.id),
        phone_last4=entry.phone_last4,
        display_name=entry.display_name,
        company=entry.company,
        relationship=entry.relationship,
        email=entry.email,
        notes=entry.notes,
        created_at=entry.created_at,
    )


@router.delete("/{vip_id}")
async def remove_vip_entry(
    vip_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    allowed, _ = await check_rate_limit(
        f"vip:del:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    entry = await db.execute(
        select(VipEntry).where(
            VipEntry.id == vip_id,
            VipEntry.owner_user_id == current_user.user.id,
        )
    )

    entry_obj = entry.scalar_one_or_none()
    if entry_obj is None:
        raise AppError(code="VIP_NOT_FOUND", message="VIP entry not found", status_code=404)

    await log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="vip_removed",
        actor_id=current_user.user.id,
        target_type="vip_entry",
        target_id=entry_obj.id,
    )

    await db.delete(entry_obj)
    return {"deleted": True}
