# Source Generated with Decompyle++
# File: post_call.pyc (Python 3.13)

__doc__ = 'Post-call artifact processing worker.\n\nPolls for pending/processing artifacts and runs the artifact pipeline.\nAlso sends privacy-safe push notifications when artifacts become ready.\n'
from __future__ import annotations
import logging
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.call_artifact import CallArtifact
from app.services import artifact_service
from app.services.event_emitter import emit_event
from app.services.notification_service import notify_call_screened
logger = None(__name__)
# WARNING: Decompyle incomplete
