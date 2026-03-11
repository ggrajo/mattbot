"""Tests that dev-only billing endpoints are blocked in production."""

import os

import pytest
from httpx import AsyncClient
from unittest.mock import patch

from tests.conftest import create_test_user

BASE = "/api/v1"
DEV_BASE = "/api/v1/dev/billing"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


@pytest.mark.asyncio
async def test_dev_set_plan_blocked_in_prod(client: AsyncClient):
    """POST /dev/billing/set-plan returns 403 when ENVIRONMENT != development."""
    headers = await _auth_headers(client, "guard-plan@test.com")

    with patch("app.api.v1.dev_billing.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "production"
        mock_settings.BILLING_PROVIDER = "stripe"

        resp = await client.post(
            f"{DEV_BASE}/set-plan",
            headers=headers,
            json={"plan": "pro", "status": "active"},
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dev_simulate_usage_blocked_in_prod(client: AsyncClient):
    """POST /dev/billing/simulate-usage-minutes returns 403 in production."""
    headers = await _auth_headers(client, "guard-usage@test.com")

    with patch("app.api.v1.dev_billing.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "production"
        mock_settings.BILLING_PROVIDER = "stripe"

        resp = await client.post(
            f"{DEV_BASE}/simulate-usage-minutes",
            headers=headers,
            json={"minutes": 5},
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dev_set_plan_works_in_dev(client: AsyncClient):
    """POST /dev/billing/set-plan works when BILLING_PROVIDER=manual (test env)."""
    headers = await _auth_headers(client, "guard-dev@test.com")

    resp = await client.post(
        f"{DEV_BASE}/set-plan",
        headers=headers,
        json={"plan": "standard", "status": "active"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan"] == "standard"
    assert data["status"] == "active"
