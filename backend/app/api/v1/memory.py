"""Memory API for managing user memory items."""

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError

logger = logging.getLogger(__name__)

router = APIRouter()


class MemoryItemCreate(BaseModel):
    content: str
    memory_type: str = "note"
    source: str = "user"
    call_id: uuid.UUID | None = None
    caller_phone_hash: str | None = None
    caller_name: str | None = None
    importance: int = 1


class MemoryItemResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    content: str
    memory_type: str
    source: str
    call_id: uuid.UUID | None = None
    caller_phone_hash: str | None = None
    caller_name: str | None = None
    importance: int = 1
    expires_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MemoryListResponse(BaseModel):
    items: list[MemoryItemResponse]
    total: int


@router.get("", response_model=MemoryListResponse)
async def list_memory_items(
    call_id: uuid.UUID | None = Query(None),
    memory_type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryListResponse:
    try:
        from app.models.call_memory_item import CallMemoryItem

        base = select(CallMemoryItem).where(
            CallMemoryItem.user_id == current_user.user_id
        )
        if call_id is not None:
            base = base.where(CallMemoryItem.call_id == call_id)
        if memory_type is not None:
            base = base.where(CallMemoryItem.memory_type == memory_type)

        count_q = select(func.count()).select_from(base.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        rows_q = (
            base.order_by(CallMemoryItem.created_at.desc()).limit(limit).offset(offset)
        )
        result = await db.execute(rows_q)
        items = list(result.scalars().all())

        return MemoryListResponse(
            items=[MemoryItemResponse.model_validate(i) for i in items],
            total=total,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception(
            "Failed to list memory items for user %s", current_user.user_id
        )
        raise AppError("MEMORY_ERROR", f"Failed to list memory items: {e}", 500)


@router.post("", response_model=MemoryItemResponse, status_code=201)
async def create_memory_item(
    body: MemoryItemCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryItemResponse:
    try:
        from app.models.call_memory_item import CallMemoryItem

        item = CallMemoryItem(
            user_id=current_user.user_id,
            content=body.content,
            memory_type=body.memory_type,
            source=body.source,
            call_id=body.call_id,
            caller_phone_hash=body.caller_phone_hash,
            caller_name=body.caller_name,
            importance=body.importance,
        )
        db.add(item)
        await db.flush()

        return MemoryItemResponse.model_validate(item)
    except AppError:
        raise
    except Exception as e:
        logger.exception(
            "Failed to create memory item for user %s", current_user.user_id
        )
        raise AppError("MEMORY_ERROR", f"Failed to create memory item: {e}", 500)


@router.get("/search", response_model=MemoryListResponse)
async def search_memory_items(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryListResponse:
    try:
        from app.models.call_memory_item import CallMemoryItem

        search_term = f"%{q}%"
        base = select(CallMemoryItem).where(
            CallMemoryItem.user_id == current_user.user_id,
            CallMemoryItem.content.ilike(search_term),
        )

        count_q = select(func.count()).select_from(base.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        rows_q = (
            base.order_by(CallMemoryItem.created_at.desc()).limit(limit).offset(offset)
        )
        result = await db.execute(rows_q)
        items = list(result.scalars().all())

        return MemoryListResponse(
            items=[MemoryItemResponse.model_validate(i) for i in items],
            total=total,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to search memory items for user %s", current_user.user_id)
        raise AppError("MEMORY_ERROR", f"Failed to search memory items: {e}", 500)


@router.get("/caller/{phone_hash}", response_model=MemoryListResponse)
async def get_caller_memories(
    phone_hash: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemoryListResponse:
    try:
        from app.models.call_memory_item import CallMemoryItem

        base = select(CallMemoryItem).where(
            CallMemoryItem.user_id == current_user.user_id,
            CallMemoryItem.caller_phone_hash == phone_hash,
        )

        count_q = select(func.count()).select_from(base.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        rows_q = (
            base.order_by(CallMemoryItem.created_at.desc()).limit(limit).offset(offset)
        )
        result = await db.execute(rows_q)
        items = list(result.scalars().all())

        return MemoryListResponse(
            items=[MemoryItemResponse.model_validate(i) for i in items],
            total=total,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception(
            "Failed to get caller memories for user %s, caller %s",
            current_user.user_id,
            phone_hash,
        )
        raise AppError("MEMORY_ERROR", f"Failed to get caller memories: {e}", 500)


@router.delete("/{memory_id}", status_code=204)
async def delete_memory_item(
    memory_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        from app.models.call_memory_item import CallMemoryItem

        result = await db.execute(
            select(CallMemoryItem).where(
                CallMemoryItem.id == memory_id,
                CallMemoryItem.user_id == current_user.user_id,
            )
        )
        item = result.scalars().first()
        if item is None:
            raise AppError("MEMORY_NOT_FOUND", "Memory item not found", 404)

        await db.delete(item)
        await db.flush()
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to delete memory item %s", memory_id)
        raise AppError("MEMORY_ERROR", f"Failed to delete memory item: {e}", 500)
