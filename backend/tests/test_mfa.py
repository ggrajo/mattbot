"""Integration tests for MFA flows."""

import pyotp
import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_totp_login_flow(client: AsyncClient):
    user_data = await create_test_user(client, "totp@test.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "totp@test.com", "password": "SecurePassword123!"},
    )
    login_data = resp.json()
    assert login_data["requires_mfa"] is True

    totp = pyotp.TOTP(user_data["totp_secret"])
    resp = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "mfa_challenge_token": login_data["mfa_challenge_token"],
            "totp_code": totp.now(),
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_invalid_totp_rejected(client: AsyncClient):
    user_data = await create_test_user(client, "badtotp@test.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "badtotp@test.com", "password": "SecurePassword123!"},
    )
    login_data = resp.json()

    resp = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "mfa_challenge_token": login_data["mfa_challenge_token"],
            "totp_code": "000000",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_recovery_code_login(client: AsyncClient):
    user_data = await create_test_user(client, "recover@test.com", "SecurePassword123!")
    recovery_codes = user_data["recovery_codes"]

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "recover@test.com", "password": "SecurePassword123!"},
    )
    login_data = resp.json()

    resp = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "mfa_challenge_token": login_data["mfa_challenge_token"],
            "recovery_code": recovery_codes[0],
        },
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_recovery_code_single_use(client: AsyncClient):
    user_data = await create_test_user(client, "singleuse@test.com", "SecurePassword123!")
    recovery_code = user_data["recovery_codes"][0]

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "singleuse@test.com", "password": "SecurePassword123!"},
    )
    login_data = resp.json()

    resp = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "mfa_challenge_token": login_data["mfa_challenge_token"],
            "recovery_code": recovery_code,
        },
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "singleuse@test.com", "password": "SecurePassword123!"},
    )
    login_data2 = resp.json()

    resp = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "mfa_challenge_token": login_data2["mfa_challenge_token"],
            "recovery_code": recovery_code,
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_mfa_cannot_be_skipped(client: AsyncClient):
    """MFA enrollment is mandatory -- no full tokens without it."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "noskip@test.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
    )
    assert resp.status_code == 201

    from app.services.auth_service import _verification_tokens
    from app.core.security import generate_token, hash_token

    for th, (uid, exp) in list(_verification_tokens.items()):
        raw = generate_token(32)
        _verification_tokens[hash_token(raw)] = (uid, exp)
        _verification_tokens.pop(th, None)
        break

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "noskip@test.com", "password": "SecurePassword123!"},
    )
    data = resp.json()
    assert data.get("requires_mfa_enrollment") is True
    assert data.get("access_token") is None
