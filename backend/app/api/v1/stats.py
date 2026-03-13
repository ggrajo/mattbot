"""Dashboard KPI stats endpoint."""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import case, distinct, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.models.call import Call
from app.models.call_artifact import CallArtifact
from app.models.vip_entry import VipEntry

logger = logging.getLogger(__name__)

router = APIRouter()


class DashboardStatsResponse(BaseModel):
    total_calls: int
    completed_calls: int
    unique_callers: int
    spam_blocked: int
    avg_duration_seconds: float | None
    vip_calls: int
    calls_this_week: int
    calls_last_week: int
    calls_today: int
    appointments_booked: int
    longest_call_seconds: int | None
    total_talk_minutes: int


async def _get_dashboard_stats(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> DashboardStatsResponse:
    base = select(
        func.count(Call.id).label("total_calls"),
        func.count(
            case(
                (Call.status.in_(["completed", "partial"]), Call.id),
            )
        ).label("completed_calls"),
        func.count(distinct(Call.caller_phone_hash)).label("unique_callers"),
        func.avg(
            case(
                (Call.status.in_(["completed", "partial"]), Call.duration_seconds),
            )
        ).label("avg_duration_seconds"),
    ).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
    )

    row = (await db.execute(base)).one()

    vip_hashes = (
        select(VipEntry.phone_hash)
        .where(
            VipEntry.owner_user_id == user_id,
        )
        .scalar_subquery()
    )

    vip_q = select(func.count(distinct(Call.id))).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
        Call.caller_phone_hash.in_(vip_hashes),
    )

    vip_calls = (await db.execute(vip_q)).scalar() or 0

    try:
        spam_q = select(func.count(distinct(CallArtifact.call_id))).where(
            CallArtifact.owner_user_id == user_id,
            CallArtifact.labels_json.isnot(None),
            text("jsonb_typeof(call_artifacts.labels_json::jsonb) = 'array'"),
            text(
                "EXISTS ("
                "  SELECT 1 FROM jsonb_array_elements(call_artifacts.labels_json::jsonb) AS lbl"
                "  WHERE lbl->>'label_name' IN ('spam', 'sales')"
                ")"
            ),
        )

        spam_blocked = (await db.execute(spam_q)).scalar() or 0
    except Exception:
        logger.warning("spam_blocked query failed, defaulting to 0", exc_info=True)
        spam_blocked = 0

    avg_dur = row.avg_duration_seconds
    if avg_dur is not None:
        avg_dur = round(float(avg_dur), 1)

    now = utcnow()
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    this_week_q = select(func.count(Call.id)).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
        Call.created_at >= week_start,
    )
    last_week_q = select(func.count(Call.id)).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
        Call.created_at >= prev_week_start,
        Call.created_at < week_start,
    )
    today_q = select(func.count(Call.id)).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
        Call.created_at >= today_start,
    )
    booked_q = select(func.count(Call.id)).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
        Call.booked_calendar_event_id.isnot(None),
    )
    longest_q = select(func.max(Call.duration_seconds)).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
        Call.status.in_(["completed", "partial"]),
    )
    total_talk_q = select(
        func.coalesce(func.sum(Call.duration_seconds), 0)
    ).where(
        Call.owner_user_id == user_id,
        Call.deleted_at.is_(None),
        Call.status.in_(["completed", "partial"]),
    )

    calls_this_week = (await db.execute(this_week_q)).scalar() or 0
    calls_last_week = (await db.execute(last_week_q)).scalar() or 0
    calls_today = (await db.execute(today_q)).scalar() or 0
    appointments_booked = (await db.execute(booked_q)).scalar() or 0
    longest_call = (await db.execute(longest_q)).scalar()
    total_talk_secs = (await db.execute(total_talk_q)).scalar() or 0

    return DashboardStatsResponse(
        total_calls=row.total_calls,
        completed_calls=row.completed_calls,
        unique_callers=row.unique_callers,
        spam_blocked=spam_blocked,
        avg_duration_seconds=avg_dur,
        vip_calls=vip_calls,
        calls_this_week=calls_this_week,
        calls_last_week=calls_last_week,
        calls_today=calls_today,
        appointments_booked=appointments_booked,
        longest_call_seconds=int(longest_call) if longest_call else None,
        total_talk_minutes=int(total_talk_secs) // 60,
    )


@router.get("", response_model=DashboardStatsResponse)
async def get_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardStatsResponse:
    return await _get_dashboard_stats(db, current_user.user_id)
