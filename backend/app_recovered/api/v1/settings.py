# Source Generated with Decompyle++
# File: settings.pyc (Python 3.13)

__doc__ = 'User settings CRUD with optimistic concurrency.'
from datetime import UTC, datetime, time
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import encrypt_field
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.user_settings import UserSettings
from app.schemas.settings import SettingsPatchRequest, SettingsPatchResponse, SettingsResponse
from app.services import audit_service
router = None()
_SENSITIVE_KEYS = {
    'biometric_policy',
    'recording_enabled',
    'text_approval_mode',
    'biometric_unlock_enabled',
    'notification_privacy_mode',
    'transcript_disclosure_mode',
    'recording_announcement_required'}
# WARNING: Decompyle incomplete
