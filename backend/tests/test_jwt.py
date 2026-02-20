"""Unit tests for core/jwt_utils.py"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt as pyjwt
import pytest

from app.core.jwt_utils import create_access_token, create_partial_token, decode_token


def test_create_and_decode_access_token():
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    device_id = uuid.uuid4()

    token = create_access_token(user_id, session_id, device_id)
    payload = decode_token(token, expected_type="access")

    assert payload["sub"] == str(user_id)
    assert payload["sid"] == str(session_id)
    assert payload["did"] == str(device_id)
    assert payload["type"] == "access"


def test_expired_token_rejected():
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    device_id = uuid.uuid4()

    token = create_access_token(user_id, session_id, device_id, expires_minutes=-1)

    with pytest.raises(pyjwt.ExpiredSignatureError):
        decode_token(token)


def test_wrong_type_rejected():
    user_id = uuid.uuid4()
    device_id = uuid.uuid4()

    token = create_partial_token(user_id, device_id, "mfa_challenge")

    with pytest.raises(pyjwt.InvalidTokenError):
        decode_token(token, expected_type="access")


def test_partial_token():
    user_id = uuid.uuid4()
    device_id = uuid.uuid4()

    token = create_partial_token(user_id, device_id, "mfa_enrollment", expires_minutes=5)
    payload = decode_token(token, expected_type="mfa_enrollment")

    assert payload["sub"] == str(user_id)
    assert payload["type"] == "mfa_enrollment"
