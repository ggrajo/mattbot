"""Tests for session bridge token generation and validation."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.config import settings
from app.core.session_token import (
    SESSION_TOKEN_EXPIRES_MINUTES,
    generate_session_token,
    validate_session_token,
)


@pytest.mark.asyncio
async def test_generate_session_token():
    call_id = uuid.uuid4()
    user_id = uuid.uuid4()

    token = generate_session_token(call_id, user_id)
    assert isinstance(token, str)
    assert len(token) > 0

    payload = jwt.decode(token, settings.JWT_SIGNING_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == str(user_id)
    assert payload["call_id"] == str(call_id)
    assert payload["type"] == "session_bridge"


@pytest.mark.asyncio
async def test_validate_session_token():
    call_id = uuid.uuid4()
    user_id = uuid.uuid4()

    token = generate_session_token(call_id, user_id)
    result = validate_session_token(token)

    assert result["call_id"] == str(call_id)
    assert result["user_id"] == str(user_id)


@pytest.mark.asyncio
async def test_expired_token_rejected():
    now = datetime.now(UTC)
    payload = {
        "sub": str(uuid.uuid4()),
        "call_id": str(uuid.uuid4()),
        "iat": now - timedelta(minutes=10),
        "exp": now - timedelta(minutes=5),
        "type": "session_bridge",
    }
    token = jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM)

    with pytest.raises(jwt.ExpiredSignatureError):
        validate_session_token(token)


@pytest.mark.asyncio
async def test_tampered_token_rejected():
    call_id = uuid.uuid4()
    user_id = uuid.uuid4()

    token = generate_session_token(call_id, user_id)
    tampered = token[:-4] + "XXXX"

    with pytest.raises(jwt.exceptions.DecodeError):
        validate_session_token(tampered)
