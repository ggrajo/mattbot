"""Integration tests for push token registration."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_register_push_token(client: AsyncClient):
    user_data = await create_test_user(client, "push@test.com", "SecurePassword123!")

    resp = await client.get(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {user_data['access_token']}"},
    )
    devices = resp.json()["items"]
    device_id = devices[0]["id"]

    resp = await client.post(
        "/api/v1/push/register",
        headers={"Authorization": f"Bearer {user_data['access_token']}"},
        json={"device_id": device_id, "provider": "fcm", "token": "fcm-test-token-123"},
    )
    assert resp.status_code == 200
    assert "push_token_id" in resp.json()
