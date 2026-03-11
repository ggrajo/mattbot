"""Memory items API: list, create, update, delete, bulk delete."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import decrypt_field, encrypt_field
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.call_memory_item import CallMemoryItem
from app.schemas.calls import (
    CreateMemoryItemRequest,
    MemoryItemResponse,
    MemoryListResponse,
    UpdateMemoryItemRequest,
)

router = APIRouter()


def _item_to_response(item: CallMemoryItem) -> MemoryItemResponse:
    value = None
    try:
        value = decrypt_field(
            item.value_ciphertext,
            item.value_nonce,
            item.value_key_version,
        ).decode("utf-8")
    except Exception:
        value = "[unable to decrypt]"

    return MemoryItemResponse(
        id=str(item.id),
        memory_type=item.memory_type,
        subject=item.subject,
        value=value,
        confidence=item.confidence,
        user_confirmed=item.user_confirmed,
        source_call_id=str(item.source_call_id) if item.source_call_id else None,
        caller_phone_hash=item.caller_phone_hash,
        created_at=item.created_at,
    )


@router.get("", response_model=MemoryListResponse)
async def list_memory_items(
    caller_phone_hash: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryListResponse:
    allowed, _ = await check_rate_limit(
        f"memory:list:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    filters = [
        CallMemoryItem.owner_user_id == current_user.user.id,
        CallMemoryItem.deleted_at.is_(None),
    ]
    if caller_phone_hash:
        filters.append(CallMemoryItem.caller_phone_hash == caller_phone_hash)

    stmt = select(CallMemoryItem).where(*filters).order_by(CallMemoryItem.created_at.desc())

    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return MemoryListResponse(items=[_item_to_response(i) for i in items])


@router.post("", response_model=MemoryItemResponse, status_code=201)
async def create_memory_item(
    body: CreateMemoryItemRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryItemResponse:
    allowed, _ = await check_rate_limit(
        f"memory:create:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    ct, nonce, kv = encrypt_field(body.value.encode("utf-8"))
    item = CallMemoryItem(
        owner_user_id=current_user.user.id,
        caller_phone_hash=body.caller_phone_hash,
        memory_type=body.memory_type,
        subject=body.subject[:50],
        value_ciphertext=ct,
        value_nonce=nonce,
        value_key_version=kv,
        confidence=1.0,
        user_confirmed=True,
    )

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _item_to_response(item)


@router.patch("/{memory_id}", response_model=MemoryItemResponse)
async def update_memory_item(
    memory_id: uuid.UUID,
    body: UpdateMemoryItemRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryItemResponse:
    allowed, _ = await check_rate_limit(
        f"memory:update:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = select(CallMemoryItem).where(
        CallMemoryItem.id == memory_id,
        CallMemoryItem.owner_user_id == current_user.user.id,
        CallMemoryItem.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise AppError(
            code="MEMORY_NOT_FOUND",
            message="Memory item not found",
            status_code=404,
        )

    if body.subject is not None:
        item.subject = body.subject[:50]

    if body.value is not None:
        ct, nonce, kv = encrypt_field(body.value.encode("utf-8"))
        item.value_ciphertext = ct
        item.value_nonce = nonce
        item.value_key_version = kv

    if body.user_confirmed is not None:
        item.user_confirmed = body.user_confirmed
        if body.user_confirmed:
            item.confidence = 1.0

    await db.commit()
    await db.refresh(item)
    return _item_to_response(item)


@router.delete("/{memory_id}")
async def delete_memory_item(
    memory_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    allowed, _ = await check_rate_limit(
        f"memory:delete:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = select(CallMemoryItem).where(
        CallMemoryItem.id == memory_id,
        CallMemoryItem.owner_user_id == current_user.user.id,
        CallMemoryItem.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise AppError(
            code="MEMORY_NOT_FOUND",
            message="Memory item not found",
            status_code=404,
        )

    item.deleted_at = datetime.now(UTC)
    await db.commit()
    return {"deleted": True}


@router.delete("")
async def delete_all_memory(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    allowed, _ = await check_rate_limit(
        f"memory:bulkdel:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    stmt = (
        update(CallMemoryItem)
        .where(
            CallMemoryItem.owner_user_id == current_user.user.id,
            CallMemoryItem.deleted_at.is_(None),
        )
        .values(deleted_at=datetime.now(UTC))
    )
    result = await db.execute(stmt)
    await db.commit()
    return {"deleted_count": getattr(result, "rowcount", 0)}
