"""Integration tests for the telephony system API."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user

BASE = "/api/v1"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


async def _create_user_with_billing(client: AsyncClient, email: str) -> dict:
    """Create a test user and activate a billing subscription."""
    user = await create_test_user(client, email, "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.post(
        f"{BASE}/dev/billing/set-plan",
        headers=headers,
        json={"plan": "standard", "status": "active"},
    )
    assert resp.status_code in (200, 201), f"Failed to set billing plan: {resp.text}"
    return headers


# ---------------------------------------------------------------------------
# Number provisioning
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_provision_blocked_without_billing(client: AsyncClient):
    """POST /numbers/provision without an active subscription returns 403."""
    headers = await _auth_headers(client, "tel-nobill@test.com")

    resp = await client.post(f"{BASE}/numbers/provision", headers=headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_provision_with_billing(client: AsyncClient):
    """POST /numbers/provision succeeds once billing is active (simulated number)."""
    headers = await _create_user_with_billing(client, "tel-bill@test.com")

    resp = await client.post(f"{BASE}/numbers/provision", headers=headers)
    assert resp.status_code in (200, 201)
    data = resp.json()

    assert "id" in data
    assert data["e164"].startswith("+")
    assert data["status"] in ("active", "provisioned")
    assert "provisioned_at" in data


# ---------------------------------------------------------------------------
# Number listing
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_numbers_empty(client: AsyncClient):
    """GET /numbers returns an empty list for a fresh user."""
    headers = await _auth_headers(client, "tel-empty@test.com")

    resp = await client.get(f"{BASE}/numbers", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_numbers_after_provision(client: AsyncClient):
    """After provisioning, the number appears in the list."""
    headers = await _create_user_with_billing(client, "tel-list@test.com")

    prov = await client.post(f"{BASE}/numbers/provision", headers=headers)
    assert prov.status_code in (200, 201)
    provisioned_id = prov.json()["id"]

    resp = await client.get(f"{BASE}/numbers", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) >= 1
    assert any(n["id"] == provisioned_id for n in items)


# ---------------------------------------------------------------------------
# Call modes
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_call_modes_default(client: AsyncClient):
    """GET /call-modes returns sensible defaults for a new user."""
    headers = await _auth_headers(client, "tel-modes@test.com")

    resp = await client.get(f"{BASE}/call-modes", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["mode_a_enabled"] is True
    assert data["mode_b_enabled"] is False
    assert data["access_control"] == "everyone"
    assert data["verification_status"] == "unverified"


@pytest.mark.asyncio
async def test_patch_call_modes(client: AsyncClient):
    """PATCH /call-modes updates and returns the new state."""
    headers = await _auth_headers(client, "tel-patch@test.com")

    resp = await client.patch(
        f"{BASE}/call-modes",
        headers=headers,
        json={"mode_b_enabled": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode_b_enabled"] is True
    assert data["mode_a_enabled"] is True  # unchanged


@pytest.mark.asyncio
async def test_patch_call_modes_invalid_access(client: AsyncClient):
    """PATCH /call-modes with an invalid access_control value returns 422."""
    headers = await _auth_headers(client, "tel-invacc@test.com")

    resp = await client.patch(
        f"{BASE}/call-modes",
        headers=headers,
        json={"access_control": "invalid"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Call forwarding
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_forwarding_guide(client: AsyncClient):
    """GET /forwarding/setup-guide returns instructions and carrier guides."""
    headers = await _auth_headers(client, "tel-guide@test.com")

    resp = await client.get(f"{BASE}/forwarding/setup-guide", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert isinstance(data["generic_instructions"], list)
    assert len(data["generic_instructions"]) > 0
    assert isinstance(data["carrier_guides"], list)
    assert len(data["carrier_guides"]) > 0
    guide = data["carrier_guides"][0]
    assert "carrier" in guide
    assert "enable_busy" in guide
    assert "disable" in guide


@pytest.mark.asyncio
async def test_forwarding_verify(client: AsyncClient):
    """POST /forwarding/verify initiates a verification attempt."""
    headers = await _create_user_with_billing(client, "tel-verify@test.com")

    await client.post(f"{BASE}/numbers/provision", headers=headers)

    resp = await client.post(f"{BASE}/forwarding/verify", headers=headers)
    assert resp.status_code in (200, 201)
    data = resp.json()

    assert "attempt_id" in data
    assert data["status"] == "pending"
    assert "message" in data


@pytest.mark.asyncio
async def test_forwarding_verify_status(client: AsyncClient):
    """GET /forwarding/verify/status returns current verification state."""
    headers = await _auth_headers(client, "tel-vstatus@test.com")

    resp = await client.get(f"{BASE}/forwarding/verify/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "verification_status" in data
    assert "last_verified_at" in data
    assert "latest_attempt_status" in data


# ---------------------------------------------------------------------------
# Authentication gate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unauthenticated_returns_401(client: AsyncClient):
    """All telephony endpoints require authentication."""
    endpoints = [
        ("POST", f"{BASE}/numbers/provision"),
        ("GET", f"{BASE}/numbers"),
        ("GET", f"{BASE}/call-modes"),
        ("PATCH", f"{BASE}/call-modes"),
        ("GET", f"{BASE}/forwarding/setup-guide"),
        ("POST", f"{BASE}/forwarding/verify"),
        ("GET", f"{BASE}/forwarding/verify/status"),
    ]

    for method, url in endpoints:
        resp = await getattr(client, method.lower())(url)
        assert resp.status_code == 401, (
            f"{method} {url} returned {resp.status_code}, expected 401"
        )
