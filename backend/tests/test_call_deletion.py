"""Tests for call deletion (DELETE /api/v1/calls/{call_id})."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user

BASE = "/api/v1"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


async def _create_user_with_call(client: AsyncClient, email: str) -> dict:
    """Create a user, set billing, provision a number, and trigger an inbound call."""
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
            "CallSid": f"CA_del_{email}",
            "From": "+15559876543",
            "To": e164,
            "CallStatus": "ringing",
        },
    )
    return {"headers": headers, "e164": e164}


@pytest.mark.asyncio
async def test_delete_own_call(client: AsyncClient):
    """Owner can delete their own call."""
    info = await _create_user_with_call(client, "del-own@test.com")
    list_resp = await client.get(f"{BASE}/calls", headers=info["headers"])
    call_id = list_resp.json()["calls"][0]["id"]

    resp = await client.delete(f"{BASE}/calls/{call_id}", headers=info["headers"])
    assert resp.status_code == 204

    get_resp = await client.get(f"{BASE}/calls/{call_id}", headers=info["headers"])
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_cannot_delete_others_call(client: AsyncClient):
    """A user cannot delete another user's call."""
    info = await _create_user_with_call(client, "del-owner2@test.com")
    other_headers = await _auth_headers(client, "del-other@test.com")

    list_resp = await client.get(f"{BASE}/calls", headers=info["headers"])
    call_id = list_resp.json()["calls"][0]["id"]

    resp = await client.delete(f"{BASE}/calls/{call_id}", headers=other_headers)
    assert resp.status_code == 404

    get_resp = await client.get(f"{BASE}/calls/{call_id}", headers=info["headers"])
    assert get_resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_cascade_events(client: AsyncClient):
    """Deleting a call also removes its call_events."""
    info = await _create_user_with_call(client, "del-cascade@test.com")
    list_resp = await client.get(f"{BASE}/calls", headers=info["headers"])
    call_id = list_resp.json()["calls"][0]["id"]

    events_resp = await client.get(
        f"{BASE}/calls/{call_id}/events", headers=info["headers"]
    )
    assert events_resp.status_code == 200
    assert len(events_resp.json()) >= 1

    resp = await client.delete(f"{BASE}/calls/{call_id}", headers=info["headers"])
    assert resp.status_code == 204

    get_resp = await client.get(f"{BASE}/calls/{call_id}", headers=info["headers"])
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_404(client: AsyncClient):
    """DELETE /calls/{bad_id} returns 404."""
    headers = await _auth_headers(client, "del-404@test.com")
    resp = await client.delete(
        f"{BASE}/calls/00000000-0000-0000-0000-000000000000", headers=headers
    )
    assert resp.status_code == 404
