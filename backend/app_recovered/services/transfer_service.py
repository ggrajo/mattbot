# Source Generated with Decompyle++
# File: transfer_service.pyc (Python 3.13)

__doc__ = 'Transfer service: Twilio call transfer + loop prevention.'
from __future__ import annotations
import logging
import uuid
from datetime import UTC, datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.call import Call
from app.models.handoff_offer import HandoffOffer
from app.models.handoff_suppression import HandoffSuppression
from app.models.user_settings import UserSettings
logger = None(__name__)
# WARNING: Decompyle incomplete
