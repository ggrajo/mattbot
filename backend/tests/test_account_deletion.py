"""Tests for account deletion (soft-delete, hard-delete, auth block)."""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from tests.conftest import create_test_user

BASE = "/api/v1"


async def _auth_headers(client: AsyncClient, email: str) -> dict:
    user = await create_test_user(client, email, "SecurePassword123!")
    return {
        "headers": {"Authorization": f"Bearer {user['access_token']}"},
        "access_token": user["access_token"],
        "email": email,
        "password": "SecurePassword123!",
    }


@pytest.mark.asyncio
async def test_soft_delete_account(client: AsyncClient, db):
    """Soft-deleting a user sets status='deleted' and deleted_at."""
    from app.models.user import User

    info = await _auth_headers(client, "softdel@test.com")

    from sqlalchemy import select

    result = await db.execute(
        select(User).where(User.email == "softdel@test.com")
    )
    user = result.scalars().first()
    assert user is not None
    assert user.status == "active"

    user.status = "deleted"
    user.deleted_at = datetime.now(UTC)
    await db.commit()

    result = await db.execute(select(User).where(User.email == "softdel@test.com"))
    user = result.scalars().first()
    assert user.status == "deleted"
    assert user.deleted_at is not None


@pytest.mark.asyncio
async def test_deleted_account_cannot_login(client: AsyncClient, db):
    """A soft-deleted user cannot authenticate (gets 401 on protected endpoints)."""
    from app.models.user import User

    info = await _auth_headers(client, "delauth@test.com")

    from sqlalchemy import select

    result = await db.execute(
        select(User).where(User.email == "delauth@test.com")
    )
    user = result.scalars().first()
    user.status = "deleted"
    user.deleted_at = datetime.now(UTC)
    await db.commit()

    resp = await client.get(f"{BASE}/calls", headers=info["headers"])
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_hard_delete_cascade(client: AsyncClient, db):
    """Hard-deleting a user cascades to all owned data (calls, sessions, etc.)."""
    from app.models.user import User
    from app.models.session import Session

    info = await _auth_headers(client, "harddel@test.com")

    from sqlalchemy import select, func

    result = await db.execute(
        select(User).where(User.email == "harddel@test.com")
    )
    user = result.scalars().first()
    user_id = user.id

    session_count = (
        await db.execute(
            select(func.count()).select_from(Session).where(
                Session.owner_user_id == user_id
            )
        )
    ).scalar()
    assert session_count >= 1

    await db.delete(user)
    await db.commit()

    result = await db.execute(select(User).where(User.id == user_id))
    assert result.scalars().first() is None

    session_count_after = (
        await db.execute(
            select(func.count()).select_from(Session).where(
                Session.owner_user_id == user_id
            )
        )
    ).scalar()
    assert session_count_after == 0


@pytest.mark.asyncio
async def test_deletion_requires_step_up(client: AsyncClient):
    """Sensitive deletion action should require step-up auth (X-Step-Up-Token)."""
    from app.core.dependencies import require_step_up

    info = await _auth_headers(client, "stepup@test.com")

    with patch(
        "app.core.dependencies.decode_token",
        side_effect=Exception("no step-up"),
    ):
        result = await require_step_up.__wrapped__(
            request=AsyncMock(headers={}),
            authorization=f"Bearer {info['access_token']}",
        ) if hasattr(require_step_up, "__wrapped__") else None

    from app.middleware.error_handler import AppError

    mock_request = AsyncMock()
    mock_request.headers = {}
    mock_request.headers.get = lambda key, default=None: None

    with pytest.raises(AppError) as exc_info:
        await require_step_up(
            request=mock_request,
            authorization=f"Bearer {info['access_token']}",
        )
    assert exc_info.value.status_code == 403
    assert "step-up" in exc_info.value.message.lower()
