"""Notification service with quiet hours support."""

from __future__ import annotations

import logging
import os
from datetime import datetime, time

logger = logging.getLogger(__name__)

FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
APNS_KEY_ID = os.getenv("APNS_KEY_ID", "")
APNS_TEAM_ID = os.getenv("APNS_TEAM_ID", "")
APNS_BUNDLE_ID = os.getenv("APNS_BUNDLE_ID", "com.mattbot.app")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000")


def parse_time(t: str | None) -> time | None:
    if not t:
        return None
    try:
        parts = t.strip().split(":")
        return time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return None


def is_within_quiet_hours(
    now: time,
    start: time,
    end: time,
) -> bool:
    """Return True if *now* falls inside the quiet window.

    Handles overnight ranges where start > end (e.g. 22:00 - 07:00).
    """
    if start <= end:
        return start <= now <= end
    return now >= start or now <= end


class NotificationService:
    """Dispatches notifications, respecting user quiet-hours preferences."""

    async def should_suppress(
        self,
        *,
        quiet_hours_enabled: bool,
        quiet_hours_start: str | None,
        quiet_hours_end: str | None,
        is_urgent: bool = False,
    ) -> bool:
        if is_urgent:
            return False

        if not quiet_hours_enabled:
            return False

        start = parse_time(quiet_hours_start)
        end = parse_time(quiet_hours_end)
        if start is None or end is None:
            return False

        now = datetime.now().time()
        return is_within_quiet_hours(now, start, end)

    async def send_notification(
        self,
        *,
        user_id: str,
        title: str,
        body: str,
        is_urgent: bool = False,
        quiet_hours_enabled: bool = False,
        quiet_hours_start: str | None = None,
        quiet_hours_end: str | None = None,
    ) -> dict:
        suppressed = await self.should_suppress(
            quiet_hours_enabled=quiet_hours_enabled,
            quiet_hours_start=quiet_hours_start,
            quiet_hours_end=quiet_hours_end,
            is_urgent=is_urgent,
        )

        if suppressed:
            logger.info(
                "Notification suppressed (quiet hours) for user %s: %s",
                user_id,
                title,
            )
            return {"sent": False, "reason": "quiet_hours"}

        if not FCM_SERVER_KEY and not APNS_KEY_ID:
            logger.warning(
                "No push provider configured (FCM_SERVER_KEY / APNS_KEY_ID unset); "
                "notification logged only for user %s: %s",
                user_id,
                title,
            )
            return {"sent": False, "reason": "no_push_provider"}

        logger.info("Sending notification to user %s: %s", user_id, title)
        return {"sent": True, "reason": None}


notification_service = NotificationService()
