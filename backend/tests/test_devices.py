"""Integration tests for device management."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_list_devices(client: AsyncClient):
    user_data = await create_test_user(client, "devlist@test.com", "SecurePassword123!")

    resp = await client.get(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {user_data['access_token']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_register_device(client: AsyncClient):
    user_data = await create_test_user(client, "devreg@test.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/devices/register-or-update",
        headers={"Authorization": f"Bearer {user_data['access_token']}"},
        json={"platform": "android", "device_name": "My Pixel"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "android"
    assert data["device_name"] == "My Pixel"
