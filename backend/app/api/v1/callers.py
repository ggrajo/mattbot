"""Caller profiles API - aggregated from memory items."""

import logging
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import distinct, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError

logger = logging.getLogger(__name__)

router = APIRouter()


class CallerMemoryItem(BaseModel):
    id: uuid.UUID
    content: str
    memory_type: str
    source: str
    importance: int
    call_id: uuid.UUID | None = None
    created_at: str

    model_config = {"from_attributes": True}


class CallerProfile(BaseModel):
    phone_hash: str
    caller_name: str | None = None
    memory_count: int = 0
    call_count: int = 0
    last_seen: str | None = None


class CallerDetailResponse(BaseModel):
    phone_hash: str
    caller_name: str | None = None
    memories: list[CallerMemoryItem]
    call_count: int = 0
    last_seen: str | None = None


class CallerListResponse(BaseModel):
    callers: list[CallerProfile]
    total: int


class CallerNameUpdate(BaseModel):
    name: str


@router.get("", response_model=CallerListResponse)
async def list_callers(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallerListResponse:
    try:
        from app.models.call_memory_item import CallMemoryItem

        base = (
            select(
                CallMemoryItem.caller_phone_hash,
                func.max(CallMemoryItem.caller_name).label("caller_name"),
                func.count(CallMemoryItem.id).label("memory_count"),
                func.count(distinct(CallMemoryItem.call_id)).label("call_count"),
                func.max(CallMemoryItem.created_at).label("last_seen"),
            )
            .where(
                CallMemoryItem.user_id == current_user.user_id,
                CallMemoryItem.caller_phone_hash.isnot(None),
            )
            .group_by(CallMemoryItem.caller_phone_hash)
        )

        count_sub = select(func.count()).select_from(base.subquery())
        total = (await db.execute(count_sub)).scalar() or 0

        rows = await db.execute(
            base.order_by(func.max(CallMemoryItem.created_at).desc())
            .limit(limit)
            .offset(offset)
        )
        callers = [
            CallerProfile(
                phone_hash=row.caller_phone_hash,
                caller_name=row.caller_name,
                memory_count=row.memory_count,
                call_count=row.call_count,
                last_seen=str(row.last_seen) if row.last_seen else None,
            )
            for row in rows
        ]
        return CallerListResponse(callers=callers, total=total)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to list callers for user %s", current_user.user_id)
        raise AppError("CALLER_ERROR", f"Failed to list callers: {e}", 500)


@router.get("/{phone_hash}", response_model=CallerDetailResponse)
async def get_caller_profile(
    phone_hash: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallerDetailResponse:
    try:
        from app.models.call_memory_item import CallMemoryItem

        result = await db.execute(
            select(CallMemoryItem)
            .where(
                CallMemoryItem.user_id == current_user.user_id,
                CallMemoryItem.caller_phone_hash == phone_hash,
            )
            .order_by(CallMemoryItem.created_at.desc())
        )
        items = list(result.scalars().all())

        if not items:
            raise AppError("CALLER_NOT_FOUND", "Caller not found", 404)

        caller_name = next((i.caller_name for i in items if i.caller_name), None)
        call_ids = {i.call_id for i in items if i.call_id}
        last_seen = max(i.created_at for i in items) if items else None

        return CallerDetailResponse(
            phone_hash=phone_hash,
            caller_name=caller_name,
            memories=[
                CallerMemoryItem(
                    id=i.id,
                    content=i.content,
                    memory_type=i.memory_type,
                    source=i.source,
                    importance=i.importance,
                    call_id=i.call_id,
                    created_at=str(i.created_at),
                )
                for i in items
            ],
            call_count=len(call_ids),
            last_seen=str(last_seen) if last_seen else None,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get caller %s", phone_hash)
        raise AppError("CALLER_ERROR", f"Failed to get caller: {e}", 500)


@router.put("/{phone_hash}/name")
async def update_caller_name(
    phone_hash: str,
    body: CallerNameUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        from app.models.call_memory_item import CallMemoryItem

        result = await db.execute(
            update(CallMemoryItem)
            .where(
                CallMemoryItem.user_id == current_user.user_id,
                CallMemoryItem.caller_phone_hash == phone_hash,
            )
            .values(caller_name=body.name)
        )

        if result.rowcount == 0:
            raise AppError("CALLER_NOT_FOUND", "No memories for this caller", 404)

        await db.flush()
        return {"phone_hash": phone_hash, "caller_name": body.name}
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to update caller name for %s", phone_hash)
        raise AppError("CALLER_ERROR", f"Failed to update caller name: {e}", 500)
