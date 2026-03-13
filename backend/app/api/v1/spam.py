"""Spam list API: list, add, remove spam entries."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clock import utcnow
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.core.twilio_utils import extract_last4, hash_phone
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.spam_entry import SpamEntry
from app.schemas.spam import SpamCreateRequest, SpamEntryResponse, SpamListResponse
from app.services.audit_service import log_event

router = APIRouter()


@router.get("", response_model=SpamListResponse)
async def list_spam_entries(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpamListResponse:
    allowed, _ = await check_rate_limit(
        f"spam:list:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = (
        select(SpamEntry)
        .where(SpamEntry.owner_user_id == current_user.user.id)
        .order_by(SpamEntry.last_flagged_at.desc())
    )

    result = await db.execute(stmt)
    entries = list(result.scalars().all())

    return SpamListResponse(
        items=[
            SpamEntryResponse(
                id=str(e.id),
                phone_last4=e.phone_last4,
                spam_score=e.spam_score,
                spam_call_count=e.spam_call_count,
                first_flagged_at=e.first_flagged_at,
                last_flagged_at=e.last_flagged_at,
                auto_blocked=e.auto_blocked,
                source=e.source,
            )
            for e in entries
        ]
    )


@router.post("", response_model=SpamEntryResponse, status_code=201)
async def add_spam_entry(
    body: SpamCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SpamEntryResponse:
    allowed, _ = await check_rate_limit(
        f"spam:add:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    ph = hash_phone(body.phone_number)

    existing = (await db.execute(
        select(SpamEntry).where(
            SpamEntry.owner_user_id == current_user.user.id,
            SpamEntry.phone_hash == ph,
        )
    )).scalar_one_or_none()

    if existing is not None:
        raise AppError(
            code="SPAM_DUPLICATE",
            message="This number is already in your spam list",
            status_code=409,
        )

    now = utcnow()
    entry = SpamEntry(
        owner_user_id=current_user.user.id,
        phone_hash=ph,
        phone_last4=extract_last4(body.phone_number),
        spam_score=1.0,
        spam_call_count=0,
        first_flagged_at=now,
        last_flagged_at=now,
        auto_blocked=False,
        source="manual",
    )
    db.add(entry)

    from app.models.vip_entry import VipEntry
    from app.models.contact_profile import ContactProfile
    from sqlalchemy import delete as sql_delete, update as sql_update

    uid = current_user.user.id
    await db.execute(
        sql_delete(VipEntry).where(VipEntry.owner_user_id == uid, VipEntry.phone_hash == ph)
    )
    await db.execute(
        sql_update(ContactProfile)
        .where(ContactProfile.owner_user_id == uid, ContactProfile.phone_hash == ph)
        .values(is_vip=False)
    )

    await log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="spam_added",
        actor_id=current_user.user.id,
        target_type="spam_entry",
        target_id=entry.id,
    )

    await db.flush()

    return SpamEntryResponse(
        id=str(entry.id),
        phone_last4=entry.phone_last4,
        spam_score=entry.spam_score,
        spam_call_count=entry.spam_call_count,
        first_flagged_at=entry.first_flagged_at,
        last_flagged_at=entry.last_flagged_at,
        auto_blocked=entry.auto_blocked,
        source=entry.source,
    )


@router.delete("/{spam_id}")
async def remove_spam_entry(
    spam_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    allowed, _ = await check_rate_limit(
        f"spam:del:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    uid = current_user.user.id

    entry = (await db.execute(
        select(SpamEntry).where(
            SpamEntry.id == spam_id,
            SpamEntry.owner_user_id == uid,
        )
    )).scalar_one_or_none()

    if entry is None:
        raise AppError(code="SPAM_NOT_FOUND", message="Spam entry not found", status_code=404)

    from app.models.block_entry import BlockEntry
    from app.models.contact_profile import ContactProfile
    from sqlalchemy import delete as sql_delete, update as sql_update

    await db.execute(
        sql_delete(BlockEntry).where(BlockEntry.owner_user_id == uid, BlockEntry.phone_hash == entry.phone_hash)
    )
    await db.execute(
        sql_update(ContactProfile)
        .where(ContactProfile.owner_user_id == uid, ContactProfile.phone_hash == entry.phone_hash)
        .values(is_blocked=False, block_reason=None)
    )

    await log_event(
        db,
        owner_user_id=uid,
        event_type="spam_removed",
        actor_id=uid,
        target_type="spam_entry",
        target_id=entry.id,
    )

    await db.delete(entry)
    return {"deleted": True}
