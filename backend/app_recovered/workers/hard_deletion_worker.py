# Source Generated with Decompyle++
# File: hard_deletion_worker.pyc (Python 3.13)

__doc__ = 'Hard deletion worker.\n\nPermanently removes call rows (and cascaded children) that have been\nsoft-deleted for more than 7 days.\n'
from __future__ import annotations
import logging
from datetime import UTC, datetime, timedelta
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.call import Call
from app.models.call_artifact import CallArtifact
from app.models.call_event import CallEvent
from app.models.call_memory_item import CallMemoryItem
logger = None(__name__)
HARD_DELETE_GRACE_DAYS = 7
# WARNING: Decompyle incomplete
