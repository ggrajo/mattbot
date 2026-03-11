"""Test voice catalog API."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.voice_catalog import VoiceCatalog
from tests.conftest import create_test_user

BASE = "/api/v1"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {"Authorization": f"Bearer {user['access_token']}"}


@pytest.mark.asyncio
async def test_list_voices_empty(client: AsyncClient):
    """GET /voices returns empty list when no voices in catalog."""
    headers = await _auth_headers(client, "voice-empty@test.com")
    resp = await client.get(f"{BASE}/voices", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["voices"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_voices_with_entries(client: AsyncClient, db: AsyncSession):
    """GET /voices returns catalog entries."""
    voice = VoiceCatalog(
        voice_id="el_voice_001",
        name="Sarah",
        provider="elevenlabs",
        gender="female",
        locale="en",
        is_active=True,
    )
    db.add(voice)
    await db.commit()

    headers = await _auth_headers(client, "voice-list@test.com")
    resp = await client.get(f"{BASE}/voices", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    names = [v["name"] for v in data["voices"]]
    assert "Sarah" in names


@pytest.mark.asyncio
async def test_list_voices_filter_by_gender(client: AsyncClient, db: AsyncSession):
    """GET /voices?gender=male filters by gender."""
    male_voice = VoiceCatalog(
        voice_id="el_voice_male",
        name="James",
        provider="elevenlabs",
        gender="male",
        locale="en",
        is_active=True,
    )
    female_voice = VoiceCatalog(
        voice_id="el_voice_female",
        name="Emily",
        provider="elevenlabs",
        gender="female",
        locale="en",
        is_active=True,
    )
    db.add_all([male_voice, female_voice])
    await db.commit()

    headers = await _auth_headers(client, "voice-gender@test.com")
    resp = await client.get(f"{BASE}/voices?gender=male", headers=headers)
    assert resp.status_code == 200
    for v in resp.json()["voices"]:
        assert v["gender"] == "male"


@pytest.mark.asyncio
async def test_list_voices_filter_by_locale(client: AsyncClient, db: AsyncSession):
    """GET /voices?locale=es filters by locale."""
    es_voice = VoiceCatalog(
        voice_id="el_voice_es",
        name="Maria",
        provider="elevenlabs",
        gender="female",
        locale="es",
        is_active=True,
    )
    db.add(es_voice)
    await db.commit()

    headers = await _auth_headers(client, "voice-locale@test.com")
    resp = await client.get(f"{BASE}/voices?locale=es", headers=headers)
    assert resp.status_code == 200
    for v in resp.json()["voices"]:
        assert v["locale"] == "es"


@pytest.mark.asyncio
async def test_get_voice_by_id(client: AsyncClient, db: AsyncSession):
    """GET /voices/{voice_id} returns a single voice."""
    voice = VoiceCatalog(
        voice_id="el_voice_single",
        name="Alex",
        provider="elevenlabs",
        gender="male",
        locale="en",
        is_active=True,
    )
    db.add(voice)
    await db.commit()

    result = await db.execute(
        select(VoiceCatalog).where(VoiceCatalog.voice_id == "el_voice_single")
    )
    saved = result.scalars().first()

    headers = await _auth_headers(client, "voice-get@test.com")
    resp = await client.get(f"{BASE}/voices/{saved.id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Alex"


@pytest.mark.asyncio
async def test_get_voice_not_found(client: AsyncClient):
    """GET /voices/{bad_id} returns 404."""
    headers = await _auth_headers(client, "voice-404@test.com")
    resp = await client.get(
        f"{BASE}/voices/00000000-0000-0000-0000-000000000000",
        headers=headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_voices_require_auth(client: AsyncClient):
    """GET /voices requires authentication."""
    resp = await client.get(f"{BASE}/voices")
    assert resp.status_code in (401, 422)
