"""Session tokens for realtime bridge authentication.

These short-lived JWTs allow the mobile client to authenticate with
the realtime WebSocket bridge without passing full user credentials.
"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt

from app.config import settings

SESSION_TOKEN_EXPIRES_MINUTES = 5


def generate_session_token(call_id: uuid.UUID, user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "call_id": str(call_id),
        "iat": now,
        "exp": now + timedelta(minutes=SESSION_TOKEN_EXPIRES_MINUTES),
        "type": "session_bridge",
    }
    return jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM)


def validate_session_token(token: str) -> dict:
    """Decode and validate a session bridge token.

    Returns dict with ``call_id`` and ``user_id`` as strings.
    Raises ``jwt.exceptions.*`` on invalid/expired tokens.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SIGNING_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    if payload.get("type") != "session_bridge":
        raise jwt.InvalidTokenError("Not a session bridge token")
    return {
        "call_id": payload["call_id"],
        "user_id": payload["sub"],
    }
