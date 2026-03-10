import uuid
from datetime import UTC, datetime, timedelta

import jwt

from app.core.clock import utcnow
from app.config import settings


def create_access_token(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    device_id: uuid.UUID,
    expires_minutes: int | None = None,
) -> str:
    exp_minutes = expires_minutes or settings.JWT_ACCESS_TOKEN_MINUTES
    now = utcnow()
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "did": str(device_id),
        "iat": now,
        "exp": now + timedelta(minutes=exp_minutes),
        "kid": settings.JWT_KEY_ID,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM)


def create_partial_token(
    user_id: uuid.UUID,
    device_id: uuid.UUID,
    purpose: str,
    expires_minutes: int = 10,
) -> str:
    now = utcnow()
    payload = {
        "sub": str(user_id),
        "did": str(device_id),
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "kid": settings.JWT_KEY_ID,
        "type": purpose,
    }
    return jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: str | None = None) -> dict:
    """Decode and validate a JWT. Raises jwt.exceptions on failure."""
    payload = jwt.decode(
        token,
        settings.JWT_SIGNING_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    if expected_type and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(
            f"Expected token type '{expected_type}', got '{payload.get('type')}'"
        )
    return payload
