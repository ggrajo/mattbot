# Source Generated with Decompyle++
# File: calendar.pyc (Python 3.13)

__doc__ = 'Google Calendar integration endpoints: OAuth, events, available slots.'
from __future__ import annotations

import uuid

logger = None(__name__)
router = None()
_pending_oauth_states: dict[str, uuid.UUID] = { }
# WARNING: Decompyle incomplete
