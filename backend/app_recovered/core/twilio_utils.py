# Source Generated with Decompyle++
# File: twilio_utils.pyc (Python 3.13)

__doc__ = 'Twilio webhook utilities: signature validation and phone masking.'
from __future__ import annotations
import hashlib
import logging
from urllib.parse import urlencode
from fastapi import Request
from app.config import settings
logger = None(__name__)
# WARNING: Decompyle incomplete
