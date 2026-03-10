# Source Generated with Decompyle++
# File: telephony_service.pyc (Python 3.13)

__doc__ = 'Telephony service: number provisioning, lifecycle, call modes, forwarding.'
from __future__ import annotations
import logging
import secrets
import string
import uuid
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings as app_settings
from app.models.call_mode_config import CallModeConfig
from app.models.forwarding_verification_attempt import ForwardingVerificationAttempt
from app.models.user_number import UserNumber
from app.schemas.telephony import CallModesResponse, CarrierGuide, ForwardingSetupGuideResponse, ForwardingVerifyResponse, ForwardingVerifyStatusResponse, NumberListResponse, NumberProvisionResponse
from app.services import audit_service, billing_service
logger = None(__name__)
SUSPENSION_GRACE_DAYS = 7
# WARNING: Decompyle incomplete
