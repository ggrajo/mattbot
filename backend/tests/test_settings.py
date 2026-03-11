"""Integration tests for user settings API."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_get_settings_returns_defaults(client: AsyncClient):
    user = await create_test_user(client, "settings1@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["notification_privacy_mode"] == "private"
    assert data["quiet_hours_enabled"] is False
    assert data["memory_enabled"] is True
    assert data["data_retention_days"] == 30
    assert data["biometric_unlock_enabled"] is False
    assert data["theme_preference"] == "system"
    assert data["revision"] >= 1


@pytest.mark.asyncio
async def test_patch_settings_basic(client: AsyncClient):
    user = await create_test_user(client, "settings2@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={
            "expected_revision": rev,
            "changes": {
                "memory_enabled": False,
                "theme_preference": "dark",
            },
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["revision"] == rev + 1
    assert data["settings"]["memory_enabled"] is False
    assert data["settings"]["theme_preference"] == "dark"


@pytest.mark.asyncio
async def test_patch_settings_revision_conflict(client: AsyncClient):
    user = await create_test_user(client, "settings3@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={"expected_revision": rev + 999, "changes": {"memory_enabled": False}},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_patch_settings_quiet_hours(client: AsyncClient):
    user = await create_test_user(client, "settings4@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={
            "expected_revision": rev,
            "changes": {
                "quiet_hours_enabled": True,
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "07:00",
                "quiet_hours_days": [0, 1, 2, 3, 4, 5, 6],
            },
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["settings"]["quiet_hours_enabled"] is True
    assert data["settings"]["quiet_hours_start"] == "22:00"
    assert data["settings"]["quiet_hours_end"] == "07:00"


@pytest.mark.asyncio
async def test_patch_settings_invalid_privacy_mode(client: AsyncClient):
    user = await create_test_user(client, "settings5@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={
            "expected_revision": rev,
            "changes": {"notification_privacy_mode": "invalid"},
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_settings_user_isolation(client: AsyncClient):
    user1 = await create_test_user(client, "iso1@test.com", "SecurePassword123!")
    user2 = await create_test_user(client, "iso2@test.com", "SecurePassword123!")

    h1 = {"Authorization": f"Bearer {user1['access_token']}"}
    h2 = {"Authorization": f"Bearer {user2['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=h1)
    rev1 = resp.json()["revision"]
    await client.patch(
        "/api/v1/settings",
        headers=h1,
        json={"expected_revision": rev1, "changes": {"theme_preference": "dark"}},
    )

    resp = await client.get("/api/v1/settings", headers=h2)
    assert resp.json()["theme_preference"] == "system"


@pytest.mark.asyncio
async def test_patch_settings_revision_increment(client: AsyncClient):
    user = await create_test_user(client, "settings6@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={"expected_revision": rev, "changes": {"memory_enabled": False}},
    )
    new_rev = resp.json()["revision"]
    assert new_rev == rev + 1

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={"expected_revision": new_rev, "changes": {"memory_enabled": True}},
    )
    assert resp.json()["revision"] == new_rev + 1
