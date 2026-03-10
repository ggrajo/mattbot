# Source Generated with Decompyle++
# File: handoff_service.pyc (Python 3.13)

__doc__ = 'Handoff service: eligibility evaluation, offer lifecycle, expiry sweeper.'
from __future__ import annotations
import logging
import uuid
from datetime import UTC, datetime, timedelta
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.call import Call
from app.models.call_event import CallEvent
from app.models.handoff_offer import HandoffOffer
from app.models.user_settings import UserSettings
from app.models.vip_entry import VipEntry
logger = None(__name__)
# WARNING: Decompyle incomplete
