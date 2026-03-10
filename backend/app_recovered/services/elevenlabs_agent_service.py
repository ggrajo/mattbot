# Source Generated with Decompyle++
# File: elevenlabs_agent_service.pyc (Python 3.13)

__doc__ = 'ElevenLabs agent management: create, update, delete per-user agents + voice catalog sync.'
from __future__ import annotations
import logging
import httpx
from app.config import settings as app_settings
logger = None(__name__)
_API_BASE = 'https://api.elevenlabs.io/v1'
_TIMEOUT = 30
# WARNING: Decompyle incomplete
