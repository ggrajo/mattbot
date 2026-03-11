import logging
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.calls import CallEventResponse, CallListResponse, CallResponse
from app.services import call_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=CallListResponse)
async def list_calls(
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallListResponse:
    try:
        calls, total = await call_service.list_calls(
            db, current_user.user_id, status=status, limit=limit, offset=offset
        )
        return CallListResponse(
            calls=[CallResponse.model_validate(c) for c in calls],
            total=total,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to list calls for user %s", current_user.user_id)
        raise AppError("CALL_ERROR", f"Failed to list calls: {e}", 500)


@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallResponse:
    try:
        call = await call_service.get_call(db, call_id, current_user.user_id)
        return CallResponse.model_validate(call)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get call %s", call_id)
        raise AppError("CALL_ERROR", f"Failed to get call: {e}", 500)


@router.get("/{call_id}/events", response_model=list[CallEventResponse])
async def get_call_events(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CallEventResponse]:
    try:
        call = await call_service.get_call(db, call_id, current_user.user_id)
        await db.refresh(call, ["events"])
        return [CallEventResponse.model_validate(e) for e in call.events]
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get events for call %s", call_id)
        raise AppError("CALL_ERROR", f"Failed to get call events: {e}", 500)
