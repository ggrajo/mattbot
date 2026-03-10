# Source Generated with Decompyle++
# File: webhooks.pyc (Python 3.13)

__doc__ = 'Webhook handlers for Stripe, Twilio, and ElevenLabs.'
from __future__ import annotations
import contextlib
import json
import logging
import uuid
from datetime import UTC, datetime
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings as app_settings
from app.core.rate_limiter import check_rate_limit, clear_rate_limit
from app.core.session_token import verify_elevenlabs_hmac
from app.core.twilio_utils import hash_phone, validate_twilio_signature
from app.database import get_db
from app.models.user_settings import UserSettings
from app.services import agent_service, audit_service, billing_service, call_service, telephony_service
logger = None(__name__)
router = None()
# WARNING: Decompyle incomplete
