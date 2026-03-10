# Source Generated with Decompyle++
# File: calendar.pyc (Python 3.13)

__doc__ = 'Google Calendar integration endpoints: OAuth, events, available slots.'
from __future__ import annotations
import logging
import secrets
import uuid
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.calendar import AvailableSlotsResponse, CalendarAuthUrlResponse, CalendarEventsResponse, CalendarStatusResponse
from app.services import audit_service, calendar_service
logger = None(__name__)
router = None()
_pending_oauth_states: 'dict[str, uuid.UUID]' = { }
# WARNING: Decompyle incomplete
