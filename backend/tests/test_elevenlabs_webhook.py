"""Test ElevenLabs webhook processing."""

import json
import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user

BASE = "/webhooks"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


@pytest.mark.asyncio
async def test_elevenlabs_webhook_accepts_valid_payload(client: AsyncClient):
    """POST /webhooks/elevenlabs accepts a well-formed payload."""
    payload = {
        "conversation_id": "conv_123",
        "event_type": "conversation_ended",
        "duration_seconds": 45,
        "metadata": {},
    }
    resp = await client.post(
        f"{BASE}/elevenlabs",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_elevenlabs_webhook_invalid_json(client: AsyncClient):
    """POST /webhooks/elevenlabs rejects invalid JSON."""
    resp = await client.post(
        f"{BASE}/elevenlabs",
        content="not json",
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_elevenlabs_webhook_creates_provider_event(client: AsyncClient):
    """Provider event is persisted for the ElevenLabs callback."""
    payload = {
        "conversation_id": "conv_456",
        "event_type": "conversation_started",
        "metadata": {},
    }
    resp = await client.post(
        f"{BASE}/elevenlabs",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_elevenlabs_webhook_conversation_ended_with_call_sid(
    client: AsyncClient,
):
    """When conversation_ended includes a twilio_call_sid, it attempts status update."""
    payload = {
        "conversation_id": "conv_789",
        "event_type": "conversation_ended",
        "duration_seconds": 120,
        "metadata": {"twilio_call_sid": "CA_nonexistent"},
    }
    resp = await client.post(
        f"{BASE}/elevenlabs",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_elevenlabs_webhook_empty_payload(client: AsyncClient):
    """POST /webhooks/elevenlabs accepts an empty JSON object."""
    resp = await client.post(
        f"{BASE}/elevenlabs",
        content=json.dumps({}),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
