# Source Generated with Decompyle++
# File: event_emitter.pyc (Python 3.13)

__doc__ = 'Emit realtime events to the Node.js bridge for WebSocket fan-out to mobile clients.'
from __future__ import annotations
import hashlib
import hmac
import json
import logging
import uuid
from datetime import UTC, datetime
import httpx
from app.config import settings
logger = None(__name__)
_client: 'httpx.AsyncClient | None' = None
# WARNING: Decompyle incomplete
