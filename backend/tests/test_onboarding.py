"""Integration tests for onboarding state machine API."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user


@pytest.mark.asyncio
async def test_get_onboarding_initial_state(client: AsyncClient):
    user = await create_test_user(client, "onboard1@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/onboarding", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "account_created" in data["steps_completed"]
    assert "email_verified" in data["steps_completed"]
    assert "mfa_enrolled" in data["steps_completed"]
    assert data["is_complete"] is False
    assert data["current_step"] == "privacy_review"


@pytest.mark.asyncio
async def test_complete_single_step(client: AsyncClient):
    user = await create_test_user(client, "onboard2@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.post(
        "/api/v1/onboarding/complete-step",
        headers=headers,
        json={"step": "privacy_review"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "privacy_review" in data["steps_completed"]
    assert data["current_step"] == "settings_configured"


@pytest.mark.asyncio
async def test_complete_full_onboarding(client: AsyncClient):
    """Walk through all completable steps in sequence."""
    user = await create_test_user(client, "onboard3@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    steps_to_complete = [
        "privacy_review",
        "settings_configured",
        "assistant_setup",
        "calendar_setup",
        "plan_selected",
        "payment_method_added",
        "number_provisioned",
        "call_modes_configured",
        "onboarding_complete",
    ]

    for step in steps_to_complete:
        resp = await client.post(
            "/api/v1/onboarding/complete-step",
            headers=headers,
            json={"step": step},
        )
        assert resp.status_code == 200, (
            f"Step '{step}' failed with {resp.status_code}: {resp.json()}"
        )

    data = resp.json()
    assert data["is_complete"] is True
    assert data["current_step"] == "onboarding_complete"


@pytest.mark.asyncio
async def test_cannot_skip_steps(client: AsyncClient):
    user = await create_test_user(client, "onboard4@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.post(
        "/api/v1/onboarding/complete-step",
        headers=headers,
        json={"step": "settings_configured"},
    )
    assert resp.status_code == 400
    assert "privacy_review" in resp.json()["error"]["message"]


@pytest.mark.asyncio
async def test_completing_already_completed_step_is_idempotent(client: AsyncClient):
    user = await create_test_user(client, "onboard5@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.post(
        "/api/v1/onboarding/complete-step",
        headers=headers,
        json={"step": "privacy_review"},
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/api/v1/onboarding/complete-step",
        headers=headers,
        json={"step": "privacy_review"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_cannot_complete_steps_after_onboarding_done(client: AsyncClient):
    user = await create_test_user(client, "onboard6@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    steps = [
        "privacy_review",
        "settings_configured",
        "assistant_setup",
        "calendar_setup",
        "plan_selected",
        "payment_method_added",
        "number_provisioned",
        "call_modes_configured",
        "onboarding_complete",
    ]
    for step in steps:
        resp = await client.post(
            "/api/v1/onboarding/complete-step",
            headers=headers,
            json={"step": step},
        )
        assert resp.status_code == 200, (
            f"Step '{step}' failed with {resp.status_code}: {resp.json()}"
        )

    resp = await client.post(
        "/api/v1/onboarding/complete-step",
        headers=headers,
        json={"step": "privacy_review"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_complete"] is True


@pytest.mark.asyncio
async def test_onboarding_user_isolation(client: AsyncClient):
    user1 = await create_test_user(client, "onbiso1@test.com", "SecurePassword123!")
    user2 = await create_test_user(client, "onbiso2@test.com", "SecurePassword123!")

    await client.post(
        "/api/v1/onboarding/complete-step",
        headers={"Authorization": f"Bearer {user1['access_token']}"},
        json={"step": "privacy_review"},
    )

    resp = await client.get(
        "/api/v1/onboarding",
        headers={"Authorization": f"Bearer {user2['access_token']}"},
    )
    assert "privacy_review" not in resp.json()["steps_completed"]


@pytest.mark.asyncio
async def test_invalid_step_rejected(client: AsyncClient):
    user = await create_test_user(client, "onboard7@test.com", "SecurePassword123!")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.post(
        "/api/v1/onboarding/complete-step",
        headers=headers,
        json={"step": "nonexistent_step"},
    )
    assert resp.status_code == 422
