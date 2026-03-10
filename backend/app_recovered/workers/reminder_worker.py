# Source Generated with Decompyle++
# File: reminder_worker.pyc (Python 3.13)

__doc__ = 'Reminder poller — triggers due reminders.'
from __future__ import annotations
import logging
from datetime import UTC, datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.reminder import Reminder
logger = None(__name__)
# WARNING: Decompyle incomplete
