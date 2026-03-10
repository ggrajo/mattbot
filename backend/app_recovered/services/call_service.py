# Source Generated with Decompyle++
# File: call_service.pyc (Python 3.13)

__doc__ = 'Call service: state machine, idempotent record creation, provider events.'
from __future__ import annotations
import logging
import uuid
from datetime import UTC, datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.encryption import encrypt_field
from app.core.twilio_utils import compute_payload_hash, extract_last4, hash_phone, mask_phone, redact_twilio_params
from app.models.call import Call
from app.models.call_event import CallEvent
from app.models.provider_event import ProviderEvent
from app.models.user_number import UserNumber
logger = None(__name__)
STATE_ORDER: 'dict[str, int]' = {
    'created': 0,
    'inbound_received': 1,
    'twiml_responded': 2,
    'in_progress': 3,
    'completed': 10,
    'partial': 10,
    'failed': 10,
    'canceled': 10 }
TERMINAL_STATES = {
    'failed',
    'partial',
    'canceled',
    'completed'}
TWILIO_STATUS_MAP: 'dict[str, str]' = {
    'queued': 'created',
    'ringing': 'inbound_received',
    'in-progress': 'in_progress',
    'completed': 'completed',
    'busy': 'failed',
    'failed': 'failed',
    'no-answer': 'failed',
    'canceled': 'canceled' }
# WARNING: Decompyle incomplete
