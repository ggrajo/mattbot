"""Emit realtime events to the Node.js bridge for WebSocket fan-out to mobile clients."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from datetime import UTC, datetime

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=settings.EVENT_EMITTER_TIMEOUT)
    return _client


def _sign(body: bytes) -> str:
    return hmac.HMAC(
        settings.INTERNAL_EVENT_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()


async def emit_event(
    user_id: str,
    event_type: str,
    call_id: str,
    seq: int,
    payload: dict,
    privacy_level: str = "public",
) -> None:
    """Emit event to Node.js realtime service for WebSocket fan-out.

    The Node service exposes POST /internal/push-event which accepts
    ``{ user_id, envelope }`` and pushes the envelope to all of the
    user's connected WebSocket clients.
    """
    envelope = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "event_version": 1,
        "call_id": call_id,
        "ts": datetime.now(UTC).isoformat(),
        "seq": seq,
        "privacy_level": privacy_level,
        "payload": payload,
    }

    url = f"{settings.NODE_BRIDGE_INTERNAL_URL}/internal/push-event"
    body = json.dumps({"user_id": user_id, "envelope": envelope}).encode()
    signature = _sign(body)

    try:
        resp = await _get_client().post(
            url,
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Internal-Signature": signature,
            },
        )
        if resp.status_code != 200:
            logger.warning(
                "Push-event failed: status=%d type=%s call=%s",
                resp.status_code,
                event_type,
                call_id[:8],
            )
    except Exception:
        logger.exception(
            "Failed to push event to Node bridge: type=%s call=%s",
            event_type,
            call_id[:8],
        )

    logger.info(
        "Event emitted: type=%s call_id=%s user=%s seq=%d",
        event_type,
        call_id[:8],
        user_id[:8],
        seq,
    )
