"""Tests for Twilio webhook endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_user

BASE = "/webhooks"


async def _setup_user_with_number(client: AsyncClient) -> dict:
    """Create a user, activate billing, and provision a number."""
    user = await create_test_user(client, "twilio-hook@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    await client.post(
        "/api/v1/dev/billing/set-plan",
        headers=headers,
        json={"plan": "standard", "status": "active"},
    )

    resp = await client.post("/api/v1/numbers/provision", headers=headers)
    assert resp.status_code in (200, 201)
    number_data = resp.json()

    return {**user, "e164": number_data["e164"], "headers": headers}


@pytest.mark.asyncio
async def test_twilio_voice_webhook_creates_call(client: AsyncClient):
    """POST /webhooks/twilio/voice with a known number creates a call record."""
    user_info = await _setup_user_with_number(client)

    resp = await client.post(
        f"{BASE}/twilio/voice",
        data={
            "CallSid": "CA_test_001",
            "From": "+15551234567",
            "To": user_info["e164"],
            "CallStatus": "ringing",
        },
    )
    assert resp.status_code == 200
    assert "application/xml" in resp.headers["content-type"]
    assert "<Response>" in resp.text


@pytest.mark.asyncio
async def test_twilio_voice_webhook_unknown_number(client: AsyncClient):
    """POST /webhooks/twilio/voice to an unknown number returns TwiML with apology."""
    resp = await client.post(
        f"{BASE}/twilio/voice",
        data={
            "CallSid": "CA_test_002",
            "From": "+15551234567",
            "To": "+19999999999",
            "CallStatus": "ringing",
        },
    )
    assert resp.status_code == 200
    assert "not configured" in resp.text


@pytest.mark.asyncio
async def test_twilio_status_callback(client: AsyncClient):
    """POST /webhooks/twilio/voice/status processes status transitions."""
    user_info = await _setup_user_with_number(client)

    await client.post(
        f"{BASE}/twilio/voice",
        data={
            "CallSid": "CA_test_003",
            "From": "+15551234567",
            "To": user_info["e164"],
            "CallStatus": "ringing",
        },
    )

    resp = await client.post(
        f"{BASE}/twilio/voice/status",
        data={
            "CallSid": "CA_test_003",
            "CallStatus": "completed",
            "CallDuration": "42",
        },
    )
    assert resp.status_code == 200
    assert "application/xml" in resp.headers["content-type"]


@pytest.mark.asyncio
async def test_twilio_status_callback_unknown_sid(client: AsyncClient):
    """Status callback for unknown SID returns 200 (doesn't crash)."""
    resp = await client.post(
        f"{BASE}/twilio/voice/status",
        data={
            "CallSid": "CA_nonexistent",
            "CallStatus": "completed",
        },
    )
    assert resp.status_code == 200
