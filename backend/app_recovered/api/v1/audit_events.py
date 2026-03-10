# Source Generated with Decompyle++
# File: audit_events.pyc (Python 3.13)

__doc__ = 'Audit events API: paginated list of user audit trail.'
from __future__ import annotations
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.audit_event import AuditEvent
from app.schemas.audit import AuditEventListResponse, AuditEventResponse
router = None()
_SENSITIVE_DETAIL_KEYS = None({
    'otp',
    'summary',
    'otp_code',
    'transcript',
    'recording_url',
    'voicemail_text',
    'call_transcript'})
# WARNING: Decompyle incomplete
