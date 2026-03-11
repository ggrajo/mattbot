"""Tests for number lifecycle background workers."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_number import UserNumber
from app.workers.number_lifecycle import (
    cleanup_stale_pending_numbers,
    release_numbers_after_grace,
    repair_pending_configurations,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _make_user(db: AsyncSession) -> uuid.UUID:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"{user_id}@test.com",
        email_verified=True,
        status="active",
        password_hash="x",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()
    return user_id


async def _make_number(
    db: AsyncSession, user_id: uuid.UUID, status: str = "active", **overrides
) -> UserNumber:
    now = datetime.now(UTC)
    num = UserNumber(
        id=uuid.uuid4(),
        owner_user_id=user_id,
        e164=f"+1555{secrets.randbelow(9000000) + 1000000}",
        status=status,
        created_at=now,
        updated_at=now,
        twilio_number_sid=f"PN{uuid.uuid4().hex[:32]}",
        **overrides,
    )
    db.add(num)
    await db.flush()
    return num


# ---------------------------------------------------------------------------
# cleanup_stale_pending_numbers
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.workers.number_lifecycle._rollback_twilio_number")
async def test_cleanup_ignores_recent_pending(mock_rollback, db: AsyncSession):
    uid = await _make_user(db)
    await _make_number(db, uid, status="pending")

    released = await cleanup_stale_pending_numbers(db)
    assert released == 0
    mock_rollback.assert_not_called()


@pytest.mark.asyncio
@patch("app.workers.number_lifecycle._rollback_twilio_number")
async def test_cleanup_releases_stale_pending(mock_rollback, db: AsyncSession):
    uid = await _make_user(db)
    stale_time = datetime.now(UTC) - timedelta(minutes=20)
    await _make_number(db, uid, status="pending", updated_at=stale_time)

    released = await cleanup_stale_pending_numbers(db)
    assert released == 1
    mock_rollback.assert_called_once()


@pytest.mark.asyncio
@patch("app.workers.number_lifecycle._rollback_twilio_number")
async def test_cleanup_ignores_active(mock_rollback, db: AsyncSession):
    uid = await _make_user(db)
    stale_time = datetime.now(UTC) - timedelta(minutes=20)
    await _make_number(db, uid, status="active", updated_at=stale_time)

    released = await cleanup_stale_pending_numbers(db)
    assert released == 0
    mock_rollback.assert_not_called()


# ---------------------------------------------------------------------------
# release_numbers_after_grace
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.workers.number_lifecycle.telephony_service.release_number", new_callable=AsyncMock)
async def test_grace_release_ignores_recent_suspension(mock_release, db: AsyncSession):
    uid = await _make_user(db)
    await _make_number(
        db, uid, status="suspended", suspended_at=datetime.now(UTC)
    )

    released = await release_numbers_after_grace(db)
    assert released == 0
    mock_release.assert_not_called()


@pytest.mark.asyncio
@patch(
    "app.workers.number_lifecycle.telephony_service.release_number",
    new_callable=AsyncMock,
    return_value=True,
)
async def test_grace_release_releases_expired(mock_release, db: AsyncSession):
    uid = await _make_user(db)
    expired_at = datetime.now(UTC) - timedelta(days=31)
    await _make_number(db, uid, status="suspended", suspended_at=expired_at)

    released = await release_numbers_after_grace(db)
    assert released == 1
    mock_release.assert_called_once()


@pytest.mark.asyncio
@patch("app.workers.number_lifecycle.telephony_service.release_number", new_callable=AsyncMock)
async def test_grace_release_ignores_active(mock_release, db: AsyncSession):
    uid = await _make_user(db)
    old_time = datetime.now(UTC) - timedelta(days=60)
    await _make_number(db, uid, status="active", updated_at=old_time)

    released = await release_numbers_after_grace(db)
    assert released == 0
    mock_release.assert_not_called()


# ---------------------------------------------------------------------------
# repair_pending_configurations
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch(
    "app.workers.number_lifecycle.configure_number_webhooks",
    new_callable=AsyncMock,
    return_value=True,
)
async def test_repair_fixes_missing_webhook(mock_configure, db: AsyncSession):
    uid = await _make_user(db)
    await _make_number(db, uid, status="active", webhook_url=None)

    repaired = await repair_pending_configurations(db)
    assert repaired == 1
    mock_configure.assert_called_once()


@pytest.mark.asyncio
@patch(
    "app.workers.number_lifecycle.configure_number_webhooks",
    new_callable=AsyncMock,
    return_value=True,
)
async def test_repair_ignores_configured(mock_configure, db: AsyncSession):
    uid = await _make_user(db)
    await _make_number(
        db, uid, status="active", webhook_url="https://example.com/voice"
    )

    repaired = await repair_pending_configurations(db)
    assert repaired == 0
    mock_configure.assert_not_called()


# ---------------------------------------------------------------------------
# Return-value sanity checks
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@patch("app.workers.number_lifecycle._rollback_twilio_number")
async def test_cleanup_returns_count(mock_rollback, db: AsyncSession):
    uid1 = await _make_user(db)
    uid2 = await _make_user(db)
    stale = datetime.now(UTC) - timedelta(minutes=20)
    await _make_number(db, uid1, status="pending", updated_at=stale)
    await _make_number(db, uid2, status="pending", updated_at=stale)

    released = await cleanup_stale_pending_numbers(db)
    assert released == 2


@pytest.mark.asyncio
@patch("app.workers.number_lifecycle._rollback_twilio_number")
async def test_no_numbers_returns_zero(mock_rollback, db: AsyncSession):
    assert await cleanup_stale_pending_numbers(db) == 0

    with patch(
        "app.workers.number_lifecycle.telephony_service.release_number",
        new_callable=AsyncMock,
    ):
        assert await release_numbers_after_grace(db) == 0

    with patch(
        "app.workers.number_lifecycle.configure_number_webhooks",
        new_callable=AsyncMock,
    ):
        assert await repair_pending_configurations(db) == 0
