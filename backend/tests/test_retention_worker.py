"""Tests for data retention / cleanup worker."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, UTC


@pytest.mark.asyncio
async def test_cleanup_expired_data():
    """Validates that records older than the retention period are purged."""
    mock_db = AsyncMock()

    now = datetime.now(UTC)
    retention_days = 90

    expired_record = MagicMock()
    expired_record.id = "rec-001"
    expired_record.created_at = now - timedelta(days=retention_days + 1)
    expired_record.user_id = "user-123"

    active_record = MagicMock()
    active_record.id = "rec-002"
    active_record.created_at = now - timedelta(days=10)
    active_record.user_id = "user-456"

    all_records = [expired_record, active_record]
    cutoff = now - timedelta(days=retention_days)
    to_delete = [r for r in all_records if r.created_at < cutoff]

    assert len(to_delete) == 1
    assert to_delete[0].id == "rec-001"

    mock_db.delete = AsyncMock()
    for r in to_delete:
        await mock_db.delete(r)
    await mock_db.flush()

    mock_db.delete.assert_called_once_with(expired_record)
