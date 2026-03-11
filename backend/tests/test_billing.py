"""Integration tests for billing endpoints (manual billing provider)."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user

BASE = "/api/v1/billing"
DEV_BASE = "/api/v1/dev/billing"


async def _authed_headers(client: AsyncClient, email: str = "billing@test.com") -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


@pytest.mark.asyncio
async def test_billing_status_no_subscription(client: AsyncClient):
    headers = await _authed_headers(client)

    resp = await client.get(f"{BASE}/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["has_subscription"] is False
    assert data["plan"] is None
    assert data["status"] is None
    assert data["minutes_used"] == 0
    assert data["minutes_remaining"] == 0
    assert data["minutes_included"] == 0
    assert data["cancel_at_period_end"] is False


@pytest.mark.asyncio
async def test_get_plans(client: AsyncClient):
    headers = await _authed_headers(client, "plans@test.com")

    resp = await client.get(f"{BASE}/plans", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["billing_provider"] == "manual"
    assert len(data["plans"]) == 3

    codes = {p["code"] for p in data["plans"]}
    assert codes == {"free", "standard", "pro"}

    plan_map = {p["code"]: p for p in data["plans"]}
    assert plan_map["free"]["included_minutes"] == 10
    assert plan_map["standard"]["included_minutes"] == 100
    assert plan_map["pro"]["included_minutes"] == 400


@pytest.mark.asyncio
async def test_setup_intent(client: AsyncClient):
    headers = await _authed_headers(client, "setup@test.com")

    resp = await client.post(f"{BASE}/setup-intent", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "client_secret" in data
    assert data["client_secret"].startswith("seti_manual_")
    assert "customer_id" in data
    assert data["customer_id"].startswith("cus_manual_")


@pytest.mark.asyncio
async def test_subscribe_free(client: AsyncClient):
    headers = await _authed_headers(client, "subfree@test.com")

    resp = await client.post(
        f"{BASE}/subscribe",
        headers=headers,
        json={"plan": "free", "payment_method_id": "pm_test_free"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["plan"] == "free"
    assert data["status"] == "active"
    assert data["minutes_included"] == 10
    assert data["current_period_end"] is not None


@pytest.mark.asyncio
async def test_subscribe_standard(client: AsyncClient):
    headers = await _authed_headers(client, "substd@test.com")

    resp = await client.post(
        f"{BASE}/subscribe",
        headers=headers,
        json={"plan": "standard", "payment_method_id": "pm_test_std"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["plan"] == "standard"
    assert data["status"] == "active"
    assert data["minutes_included"] == 100
    assert data["current_period_end"] is not None


@pytest.mark.asyncio
async def test_change_plan_free_to_standard(client: AsyncClient):
    headers = await _authed_headers(client, "upgrade1@test.com")

    await client.post(
        f"{BASE}/subscribe",
        headers=headers,
        json={"plan": "free", "payment_method_id": "pm_test_up1"},
    )

    resp = await client.post(
        f"{BASE}/change-plan",
        headers=headers,
        json={"new_plan": "standard"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["plan"] == "standard"
    assert data["status"] == "active"
    assert data["minutes_included"] == 100
    assert data["current_period_end"] is not None


@pytest.mark.asyncio
async def test_change_plan_standard_to_pro(client: AsyncClient):
    headers = await _authed_headers(client, "upgrade2@test.com")

    await client.post(
        f"{BASE}/subscribe",
        headers=headers,
        json={"plan": "standard", "payment_method_id": "pm_test_up2"},
    )

    resp = await client.post(
        f"{BASE}/change-plan",
        headers=headers,
        json={"new_plan": "pro"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["plan"] == "pro"
    assert data["status"] == "active"
    assert data["minutes_included"] == 400
    assert data["current_period_end"] is not None


@pytest.mark.asyncio
async def test_cancel_subscription(client: AsyncClient):
    headers = await _authed_headers(client, "cancel@test.com")

    await client.post(
        f"{BASE}/subscribe",
        headers=headers,
        json={"plan": "standard", "payment_method_id": "pm_test_cancel"},
    )

    resp = await client.post(f"{BASE}/cancel", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["cancel_at_period_end"] is True
    assert data["current_period_end"] is not None
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_subscribe_invalid_plan(client: AsyncClient):
    headers = await _authed_headers(client, "invalid@test.com")

    resp = await client.post(
        f"{BASE}/subscribe",
        headers=headers,
        json={"plan": "ultra_mega", "payment_method_id": "pm_test_invalid"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_billing_gate_no_subscription(client: AsyncClient):
    headers = await _authed_headers(client, "gate@test.com")

    resp = await client.post("/api/v1/numbers/provision", headers=headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dev_set_plan(client: AsyncClient):
    headers = await _authed_headers(client, "devplan@test.com")

    resp = await client.post(
        f"{DEV_BASE}/set-plan",
        headers=headers,
        json={"plan": "pro", "status": "active"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["plan"] == "pro"
    assert data["status"] == "active"
    assert data["minutes_included"] == 400

    status_resp = await client.get(f"{BASE}/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["has_subscription"] is True
    assert status_resp.json()["plan"] == "pro"


@pytest.mark.asyncio
async def test_dev_simulate_usage_triggers_upgrade(client: AsyncClient):
    headers = await _authed_headers(client, "devusage@test.com")

    await client.post(
        f"{DEV_BASE}/set-plan",
        headers=headers,
        json={"plan": "free", "status": "active"},
    )

    resp = await client.post(
        f"{DEV_BASE}/simulate-usage-minutes",
        headers=headers,
        json={"minutes": 11},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["minutes_used"] == 11
    assert data["upgrade_triggered"] is True

    status_resp = await client.get(f"{BASE}/status", headers=headers)
    status_data = status_resp.json()
    assert status_data["plan"] == "standard"
    assert status_data["minutes_included"] == 100


@pytest.mark.asyncio
async def test_unauthenticated_returns_401(client: AsyncClient):
    endpoints = [
        ("GET", f"{BASE}/status"),
        ("GET", f"{BASE}/plans"),
        ("POST", f"{BASE}/setup-intent"),
        ("POST", f"{BASE}/subscribe"),
        ("POST", f"{BASE}/change-plan"),
        ("POST", f"{BASE}/cancel"),
        ("GET", f"{BASE}/payment-methods"),
    ]

    for method, url in endpoints:
        if method == "GET":
            resp = await client.get(url)
        else:
            resp = await client.post(url, json={})
        assert resp.status_code == 401, f"{method} {url} returned {resp.status_code}, expected 401"
