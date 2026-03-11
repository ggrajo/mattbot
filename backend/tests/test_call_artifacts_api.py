"""Test call artifacts API."""

import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user

BASE = "/api/v1"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


async def _create_user_with_call(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    await client.post(
        f"{BASE}/dev/billing/set-plan",
        headers=headers,
        json={"plan": "standard", "status": "active"},
    )
    resp = await client.post(f"{BASE}/numbers/provision", headers=headers)
    assert resp.status_code in (200, 201)
    e164 = resp.json()["e164"]

    await client.post(
        "/webhooks/twilio/voice",
        data={
            "CallSid": f"CA_art_{email}",
            "From": "+15559876543",
            "To": e164,
            "CallStatus": "ringing",
        },
    )

    list_resp = await client.get(f"{BASE}/calls", headers=headers)
    call_id = list_resp.json()["calls"][0]["id"]

    return {"headers": headers, "call_id": call_id}


@pytest.mark.asyncio
async def test_get_artifacts_empty(client: AsyncClient):
    """GET /calls/{call_id}/artifacts returns empty list when no artifacts."""
    info = await _create_user_with_call(client, "art-empty@test.com")
    resp = await client.get(
        f"{BASE}/calls/{info['call_id']}/artifacts", headers=info["headers"]
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_artifacts_not_found(client: AsyncClient):
    """GET /calls/{bad_id}/artifacts returns 404 for unknown call."""
    headers = await _auth_headers(client, "art-404@test.com")
    resp = await client.get(
        f"{BASE}/calls/00000000-0000-0000-0000-000000000000/artifacts",
        headers=headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_artifacts_requires_auth(client: AsyncClient):
    """GET /calls/{call_id}/artifacts requires authentication."""
    resp = await client.get(
        f"{BASE}/calls/00000000-0000-0000-0000-000000000000/artifacts"
    )
    assert resp.status_code in (401, 422)


@pytest.mark.asyncio
async def test_other_user_cannot_see_artifacts(client: AsyncClient):
    """A different user cannot access another user's call artifacts."""
    info = await _create_user_with_call(client, "art-owner@test.com")
    other_headers = await _auth_headers(client, "art-other@test.com")

    resp = await client.get(
        f"{BASE}/calls/{info['call_id']}/artifacts", headers=other_headers
    )
    assert resp.status_code == 404
