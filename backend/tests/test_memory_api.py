"""Tests for /api/v1/memory endpoint."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_list_memories_empty(client: AsyncClient):
    user_data = await create_test_user(client, "mem@example.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user_data['access_token']}"}

    resp = await client.get("/api/v1/memory", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0


@pytest.mark.asyncio
async def test_create_memory(client: AsyncClient):
    user_data = await create_test_user(client, "memcreate@example.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user_data['access_token']}"}

    resp = await client.post(
        "/api/v1/memory",
        headers=headers,
        json={"content": "Remember to call dentist", "memory_type": "note"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["content"] == "Remember to call dentist"
    assert body["memory_type"] == "note"
    assert body["source"] == "user"

    resp = await client.get("/api/v1/memory", headers=headers)
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_delete_memory(client: AsyncClient):
    user_data = await create_test_user(client, "memdel@example.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user_data['access_token']}"}

    resp = await client.post(
        "/api/v1/memory",
        headers=headers,
        json={"content": "Temporary note"},
    )
    memory_id = resp.json()["id"]

    resp = await client.delete(f"/api/v1/memory/{memory_id}", headers=headers)
    assert resp.status_code == 204

    resp = await client.get("/api/v1/memory", headers=headers)
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_memory_user_isolation(client: AsyncClient):
    user_a = await create_test_user(client, "iso_a@example.com", "SecurePassword123!")
    user_b = await create_test_user(client, "iso_b@example.com", "SecurePassword456!")
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

    await client.post(
        "/api/v1/memory",
        headers=headers_a,
        json={"content": "User A secret"},
    )

    resp = await client.get("/api/v1/memory", headers=headers_b)
    assert resp.json()["total"] == 0

    resp = await client.get("/api/v1/memory", headers=headers_a)
    assert resp.json()["total"] == 1
