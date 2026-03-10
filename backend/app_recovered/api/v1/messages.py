# Source Generated with Decompyle++
# File: messages.pyc (Python 3.13)

__doc__ = 'Messaging / text-back API endpoints.'
from __future__ import annotations
import uuid
from datetime import UTC, datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import decrypt_field, encrypt_field
from app.core.rate_limiter import check_rate_limit
from app.core.twilio_utils import extract_last4, hash_phone
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.call import Call
from app.models.outbound_message import OutboundMessage
from app.models.text_back_template import TextBackTemplate
from app.schemas.messaging import TemplateListResponse, TemplateResponse, TextBackApproveRequest, TextBackDraftRequest, TextBackResponse, TextBackUpdateRequest
from app.services import audit_service
router = None()
_DRAFT_STATUSES = ('drafted', 'awaiting_approval')
_APPROVABLE_STATUSES = ('drafted', 'awaiting_approval')
# WARNING: Decompyle incomplete
