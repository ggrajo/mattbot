"""Integration tests for auth endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@example.com",
            "password": "StrongPassword123",
            "device": {"platform": "ios"},
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending_verification"
    assert "user_id" in data


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "weak@example.com",
            "password": "short",
            "device": {"platform": "ios"},
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_common_password(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "common@example.com",
            "password": "password1234",
            "device": {"platform": "ios"},
        },
    )
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dup@example.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
    )
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dup@example.com",
            "password": "SecurePassword456!",
            "device": {"platform": "ios"},
        },
    )
    assert resp.status_code == 400
    assert "Invalid credentials" in resp.json()["error"]["message"]


@pytest.mark.asyncio
async def test_login_nonexistent_email_uniform_error(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "nobody@example.com",
            "password": "SomePassword123!",
            "device": {"platform": "ios"},
        },
    )
    assert resp.status_code == 401
    assert "Invalid credentials" in resp.json()["error"]["message"]


@pytest.mark.asyncio
async def test_login_wrong_password_uniform_error(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "user@example.com",
            "password": "CorrectPassword123",
            "device": {"platform": "ios"},
        },
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "user@example.com",
            "password": "WrongPassword999!",
            "device": {"platform": "ios"},
        },
    )
    assert resp.status_code == 401
    assert "Invalid credentials" in resp.json()["error"]["message"]


@pytest.mark.asyncio
async def test_full_registration_and_login_flow(client: AsyncClient):
    user_data = await create_test_user(client, "full@example.com", "SecurePassword123!")
    assert "access_token" in user_data
    assert "refresh_token" in user_data
    assert len(user_data["recovery_codes"]) == 10


@pytest.mark.asyncio
async def test_login_requires_mfa_after_enrollment(client: AsyncClient):
    await create_test_user(client, "mfa@example.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "mfa@example.com",
            "password": "SecurePassword123!",
            "device": {"platform": "ios"},
        },
    )
    data = resp.json()
    assert data.get("requires_mfa") is True
    assert "mfa_challenge_token" in data


@pytest.mark.asyncio
async def test_password_reset_uniform_response(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/password/reset/request",
        json={"email": "nonexistent@example.com"},
    )
    assert resp.status_code == 200
    assert "If an account exists" in resp.json()["message"]
