"""Integration tests for the calls API endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user

BASE = "/api/v1"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


async def _create_user_with_call(client: AsyncClient, email: str) -> dict:
    """Create a user, set billing, provision number, trigger inbound call."""
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
            "CallSid": f"CA_api_{email}",
            "From": "+15559876543",
            "To": e164,
            "CallStatus": "ringing",
        },
    )
    return {"headers": headers, "e164": e164}


@pytest.mark.asyncio
async def test_list_calls_empty(client: AsyncClient):
    """GET /calls returns empty list for a user with no calls."""
    headers = await _auth_headers(client, "calls-empty@test.com")
    resp = await client.get(f"{BASE}/calls", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["calls"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_calls_after_inbound(client: AsyncClient):
    """GET /calls returns the call created by the Twilio voice webhook."""
    info = await _create_user_with_call(client, "calls-list@test.com")
    resp = await client.get(f"{BASE}/calls", headers=info["headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    call = data["calls"][0]
    assert call["direction"] == "inbound"
    assert call["status"] == "ringing"
    assert call["from_number"] == "+15559876543"


@pytest.mark.asyncio
async def test_get_call_detail(client: AsyncClient):
    """GET /calls/{call_id} returns a single call."""
    info = await _create_user_with_call(client, "calls-detail@test.com")
    list_resp = await client.get(f"{BASE}/calls", headers=info["headers"])
    call_id = list_resp.json()["calls"][0]["id"]

    resp = await client.get(f"{BASE}/calls/{call_id}", headers=info["headers"])
    assert resp.status_code == 200
    assert resp.json()["id"] == call_id


@pytest.mark.asyncio
async def test_get_call_not_found(client: AsyncClient):
    """GET /calls/{bad_id} returns 404."""
    headers = await _auth_headers(client, "calls-404@test.com")
    resp = await client.get(
        f"{BASE}/calls/00000000-0000-0000-0000-000000000000", headers=headers
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_call_events(client: AsyncClient):
    """GET /calls/{call_id}/events returns at least the creation event."""
    info = await _create_user_with_call(client, "calls-events@test.com")
    list_resp = await client.get(f"{BASE}/calls", headers=info["headers"])
    call_id = list_resp.json()["calls"][0]["id"]

    resp = await client.get(
        f"{BASE}/calls/{call_id}/events", headers=info["headers"]
    )
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) >= 1
    assert events[0]["event_type"] == "call_created"
    assert events[0]["to_status"] == "ringing"


@pytest.mark.asyncio
async def test_list_calls_pagination(client: AsyncClient):
    """GET /calls supports limit and offset query parameters."""
    info = await _create_user_with_call(client, "calls-page@test.com")
    resp = await client.get(
        f"{BASE}/calls?limit=1&offset=0", headers=info["headers"]
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["calls"]) <= 1


@pytest.mark.asyncio
async def test_list_calls_filter_by_status(client: AsyncClient):
    """GET /calls?status=ringing filters correctly."""
    info = await _create_user_with_call(client, "calls-filter@test.com")
    resp = await client.get(
        f"{BASE}/calls?status=ringing", headers=info["headers"]
    )
    assert resp.status_code == 200
    for call in resp.json()["calls"]:
        assert call["status"] == "ringing"


@pytest.mark.asyncio
async def test_other_user_cannot_see_call(client: AsyncClient):
    """A different user cannot access another user's call."""
    info = await _create_user_with_call(client, "calls-owner@test.com")
    other_headers = await _auth_headers(client, "calls-other@test.com")

    list_resp = await client.get(f"{BASE}/calls", headers=info["headers"])
    call_id = list_resp.json()["calls"][0]["id"]

    resp = await client.get(f"{BASE}/calls/{call_id}", headers=other_headers)
    assert resp.status_code == 404
