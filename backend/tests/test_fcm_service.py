"""Tests for FCM notification dispatch."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.notification_service import NotificationService


@pytest.mark.asyncio
async def test_send_fcm_notification():
    svc = NotificationService()

    result = await svc.send_notification(
        user_id="user-123",
        title="New voicemail",
        body="You have a new message from +15551234567",
        quiet_hours_enabled=False,
    )
    assert isinstance(result, dict)
    assert "sent" in result


@pytest.mark.asyncio
async def test_fcm_invalid_token():
    """When no push provider is configured, notification should report not sent."""
    svc = NotificationService()

    with patch("app.services.notification_service.FCM_SERVER_KEY", ""), \
         patch("app.services.notification_service.APNS_KEY_ID", ""):
        result = await svc.send_notification(
            user_id="user-456",
            title="Test",
            body="Body",
        )
        assert result["sent"] is False
        assert result["reason"] == "no_push_provider"
