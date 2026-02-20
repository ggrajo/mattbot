"""Critical negative tests for cross-user data isolation."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_user_cannot_list_other_users_devices(client: AsyncClient):
    user_a = await create_test_user(client, "userA@test.com", "SecurePassword123!")
    user_b = await create_test_user(client, "userB@test.com", "SecurePassword456!")

    resp_a = await client.get(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {user_a['access_token']}"},
    )
    resp_b = await client.get(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {user_b['access_token']}"},
    )

    devices_a = {d["id"] for d in resp_a.json()["items"]}
    devices_b = {d["id"] for d in resp_b.json()["items"]}

    assert devices_a.isdisjoint(devices_b), "Users should not see each other's devices"


@pytest.mark.asyncio
async def test_user_cannot_revoke_other_users_device(client: AsyncClient):
    user_a = await create_test_user(client, "revokeA@test.com", "SecurePassword123!")
    user_b = await create_test_user(client, "revokeB@test.com", "SecurePassword456!")

    resp = await client.get(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {user_a['access_token']}"},
    )
    device_a_id = resp.json()["items"][0]["id"]

    import pyotp
    totp = pyotp.TOTP(user_b["totp_secret"])
    step_up_resp = await client.post(
        "/api/v1/auth/step-up",
        headers={"Authorization": f"Bearer {user_b['access_token']}"},
        json={"totp_code": totp.now()},
    )
    step_up_token = step_up_resp.json().get("step_up_token", "")

    resp = await client.post(
        f"/api/v1/devices/{device_a_id}/revoke",
        headers={
            "Authorization": f"Bearer {user_b['access_token']}",
            "X-Step-Up-Token": step_up_token,
        },
    )
    assert resp.status_code == 404, "Should return 404 not 403 to prevent ID enumeration"


@pytest.mark.asyncio
async def test_user_b_cannot_use_user_a_refresh_token(client: AsyncClient):
    user_a = await create_test_user(client, "tokenA@test.com", "SecurePassword123!")

    resp = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": user_a["refresh_token"]},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_unauthenticated_access_rejected(client: AsyncClient):
    resp = await client.get("/api/v1/devices")
    assert resp.status_code in (401, 422)

    resp = await client.get("/api/v1/me")
    assert resp.status_code in (401, 422)


@pytest.mark.asyncio
async def test_invalid_token_rejected(client: AsyncClient):
    resp = await client.get(
        "/api/v1/devices",
        headers={"Authorization": "Bearer totally-invalid-jwt-token"},
    )
    assert resp.status_code == 401
