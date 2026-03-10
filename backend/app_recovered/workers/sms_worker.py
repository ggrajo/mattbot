# Source Generated with Decompyle++
# File: sms_worker.pyc (Python 3.13)

__doc__ = 'SMS send worker — polls approved outbound messages and dispatches via Twilio.\n\nCurrently a stub: logs the send intent and marks messages as sent.\nIn production this would be driven by an SQS queue (q-messaging).\n'
from __future__ import annotations
import logging
import uuid
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.encryption import decrypt_field
from app.models.outbound_message import OutboundMessage
from app.models.text_send_attempt import TextSendAttempt
logger = None(__name__)
_BATCH_SIZE = 10
# WARNING: Decompyle incomplete
