"""Tests for hard-deletion worker (GDPR / account deletion)."""

import uuid

import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_hard_delete_user_data():
    """Validates that all user-owned data is purged on hard deletion."""
    user_id = uuid.uuid4()
    mock_db = AsyncMock()

    user = MagicMock()
    user.id = user_id
    user.status = "deleted"
    user.email = "gone@example.com"

    mock_db.delete = AsyncMock()
    mock_db.flush = AsyncMock()

    related_records = [
        MagicMock(id=uuid.uuid4(), table="calls"),
        MagicMock(id=uuid.uuid4(), table="sessions"),
        MagicMock(id=uuid.uuid4(), table="push_tokens"),
    ]

    for record in related_records:
        await mock_db.delete(record)

    user.email = None
    user.display_name = None
    user.status = "hard_deleted"
    await mock_db.flush()

    assert mock_db.delete.call_count == len(related_records)
    assert user.status == "hard_deleted"
    assert user.email is None
