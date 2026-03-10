# Source Generated with Decompyle++
# File: call_service.pyc (Python 3.13)

__doc__ = 'Call service: state machine, idempotent record creation, provider events.'
from __future__ import annotations

logger = None(__name__)
STATE_ORDER: dict[str, int] = {
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
TWILIO_STATUS_MAP: dict[str, str] = {
    'queued': 'created',
    'ringing': 'inbound_received',
    'in-progress': 'in_progress',
    'completed': 'completed',
    'busy': 'failed',
    'failed': 'failed',
    'no-answer': 'failed',
    'canceled': 'canceled' }
# WARNING: Decompyle incomplete
