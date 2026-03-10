"""Integration tests for MFA flows."""

import pyotp
import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent
from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_totp_login_flow(client: AsyncClient):
    user_data = await create_test_user(client, "totp@test.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "totp@test.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
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
    await create_test_user(client, "badtotp@test.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "badtotp@test.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
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
        json={
            "email": "recover@test.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
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
    data = resp.json()
    assert data.get("requires_mfa_enrollment") is True
    assert "partial_token" in data


@pytest.mark.asyncio
async def test_recovery_code_single_use(client: AsyncClient):
    user_data = await create_test_user(client, "singleuse@test.com", "SecurePassword123!")
    recovery_code = user_data["recovery_codes"][0]

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "singleuse@test.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
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
        json={
            "email": "singleuse@test.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
    )
    login_data2 = resp.json()
    assert login_data2.get("requires_mfa_enrollment") is True, (
        "After recovery code use, MFA is disabled; login should require re-enrollment"
    )


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
    data = resp.json()

    import json

    from app.core.security import generate_token, hash_token
    from app.services.auth_service import _VERIFY_PREFIX, _memory_fallback

    raw = generate_token(32)
    th_new = hash_token(raw)
    user_id = data["user_id"]
    for key in list(_memory_fallback.keys()):
        if key.startswith(_VERIFY_PREFIX):
            payload_str, expires = _memory_fallback[key]
            payload = json.loads(payload_str)
            if payload.get("user_id") == user_id:
                _memory_fallback.pop(key)
                _memory_fallback[f"{_VERIFY_PREFIX}{th_new}"] = (
                    json.dumps({"user_id": user_id}),
                    expires,
                )
                break

    resp = await client.post("/api/v1/auth/email/verify", json={"token": raw})
    assert resp.status_code == 200

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "noskip@test.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
    )
    data = resp.json()
    assert data.get("requires_mfa_enrollment") is True
    assert data.get("access_token") is None


@pytest.mark.asyncio
async def test_reveal_recovery_codes_single_audit(client: AsyncClient, db: AsyncSession):
    user_data = await create_test_user(client, "audit@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user_data['access_token']}"}

    step_up_resp = await client.post(
        "/api/v1/auth/step-up",
        headers=headers,
        json={"password": "SecurePassword123!"},
    )
    step_up_token = step_up_resp.json()["step_up_token"]

    resp = await client.post(
        "/api/v1/auth/mfa/recovery-codes/reveal",
        headers={**headers, "X-Step-Up-Token": step_up_token},
    )
    assert resp.status_code == 200

    count = (
        await db.execute(
            select(func.count()).where(AuditEvent.event_type == "mfa.recovery_codes.regenerated")
        )
    ).scalar()
    assert count == 1, f"Expected 1 audit event, got {count}"
