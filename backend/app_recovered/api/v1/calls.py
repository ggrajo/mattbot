# Source Generated with Decompyle++
# File: calls.pyc (Python 3.13)

__doc__ = 'Call log and artifact API endpoints.'
from __future__ import annotations
import uuid
from datetime import UTC
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user, get_current_user_from_query, require_step_up
from app.core.encryption import decrypt_field, encrypt_field
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.calls import ArtifactResponse, CallDetailResponse, CallEventResponse, CallListItem, CallListResponse, CallPatchRequest, LabelResponse, MarkBlockedRequest, MarkStatusResponse, SummaryRegenerateResponse, TranscriptResponse, TranscriptTurn
from app.schemas.common import MessageResponse
from app.services import artifact_service, audit_service, call_service
router = None()
# WARNING: Decompyle incomplete
