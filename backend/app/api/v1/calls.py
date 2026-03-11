import hashlib
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


def _phone_hash(number: str) -> str:
    return hashlib.sha256(number.strip().encode()).hexdigest()[:16]


@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallResponse:
    try:
        call = await call_service.get_call(db, call_id, current_user.user_id)
        resp = CallResponse.model_validate(call)

        phone_hash = _phone_hash(call.from_number)
        resp.caller_phone_hash = phone_hash

        from app.models.call_memory_item import CallMemoryItem

        mem_result = await db.execute(
            select(
                func.count(CallMemoryItem.id),
                func.max(CallMemoryItem.caller_name),
            ).where(
                CallMemoryItem.user_id == current_user.user_id,
                CallMemoryItem.caller_phone_hash == phone_hash,
            )
        )
        row = mem_result.one()
        resp.memory_count = row[0] or 0
        resp.caller_name = row[1]

        return resp
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


@router.delete("/{call_id}", status_code=204)
async def delete_call(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await call_service.delete_call(db, call_id, current_user.user_id)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to delete call %s", call_id)
        raise AppError("CALL_ERROR", f"Failed to delete call: {e}", 500)


class CallArtifactResponse(BaseModel):
    id: uuid.UUID
    call_id: uuid.UUID
    artifact_type: str
    content: str | None = None
    content_url: str | None = None
    metadata: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/{call_id}/artifacts", response_model=list[CallArtifactResponse])
async def get_call_artifacts(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CallArtifactResponse]:
    try:
        call = await call_service.get_call(db, call_id, current_user.user_id)

        from app.models.call_artifact import CallArtifact

        result = await db.execute(
            select(CallArtifact)
            .where(CallArtifact.call_id == call.id)
            .order_by(CallArtifact.created_at)
        )
        artifacts = list(result.scalars().all())
        return [
            CallArtifactResponse(
                id=a.id,
                call_id=a.call_id,
                artifact_type=a.artifact_type,
                content=a.content,
                content_url=a.content_url,
                metadata=a.metadata_json,
                created_at=a.created_at,
            )
            for a in artifacts
        ]
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get artifacts for call %s", call_id)
        raise AppError("CALL_ERROR", f"Failed to get call artifacts: {e}", 500)
