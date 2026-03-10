# Source Generated with Decompyle++
# File: number_lifecycle.pyc (Python 3.13)

__doc__ = 'Background tasks for Twilio number lifecycle management.\n\ncleanup_stale_pending_numbers  - release numbers stuck in pending > 15 min\nrelease_numbers_after_grace    - release suspended numbers after grace period\nrepair_pending_configurations  - fix active numbers missing webhook config\n'
from __future__ import annotations
import logging
from datetime import UTC, datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.user_number import UserNumber
from app.services import audit_service
from app.services.telephony_service import SUSPENSION_GRACE_DAYS, _rollback_twilio_number, configure_number_webhooks
logger = None(__name__)
# WARNING: Decompyle incomplete
