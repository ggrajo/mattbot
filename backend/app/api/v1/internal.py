"""Internal API for Node bridge lifecycle events and agent runtime config."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings as app_settings
from app.core.rate_limiter import check_rate_limit
from app.core.session_token import verify_internal_hmac
from app.database import get_db
from app.services import agent_service, artifact_service, call_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_internal_api_key(request: Request) -> bool:
    """Verify the X-Internal-Api-Key header for internal endpoints."""
    key = request.headers.get("X-Internal-Api-Key", "")
    expected = app_settings.INTERNAL_NODE_API_KEY
    if not expected:
        return False
    return key == expected


@router.get("/calls/{call_id}/agent-runtime")
async def get_agent_runtime(
    call_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Return merged agent runtime config for a call. Secured by API key."""
    if not _verify_internal_api_key(request):
        return Response(status_code=403, content="Forbidden")

    allowed, _ = await check_rate_limit(
        "internal:agent-runtime",
        max_requests=app_settings.RATE_LIMIT_INTERNAL_MAX,
        window_seconds=app_settings.RATE_LIMIT_INTERNAL_WINDOW,
    )
    if not allowed:
        return Response(status_code=429, content="Rate limited")

    try:
        cid = uuid.UUID(call_id)
    except ValueError:
        return Response(status_code=400, content="Invalid call_id")

    runtime = await agent_service.get_agent_runtime_config(db, cid)
    if runtime is None:
        return Response(status_code=404, content="Call or agent not found")

    return Response(
        content=json.dumps(runtime),
        media_type="application/json",
    )


@router.post("/events")
async def receive_bridge_event(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:

    body = await request.body()

    allowed, _ = await check_rate_limit(
        "internal:events",
        max_requests=app_settings.RATE_LIMIT_INTERNAL_MAX,
        window_seconds=app_settings.RATE_LIMIT_INTERNAL_WINDOW,
    )
    if not allowed:
        return Response(status_code=429, content="Rate limited")

    signature = request.headers.get("X-Internal-Signature", "")
    if not verify_internal_hmac(body, signature):
        logger.warning("Invalid internal event HMAC signature")
        return Response(status_code=403, content="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return Response(status_code=400, content="Invalid JSON")

    event_type = payload.get("event_type", "")
    call_id_str = payload.get("call_id", "")
    user_id_str = payload.get("user_id", "")
    conversation_id = payload.get("elevenlabs_conversation_id", "")
    duration_seconds = payload.get("duration_seconds")
    error_message = payload.get("error_message", "")
    timestamp = payload.get("timestamp", "")

    try:
        call_id = uuid.UUID(call_id_str) if call_id_str else None
        user_id = uuid.UUID(user_id_str) if user_id_str else None
    except ValueError:
        return Response(status_code=400, content="Invalid UUID")

    if not call_id or not user_id or not event_type:
        return Response(status_code=400, content="Missing required fields")

    redacted = {
        "event_type": event_type,
        "call_id": call_id_str,
        "conversation_id": conversation_id[:20] if conversation_id else "",
        "timestamp": timestamp,
    }

    await call_service.record_provider_event(
        db,
        provider="elevenlabs",
        event_type=f"bridge_{event_type}",
        call_sid=conversation_id or None,
        raw_params=redacted,
        signature_valid=True,
        call_id=call_id,
        owner_user_id=user_id,
    )

    if event_type == "stream_connected":
        await artifact_service.create_ai_session(
            db,
            call_id=call_id,
            user_id=user_id,
            status="connected",
            provider_session_id=conversation_id or None,
        )

    elif event_type == "ai_session_created":
        await artifact_service.update_ai_session(
            db,
            call_id=call_id,
            status="active",
            provider_session_id=conversation_id,
        )

    elif event_type == "stream_ended":
        await artifact_service.update_ai_session(
            db,
            call_id=call_id,
            status="completed",
            provider_session_id=conversation_id or None,
            ended_at=datetime.now(UTC),
            duration_seconds=duration_seconds,
        )

        await artifact_service.trigger_post_call_processing(
            db,
            call_id=call_id,
            user_id=user_id,
            conversation_id=conversation_id,
        )

    elif event_type in ("ai_session_failed", "stream_error"):
        error_redacted = error_message[:200] if error_message else None
        await artifact_service.update_ai_session(
            db,
            call_id=call_id,
            status="failed",
            provider_session_id=conversation_id or None,
            ended_at=datetime.now(UTC),
            last_error_redacted=error_redacted,
        )

    await db.commit()
    return Response(
        content=json.dumps({"received": True, "event_type": event_type}),
        media_type="application/json",
    )
