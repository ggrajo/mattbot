"""HMAC-signed session tokens for Twilio Media Streams and internal events."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid

from app.config import settings


class InvalidSessionTokenError(Exception):
    pass


def create_stream_session_token(call_id: uuid.UUID, user_id: uuid.UUID) -> str:
    """Create an HMAC-signed token containing call_id, user_id, and expiry."""

    secret = settings.INTERNAL_EVENT_SECRET
    if not secret:
        secret = settings.JWT_SIGNING_KEY

    payload = {
        "cid": str(call_id),
        "uid": str(user_id),
        "exp": int(time.time()) + settings.STREAM_SESSION_TOKEN_TTL,
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    sig = hmac.new(
        secret.encode("utf-8"),
        payload_json.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_json}.{sig}"


def verify_stream_session_token(token: str) -> tuple[uuid.UUID, uuid.UUID]:
    """Verify token and return (call_id, user_id). Raises InvalidSessionTokenError."""

    secret = settings.INTERNAL_EVENT_SECRET
    if not secret:
        secret = settings.JWT_SIGNING_KEY

    parts = token.rsplit(".", 1)
    if len(parts) != 2:
        raise InvalidSessionTokenError("malformed token")

    payload_json, provided_sig = parts

    expected_sig = hmac.new(
        secret.encode("utf-8"),
        payload_json.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(provided_sig, expected_sig):
        raise InvalidSessionTokenError("invalid signature")

    try:
        payload = json.loads(payload_json)
    except json.JSONDecodeError as exc:
        raise InvalidSessionTokenError("invalid payload") from exc

    if payload.get("exp", 0) < time.time():
        raise InvalidSessionTokenError("token expired")

    try:
        call_id = uuid.UUID(payload["cid"])
        user_id = uuid.UUID(payload["uid"])
    except (KeyError, ValueError) as exc:
        raise InvalidSessionTokenError("missing or invalid ids") from exc

    return (call_id, user_id)


def compute_internal_hmac(body: bytes) -> str:
    """Compute HMAC-SHA256 for internal event payloads (Node -> FastAPI)."""
    secret = settings.INTERNAL_EVENT_SECRET
    if not secret:
        secret = settings.JWT_SIGNING_KEY
    return hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()


def verify_internal_hmac(body: bytes, provided_signature: str) -> bool:
    """Verify HMAC signature for internal events."""
    expected = compute_internal_hmac(body)
    return hmac.compare_digest(expected, provided_signature)


def compute_elevenlabs_hmac(body: bytes) -> str:
    """Compute HMAC-SHA256 for ElevenLabs webhook payloads."""
    secret = settings.ELEVENLABS_WEBHOOK_SECRET
    if not secret:
        return ""
    return hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()


def verify_elevenlabs_hmac(body: bytes, provided_signature: str) -> bool:
    """Verify HMAC signature from ElevenLabs webhooks."""
    secret = settings.ELEVENLABS_WEBHOOK_SECRET
    if not secret:
        return True
    expected = compute_elevenlabs_hmac(body)
    return hmac.compare_digest(expected, provided_signature)
