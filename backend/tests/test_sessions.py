"""Integration tests for session management."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient):
    user_data = await create_test_user(client, "refresh@test.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": user_data["refresh_token"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != user_data["refresh_token"]


@pytest.mark.asyncio
async def test_old_refresh_token_rejected_after_rotation(client: AsyncClient):
    user_data = await create_test_user(client, "rotate@test.com", "SecurePassword123!")
    old_refresh = user_data["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": old_refresh},
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": old_refresh},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    user_data = await create_test_user(client, "logout@test.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {user_data['access_token']}"},
    )
    assert resp.status_code == 200

    resp = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {user_data['access_token']}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_invalid_refresh_token(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": "totally-invalid-token"},
    )
    assert resp.status_code == 401
