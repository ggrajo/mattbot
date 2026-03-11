"""Integration tests for theme preference settings."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_default_theme_is_system(client: AsyncClient):
    user = await create_test_user(client, "theme1@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["theme_preference"] == "system"


@pytest.mark.asyncio
async def test_set_theme_light(client: AsyncClient):
    user = await create_test_user(client, "theme2@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={"expected_revision": rev, "changes": {"theme_preference": "light"}},
    )
    assert resp.status_code == 200
    assert resp.json()["settings"]["theme_preference"] == "light"


@pytest.mark.asyncio
async def test_set_theme_dark(client: AsyncClient):
    user = await create_test_user(client, "theme3@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={"expected_revision": rev, "changes": {"theme_preference": "dark"}},
    )
    assert resp.status_code == 200
    assert resp.json()["settings"]["theme_preference"] == "dark"


@pytest.mark.asyncio
async def test_set_theme_system(client: AsyncClient):
    user = await create_test_user(client, "theme4@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={"expected_revision": rev, "changes": {"theme_preference": "system"}},
    )
    assert resp.status_code == 200
    assert resp.json()["settings"]["theme_preference"] == "system"


@pytest.mark.asyncio
async def test_invalid_theme_rejected(client: AsyncClient):
    user = await create_test_user(client, "theme5@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    resp = await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={"expected_revision": rev, "changes": {"theme_preference": "invalid"}},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_theme_persists(client: AsyncClient):
    user = await create_test_user(client, "theme6@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/settings", headers=headers)
    rev = resp.json()["revision"]

    await client.patch(
        "/api/v1/settings",
        headers=headers,
        json={"expected_revision": rev, "changes": {"theme_preference": "dark"}},
    )

    resp = await client.get("/api/v1/settings", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["theme_preference"] == "dark"
