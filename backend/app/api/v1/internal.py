"""Internal API for realtime bridge communication."""

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.call import Call
from app.services import call_service

logger = logging.getLogger(__name__)

router = APIRouter()


class BridgeEvent(BaseModel):
    call_id: uuid.UUID
    event_type: str
    payload: dict | None = None
    timestamp: datetime | None = None


class BridgeEventResponse(BaseModel):
    status: str
    call_id: uuid.UUID
    event_type: str


class ArtifactCreate(BaseModel):
    artifact_type: str
    content: str | None = None
    content_url: str | None = None
    metadata: dict | None = None


class ArtifactResponse(BaseModel):
    id: uuid.UUID
    call_id: uuid.UUID
    artifact_type: str
    content: str | None = None
    content_url: str | None = None
    metadata: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EndCallRequest(BaseModel):
    reason: str = "bridge_ended"
    duration_seconds: int | None = None
    trigger_post_call: bool = True


class EndCallResponse(BaseModel):
    call_id: uuid.UUID
    status: str
    post_call_triggered: bool


async def verify_internal_token(
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
) -> str:
    expected = settings.JWT_SIGNING_KEY
    if not x_internal_token or x_internal_token != expected:
        raise AppError("UNAUTHORIZED", "Invalid internal token", 401)
    return x_internal_token


@router.post("/events", response_model=BridgeEventResponse)
async def receive_bridge_event(
    event: BridgeEvent,
    _token: str = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db),
) -> BridgeEventResponse:
    try:
        call = await db.get(Call, event.call_id)
        if call is None:
            raise AppError("CALL_NOT_FOUND", "Call not found", 404)

        if event.event_type == "call_answered":
            await call_service.transition_call(
                db, call.id, "bridge_answered", "answered"
            )
        elif event.event_type == "call_in_progress":
            await call_service.transition_call(
                db, call.id, "bridge_in_progress", "in_progress"
            )
        elif event.event_type == "call_ended":
            reason = (event.payload or {}).get("reason", "bridge_ended")
            duration = (event.payload or {}).get("duration_seconds")
            await call_service.end_call(db, call.id, reason, duration)
        else:
            await call_service.transition_call(
                db,
                call.id,
                event.event_type,
                (event.payload or {}).get("to_status", call.status),
                metadata=event.payload,
            )

        return BridgeEventResponse(
            status="accepted",
            call_id=event.call_id,
            event_type=event.event_type,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to process bridge event for call %s", event.call_id)
        raise AppError("INTERNAL_EVENT_ERROR", f"Failed to process event: {e}", 500)


@router.post("/calls/{call_id}/artifacts", response_model=ArtifactResponse)
async def create_artifact(
    call_id: uuid.UUID,
    artifact: ArtifactCreate,
    _token: str = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db),
) -> ArtifactResponse:
    try:
        call = await db.get(Call, call_id)
        if call is None:
            raise AppError("CALL_NOT_FOUND", "Call not found", 404)

        from app.models.call_artifact import CallArtifact

        db_artifact = CallArtifact(
            call_id=call_id,
            artifact_type=artifact.artifact_type,
            content=artifact.content,
            content_url=artifact.content_url,
            metadata_json=artifact.metadata,
        )
        db.add(db_artifact)
        await db.flush()

        return ArtifactResponse(
            id=db_artifact.id,
            call_id=db_artifact.call_id,
            artifact_type=db_artifact.artifact_type,
            content=db_artifact.content,
            content_url=db_artifact.content_url,
            metadata=db_artifact.metadata_json,
            created_at=db_artifact.created_at,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to create artifact for call %s", call_id)
        raise AppError("ARTIFACT_ERROR", f"Failed to create artifact: {e}", 500)


@router.post("/calls/{call_id}/end", response_model=EndCallResponse)
async def end_call(
    call_id: uuid.UUID,
    body: EndCallRequest,
    _token: str = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db),
) -> EndCallResponse:
    try:
        call = await call_service.end_call(
            db, call_id, body.reason, body.duration_seconds
        )

        post_call_triggered = False
        if body.trigger_post_call:
            logger.info("Post-call processing triggered for call %s", call_id)
            post_call_triggered = True

        return EndCallResponse(
            call_id=call.id,
            status=call.status,
            post_call_triggered=post_call_triggered,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to end call %s", call_id)
        raise AppError("CALL_END_ERROR", f"Failed to end call: {e}", 500)
