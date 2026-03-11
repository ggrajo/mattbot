"""Tests for notification service quiet-hours logic."""

import pytest
from unittest.mock import patch
from datetime import time

from app.services.notification_service import NotificationService, is_within_quiet_hours


@pytest.mark.asyncio
async def test_quiet_hours_suppression():
    svc = NotificationService()

    with patch("app.services.notification_service.datetime") as mock_dt:
        mock_dt.now.return_value.time.return_value = time(23, 30)

        suppressed = await svc.should_suppress(
            quiet_hours_enabled=True,
            quiet_hours_start="22:00",
            quiet_hours_end="07:00",
        )
        assert suppressed is True


@pytest.mark.asyncio
async def test_urgent_bypasses_quiet_hours():
    svc = NotificationService()

    suppressed = await svc.should_suppress(
        quiet_hours_enabled=True,
        quiet_hours_start="22:00",
        quiet_hours_end="07:00",
        is_urgent=True,
    )
    assert suppressed is False


def test_is_within_quiet_hours_same_day():
    assert is_within_quiet_hours(time(14, 0), time(13, 0), time(15, 0)) is True
    assert is_within_quiet_hours(time(12, 0), time(13, 0), time(15, 0)) is False


def test_is_within_quiet_hours_overnight():
    assert is_within_quiet_hours(time(23, 30), time(22, 0), time(7, 0)) is True
    assert is_within_quiet_hours(time(3, 0), time(22, 0), time(7, 0)) is True
    assert is_within_quiet_hours(time(12, 0), time(22, 0), time(7, 0)) is False
