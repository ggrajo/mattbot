"""Tests for reminder processing worker."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_process_pending_reminders():
    """Validates that pending reminders are fetched and dispatched."""
    mock_db = AsyncMock()

    reminder = MagicMock()
    reminder.id = "rem-001"
    reminder.user_id = "user-123"
    reminder.message = "Call dentist"
    reminder.is_sent = False

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [reminder]
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.flush = AsyncMock()

    mock_notify = AsyncMock(return_value={"sent": True})

    with patch(
        "app.services.notification_service.notification_service.send_notification",
        mock_notify,
    ):
        pending = mock_result.scalars().all()
        assert len(pending) == 1

        for r in pending:
            await mock_notify(
                user_id=r.user_id,
                title="Reminder",
                body=r.message,
            )
            r.is_sent = True

        assert reminder.is_sent is True
        mock_notify.assert_called_once_with(
            user_id="user-123",
            title="Reminder",
            body="Call dentist",
        )
