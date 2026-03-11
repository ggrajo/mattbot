"""Test prompt suggestions API."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt_suggestion import PromptSuggestion
from tests.conftest import create_test_user

BASE = "/api/v1"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


@pytest.mark.asyncio
async def test_list_suggestions_empty(client: AsyncClient):
    """GET /prompt-suggestions returns empty list when none exist."""
    headers = await _auth_headers(client, "sugg-empty@test.com")
    resp = await client.get(f"{BASE}/prompt-suggestions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["suggestions"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_suggestions_with_entries(client: AsyncClient, db: AsyncSession):
    """GET /prompt-suggestions returns available suggestions."""
    suggestion = PromptSuggestion(
        title="Screen my calls",
        prompt_text="Screen all incoming calls and take messages.",
        category="screening",
        sort_order=1,
    )
    db.add(suggestion)
    await db.commit()

    headers = await _auth_headers(client, "sugg-list@test.com")
    resp = await client.get(f"{BASE}/prompt-suggestions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    titles = [s["title"] for s in data["suggestions"]]
    assert "Screen my calls" in titles


@pytest.mark.asyncio
async def test_list_suggestions_filter_by_category(
    client: AsyncClient, db: AsyncSession
):
    """GET /prompt-suggestions?category=greeting filters by category."""
    s1 = PromptSuggestion(
        title="Greeting A",
        prompt_text="Hello!",
        category="greeting",
        sort_order=1,
    )
    s2 = PromptSuggestion(
        title="Screening B",
        prompt_text="Screen calls.",
        category="screening",
        sort_order=2,
    )
    db.add_all([s1, s2])
    await db.commit()

    headers = await _auth_headers(client, "sugg-filter@test.com")
    resp = await client.get(
        f"{BASE}/prompt-suggestions?category=greeting", headers=headers
    )
    assert resp.status_code == 200
    for s in resp.json()["suggestions"]:
        assert s["category"] == "greeting"


@pytest.mark.asyncio
async def test_suggestions_sorted_by_sort_order(
    client: AsyncClient, db: AsyncSession
):
    """Suggestions are returned in sort_order."""
    s1 = PromptSuggestion(
        title="Third",
        prompt_text="...",
        category="test_sort",
        sort_order=3,
    )
    s2 = PromptSuggestion(
        title="First",
        prompt_text="...",
        category="test_sort",
        sort_order=1,
    )
    s3 = PromptSuggestion(
        title="Second",
        prompt_text="...",
        category="test_sort",
        sort_order=2,
    )
    db.add_all([s1, s2, s3])
    await db.commit()

    headers = await _auth_headers(client, "sugg-sort@test.com")
    resp = await client.get(
        f"{BASE}/prompt-suggestions?category=test_sort", headers=headers
    )
    assert resp.status_code == 200
    titles = [s["title"] for s in resp.json()["suggestions"]]
    assert titles == ["First", "Second", "Third"]


@pytest.mark.asyncio
async def test_suggestions_require_auth(client: AsyncClient):
    """GET /prompt-suggestions requires authentication."""
    resp = await client.get(f"{BASE}/prompt-suggestions")
    assert resp.status_code in (401, 422)
