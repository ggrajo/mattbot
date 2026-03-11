"""Caller profile API: aggregated caller data from calls, memory, and VIP/block lists."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import decrypt_field
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.block_entry import BlockEntry
from app.models.call import Call
from app.models.call_artifact import CallArtifact
from app.models.call_memory_item import CallMemoryItem
from app.models.vip_entry import VipEntry
from app.schemas.calls import MemoryItemResponse

router = APIRouter()


class CallerProfileResponse(BaseModel):
    caller_phone_hash: str
    call_count: int = 0
    last_call_date: str | None = None
    last_call_id: str | None = None
    last_reason: str | None = None
    avg_duration_seconds: float | None = None
    is_vip: bool = False
    vip_display_name: str | None = None
    vip_company: str | None = None
    vip_relationship: str | None = None
    vip_notes: str | None = None
    is_blocked: bool = False
    memory_items: list[MemoryItemResponse] = []
    urgency_distribution: dict[str, int] = {}


@router.get("/{phone_hash}/profile", response_model=CallerProfileResponse)
async def get_caller_profile(
    phone_hash: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallerProfileResponse:
    allowed, _ = await check_rate_limit(
        f"caller:profile:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    user_id = current_user.user.id

    stats_stmt = select(
        func.count(Call.id),
        func.max(Call.started_at),
        func.avg(Call.duration_seconds),
    ).where(
        Call.owner_user_id == user_id,
        Call.caller_phone_hash == phone_hash,
        Call.deleted_at.is_(None),
    )

    stats_result = await db.execute(stats_stmt)
    stats_row = stats_result.one()
    call_count = stats_row[0] or 0
    last_call_date_dt = stats_row[1]
    avg_duration = float(stats_row[2]) if stats_row[2] is not None else None

    if call_count == 0:
        raise AppError(
            code="CALLER_NOT_FOUND",
            message="No calls from this caller",
            status_code=404,
        )

    last_call_stmt = (
        select(Call)
        .where(
            Call.owner_user_id == user_id,
            Call.caller_phone_hash == phone_hash,
            Call.deleted_at.is_(None),
        )
        .order_by(Call.started_at.desc())
        .limit(1)
    )

    last_call_result = await db.execute(last_call_stmt)
    last_call = last_call_result.scalar_one_or_none()

    last_reason = None
    if last_call:
        artifact = (
            await db.execute(select(CallArtifact).where(CallArtifact.call_id == last_call.id))
        ).scalar_one_or_none()

        if artifact and artifact.structured_extraction:
            last_reason = artifact.structured_extraction.get("reason")

    urgency_dist = {}

    artifact_stmt = (
        select(CallArtifact.structured_extraction)
        .join(Call, CallArtifact.call_id == Call.id)
        .where(
            Call.owner_user_id == user_id,
            Call.caller_phone_hash == phone_hash,
            Call.deleted_at.is_(None),
            CallArtifact.structured_extraction.isnot(None),
        )
    )

    artifact_result = await db.execute(artifact_stmt)
    for row in artifact_result.all():
        if not row[0]:
            continue
        urgency = row[0].get("urgency_level", "normal")
        urgency_dist[urgency] = urgency_dist.get(urgency, 0) + 1

    vip = (
        await db.execute(
            select(VipEntry).where(
                VipEntry.owner_user_id == user_id,
                VipEntry.phone_hash == phone_hash,
            )
        )
    ).scalar_one_or_none()

    block = (
        await db.execute(
            select(BlockEntry).where(
                BlockEntry.owner_user_id == user_id,
                BlockEntry.phone_hash == phone_hash,
            )
        )
    ).scalar_one_or_none()

    mem_stmt = (
        select(CallMemoryItem)
        .where(
            CallMemoryItem.owner_user_id == user_id,
            CallMemoryItem.caller_phone_hash == phone_hash,
            CallMemoryItem.deleted_at.is_(None),
        )
        .order_by(CallMemoryItem.created_at.desc())
    )

    mem_result = await db.execute(mem_stmt)
    memory_rows = list(mem_result.scalars().all())

    memory_items_response = []
    for item in memory_rows:
        value = None
        try:
            value = decrypt_field(
                item.value_ciphertext,
                item.value_nonce,
                item.value_key_version,
            ).decode("utf-8")
        except Exception:
            value = "[unable to decrypt]"
        memory_items_response.append(
            MemoryItemResponse(
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
        )

    return CallerProfileResponse(
        caller_phone_hash=phone_hash,
        call_count=call_count,
        last_call_date=last_call_date_dt.isoformat() if last_call_date_dt else None,
        last_call_id=str(last_call.id) if last_call else None,
        last_reason=last_reason,
        avg_duration_seconds=avg_duration,
        is_vip=vip is not None,
        vip_display_name=vip.display_name if vip else None,
        vip_company=vip.company if vip else None,
        vip_relationship=vip.relationship if vip else None,
        vip_notes=vip.notes if vip else None,
        is_blocked=block is not None,
        memory_items=memory_items_response,
        urgency_distribution=urgency_dist,
    )
