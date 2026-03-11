"""Unit tests for notification_service payload builder and quiet hours."""

from datetime import datetime, time, timezone

import pytest

from app.services.notification_service import build_push_payload, is_quiet_hours


class TestBuildPushPayload:
    def test_private_mode_hides_content(self):
        payload = build_push_payload(
            notification_type="incoming_call",
            data={"call_id": "abc123", "caller_name": "John"},
            privacy_mode="private",
        )
        assert payload["body"] == "New activity"
        assert "caller_name" not in payload.get("data", {})

    def test_preview_mode_shows_type_specific_body(self):
        payload = build_push_payload(
            notification_type="missed_call",
            data={"call_id": "abc123"},
            privacy_mode="preview",
        )
        assert payload["body"] == "Missed call"

    def test_safe_data_keys_only(self):
        payload = build_push_payload(
            notification_type="incoming_call",
            data={
                "call_id": "abc123",
                "event_type": "incoming_call",
                "timestamp": "2026-01-01T00:00:00",
                "caller_name": "John",
                "transcript": "sensitive data",
            },
            privacy_mode="preview",
        )
        data = payload.get("data", {})
        assert "call_id" in data
        assert "event_type" in data
        assert "timestamp" in data
        assert "caller_name" not in data
        assert "transcript" not in data

    def test_deep_link_added_when_call_id_present(self):
        payload = build_push_payload(
            notification_type="call_summary",
            data={"call_id": "xyz789"},
        )
        assert payload["data"]["deep_link"] == "mattbot://call/xyz789"

    def test_no_deep_link_without_call_id(self):
        payload = build_push_payload(
            notification_type="call_summary",
            data={"event_type": "test"},
        )
        assert "deep_link" not in payload.get("data", {})

    def test_unknown_notification_type_defaults(self):
        payload = build_push_payload(
            notification_type="unknown_type",
            data={},
            privacy_mode="preview",
        )
        assert payload["body"] == "New activity"


class TestIsQuietHours:
    @staticmethod
    def _make_settings(**kwargs):
        """Create a minimal mock settings object."""
        from unittest.mock import MagicMock

        s = MagicMock()
        s.quiet_hours_enabled = kwargs.get("enabled", False)
        s.quiet_hours_start = kwargs.get("start", None)
        s.quiet_hours_end = kwargs.get("end", None)
        s.quiet_hours_days = kwargs.get("days", [])
        s.quiet_hours_intervals = kwargs.get("intervals", [])
        s.quiet_hours_allow_vip = kwargs.get("allow_vip", False)
        return s

    def test_disabled_returns_false(self):
        settings = self._make_settings(enabled=False)
        assert is_quiet_hours(settings) is False

    def test_enabled_within_range(self):
        settings = self._make_settings(
            enabled=True,
            start=time(22, 0),
            end=time(7, 0),
        )
        now = datetime(2026, 2, 21, 23, 30, tzinfo=timezone.utc)
        assert is_quiet_hours(settings, now=now) is True

    def test_enabled_outside_range(self):
        settings = self._make_settings(
            enabled=True,
            start=time(22, 0),
            end=time(7, 0),
        )
        now = datetime(2026, 2, 21, 12, 0, tzinfo=timezone.utc)
        assert is_quiet_hours(settings, now=now) is False

    def test_day_filter_excludes(self):
        now = datetime(2026, 2, 21, 23, 30, tzinfo=timezone.utc)
        weekday = now.weekday()
        js_day = (weekday + 1) % 7
        excluded_day = (js_day + 1) % 7

        settings = self._make_settings(
            enabled=True,
            start=time(22, 0),
            end=time(7, 0),
            days=[excluded_day],
        )
        assert is_quiet_hours(settings, now=now) is False

    def test_intervals_based_quiet_hours(self):
        settings = self._make_settings(
            enabled=True,
            intervals=[
                {"start": "22:00", "end": "07:00", "days": [0, 1, 2, 3, 4, 5, 6]},
            ],
        )
        now = datetime(2026, 2, 21, 23, 30, tzinfo=timezone.utc)
        assert is_quiet_hours(settings, now=now) is True

    def test_intervals_outside_range(self):
        settings = self._make_settings(
            enabled=True,
            intervals=[
                {"start": "22:00", "end": "23:00", "days": [0, 1, 2, 3, 4, 5, 6]},
            ],
        )
        now = datetime(2026, 2, 21, 12, 0, tzinfo=timezone.utc)
        assert is_quiet_hours(settings, now=now) is False
