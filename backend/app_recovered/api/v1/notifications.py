# Source Generated with Decompyle++
# File: notifications.pyc (Python 3.13)

__doc__ = 'Notification delivery tracking and receipt endpoints.'
from __future__ import annotations
import uuid
from datetime import UTC, datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.notification import Notification
from app.models.notification_delivery import NotificationDelivery
from app.schemas.notifications import NotificationListResponse, NotificationReceiptRequest, NotificationResponse
from app.services.audit_service import log_event
router = None()
# WARNING: Decompyle incomplete
