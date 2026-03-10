# Source Generated with Decompyle++
# File: retention_worker.pyc (Python 3.13)

__doc__ = 'Retention enforcement worker.\n\nSoft-deletes calls whose retention window has expired and scrubs\nassociated artifacts, unconfirmed memory items, and scheduled reminders.\n'
from __future__ import annotations
import logging
from datetime import UTC, datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.call import Call
from app.models.call_artifact import CallArtifact
from app.models.call_memory_item import CallMemoryItem
from app.models.reminder import Reminder
logger = None(__name__)
# WARNING: Decompyle incomplete
