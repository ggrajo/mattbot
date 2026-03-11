from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.models.billing_usage import BillingUsage
from app.models.call import Call
from app.models.call_memory_item import CallMemoryItem

router = APIRouter()


@router.get("/")
async def get_user_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_calls = await db.scalar(
        select(func.count(Call.id)).where(Call.user_id == current_user.user_id)
    )
    usage = await db.scalar(
        select(BillingUsage.minutes_used).where(
            BillingUsage.user_id == current_user.user_id
        )
    )
    memory_count = await db.scalar(
        select(func.count(CallMemoryItem.id)).where(
            CallMemoryItem.user_id == current_user.user_id
        )
    )
    return {
        "total_calls": total_calls or 0,
        "minutes_used": usage or 0,
        "memory_items": memory_count or 0,
    }
