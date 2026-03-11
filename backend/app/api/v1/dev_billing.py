"""Dev-only billing endpoints for manual plan setting and usage simulation."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.billing import DevSetPlanRequest, DevSimulateUsageRequest, SubscribeResponse
from app.services import billing_service

router = APIRouter()


@router.post("/set-plan", response_model=SubscribeResponse)
async def dev_set_plan(
    body: DevSetPlanRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscribeResponse:
    return await billing_service.dev_set_plan(db, current_user.user_id, body.plan, body.status)


@router.post("/simulate-usage-minutes")
async def dev_simulate_usage(
    body: DevSimulateUsageRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await billing_service.record_usage(
        db, current_user.user_id, body.minutes, source="dev_simulation"
    )
