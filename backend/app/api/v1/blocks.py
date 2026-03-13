"""Block list API: list, add, remove blocked numbers."""

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
from app.models.block_entry import BlockEntry
from app.schemas.blocks import BlockCreateRequest, BlockEntryResponse, BlockListResponse
from app.services.audit_service import log_event

router = APIRouter()


@router.get("", response_model=BlockListResponse)
async def list_block_entries(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BlockListResponse:
    allowed, _ = await check_rate_limit(
        f"block:list:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = (
        select(BlockEntry)
        .where(BlockEntry.owner_user_id == current_user.user.id)
        .order_by(BlockEntry.created_at.desc())
    )

    result = await db.execute(stmt)
    entries = list(result.scalars().all())
    seen_hashes = {e.phone_hash for e in entries}

    from app.models.contact_profile import ContactProfile
    contact_result = await db.execute(
        select(ContactProfile).where(
            ContactProfile.owner_user_id == current_user.user.id,
            ContactProfile.is_blocked == True,
            ContactProfile.deleted_at.is_(None),
            ContactProfile.phone_hash.notin_(seen_hashes) if seen_hashes else True,
        )
    )
    blocked_contacts = list(contact_result.scalars().all())

    items = [
        BlockEntryResponse(
            id=str(e.id),
            phone_last4=e.phone_last4,
            display_name=e.display_name,
            reason=e.reason,
            company=e.company,
            relationship=e.relationship,
            email=e.email,
            notes=e.notes,
            created_at=e.created_at,
        )
        for e in entries
    ]

    for c in blocked_contacts:
        items.append(
            BlockEntryResponse(
                id=str(c.id),
                phone_last4=c.phone_last4,
                display_name=c.display_name,
                reason=c.block_reason,
                company=c.company,
                relationship=c.relationship,
                email=c.email,
                notes=c.notes,
                created_at=c.created_at,
            )
        )

    return BlockListResponse(items=items)


@router.post("", response_model=BlockEntryResponse, status_code=201)
async def add_block_entry(
    body: BlockCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BlockEntryResponse:
    allowed, _ = await check_rate_limit(
        f"block:add:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    ph = hash_phone(body.phone_number)

    existing = await db.execute(
        select(BlockEntry).where(
            BlockEntry.owner_user_id == current_user.user.id,
            BlockEntry.phone_hash == ph,
        )
    )

    if existing.scalar_one_or_none() is not None:
        raise AppError(
            code="BLOCK_DUPLICATE",
            message="This number is already blocked",
            status_code=409,
        )

    ct, nonce, kv = encrypt_field(body.phone_number.encode("utf-8"))

    entry = BlockEntry(
        owner_user_id=current_user.user.id,
        phone_ciphertext=ct,
        phone_nonce=nonce,
        phone_key_version=kv,
        phone_hash=ph,
        phone_last4=extract_last4(body.phone_number),
        display_name=body.display_name,
        reason=body.reason,
        company=body.company,
        relationship=body.relationship,
        email=body.email,
        notes=body.notes,
    )

    db.add(entry)

    from app.models.contact_profile import ContactProfile
    from app.models.vip_entry import VipEntry
    from sqlalchemy import delete as sql_delete, update as sql_update

    uid = current_user.user.id

    await db.execute(
        sql_delete(VipEntry).where(VipEntry.owner_user_id == uid, VipEntry.phone_hash == ph)
    )
    await db.execute(
        sql_update(ContactProfile)
        .where(ContactProfile.owner_user_id == uid, ContactProfile.phone_hash == ph)
        .values(is_blocked=True, block_reason=body.reason, is_vip=False)
    )

    await log_event(
        db,
        owner_user_id=uid,
        event_type="block_added",
        actor_id=uid,
        target_type="block_entry",
        target_id=entry.id,
    )

    await db.flush()

    return BlockEntryResponse(
        id=str(entry.id),
        phone_last4=entry.phone_last4,
        display_name=entry.display_name,
        reason=entry.reason,
        company=entry.company,
        relationship=entry.relationship,
        email=entry.email,
        notes=entry.notes,
        created_at=entry.created_at,
    )


@router.delete("/{block_id}")
async def remove_block_entry(
    block_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    allowed, _ = await check_rate_limit(
        f"block:del:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    from app.models.contact_profile import ContactProfile
    from sqlalchemy import update as sql_update

    uid = current_user.user.id

    entry_obj = (
        await db.execute(
            select(BlockEntry).where(BlockEntry.id == block_id, BlockEntry.owner_user_id == uid)
        )
    ).scalar_one_or_none()

    if entry_obj is not None:
        await log_event(db, owner_user_id=uid, event_type="block_removed", actor_id=uid, target_type="block_entry", target_id=entry_obj.id)
        await db.execute(
            sql_update(ContactProfile)
            .where(ContactProfile.owner_user_id == uid, ContactProfile.phone_hash == entry_obj.phone_hash)
            .values(is_blocked=False, block_reason=None)
        )
        await db.delete(entry_obj)
        return {"deleted": True}

    contact = (
        await db.execute(
            select(ContactProfile).where(
                ContactProfile.id == block_id,
                ContactProfile.owner_user_id == uid,
                ContactProfile.is_blocked == True,
            )
        )
    ).scalar_one_or_none()

    if contact is not None:
        contact.is_blocked = False
        contact.block_reason = None
        await log_event(db, owner_user_id=uid, event_type="block_removed", actor_id=uid, target_type="contact_profile", target_id=contact.id)
        return {"deleted": True}

    raise AppError(code="BLOCK_NOT_FOUND", message="Block entry not found", status_code=404)
