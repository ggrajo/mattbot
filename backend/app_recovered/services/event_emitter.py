# Source Generated with Decompyle++
# File: event_emitter.pyc (Python 3.13)

__doc__ = 'Emit realtime events to the Node.js bridge for WebSocket fan-out to mobile clients.'
from __future__ import annotations

import httpx

logger = None(__name__)
_client: httpx.AsyncClient | None = None
# WARNING: Decompyle incomplete
