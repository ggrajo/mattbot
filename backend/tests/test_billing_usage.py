"""Integration tests for billing usage tracking via dev endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_simulate_usage_records_minutes(client: AsyncClient):
    user = await create_test_user(client, "usage1@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    await client.post("/api/v1/dev/billing/set-plan", headers=headers, json={"plan": "free"})

    resp = await client.post(
        "/api/v1/dev/billing/simulate-usage-minutes", headers=headers, json={"minutes": 5}
    )
    assert resp.status_code == 200

    status = await client.get("/api/v1/billing/status", headers=headers)
    assert status.status_code == 200
    assert status.json()["minutes_used"] == 5


@pytest.mark.asyncio
async def test_free_plan_overage_triggers_upgrade(client: AsyncClient):
    user = await create_test_user(client, "usage2@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    await client.post("/api/v1/dev/billing/set-plan", headers=headers, json={"plan": "free"})

    resp = await client.post(
        "/api/v1/dev/billing/simulate-usage-minutes", headers=headers, json={"minutes": 11}
    )
    assert resp.status_code == 200

    status = await client.get("/api/v1/billing/status", headers=headers)
    assert status.status_code == 200
    assert status.json()["plan"] == "standard"


@pytest.mark.asyncio
async def test_usage_requires_auth(client: AsyncClient):
    resp = await client.post(
        "/api/v1/dev/billing/simulate-usage-minutes", json={"minutes": 5}
    )
    assert resp.status_code == 401
