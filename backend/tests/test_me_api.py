"""Tests for /api/v1/me endpoint."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    user_data = await create_test_user(client, "me@example.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user_data['access_token']}"}

    resp = await client.get("/api/v1/me", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "me@example.com"
    assert body["email_verified"] is True
    assert "id" in body
    assert "created_at" in body


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient):
    user_data = await create_test_user(client, "update@example.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user_data['access_token']}"}

    resp = await client.patch(
        "/api/v1/me",
        headers=headers,
        json={"display_name": "Matt", "default_timezone": "America/New_York"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["display_name"] == "Matt"
    assert body["default_timezone"] == "America/New_York"
