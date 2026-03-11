"""User settings API — quiet hours, theme, calendar preferences, etc."""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.call_mode_config import CallModeConfig

logger = logging.getLogger(__name__)

router = APIRouter()


class SettingsResponse(BaseModel):
    quiet_hours_enabled: bool = False
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    theme: str = "system"
    timezone: str = "UTC"
    language: str = "en"
    calendar_connected: bool = False
    call_screening_enabled: bool = True
    notifications_enabled: bool = True
    access_control: str = "everyone"
    forwarding_number: str | None = None


class SettingsUpdateRequest(BaseModel):
    quiet_hours_enabled: bool | None = None
    quiet_hours_start: str | None = Field(
        None, description="Start time in HH:MM (24h) format"
    )
    quiet_hours_end: str | None = Field(
        None, description="End time in HH:MM (24h) format"
    )
    theme: str | None = None
    timezone: str | None = None
    language: str | None = None
    call_screening_enabled: bool | None = None
    notifications_enabled: bool | None = None
    access_control: str | None = None
    forwarding_number: str | None = None


@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SettingsResponse:
    """Retrieve all current user settings."""
    try:
        from app.models.google_calendar_token import GoogleCalendarToken
        from app.models.user import User

        user_result = await db.execute(
            select(User).where(User.id == current_user.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise AppError("USER_NOT_FOUND", "User not found", 404)

        mode_result = await db.execute(
            select(CallModeConfig).where(
                CallModeConfig.user_id == current_user.user_id
            )
        )
        mode_config = mode_result.scalar_one_or_none()

        cal_result = await db.execute(
            select(GoogleCalendarToken).where(
                GoogleCalendarToken.user_id == current_user.user_id,
                GoogleCalendarToken.is_active.is_(True),
            )
        )
        cal_token = cal_result.scalar_one_or_none()

        return SettingsResponse(
            quiet_hours_enabled=False,
            quiet_hours_start=None,
            quiet_hours_end=None,
            theme="system",
            timezone=user.default_timezone or "UTC",
            language=user.language_code or "en",
            calendar_connected=cal_token is not None,
            call_screening_enabled=mode_config.mode_a_enabled if mode_config else True,
            notifications_enabled=True,
            access_control=mode_config.access_control if mode_config else "everyone",
            forwarding_number=mode_config.forwarding_number if mode_config else None,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get settings for user %s", current_user.user_id)
        raise AppError("SETTINGS_ERROR", f"Failed to get settings: {e}", 500)


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    body: SettingsUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SettingsResponse:
    """Update user settings. Only provided fields are changed."""
    try:
        from app.models.user import User

        user_result = await db.execute(
            select(User).where(User.id == current_user.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise AppError("USER_NOT_FOUND", "User not found", 404)

        if body.timezone is not None:
            user.default_timezone = body.timezone
        if body.language is not None:
            user.language_code = body.language

        mode_result = await db.execute(
            select(CallModeConfig).where(
                CallModeConfig.user_id == current_user.user_id
            )
        )
        mode_config = mode_result.scalar_one_or_none()
        if mode_config is None:
            mode_config = CallModeConfig(user_id=current_user.user_id)
            db.add(mode_config)

        if body.call_screening_enabled is not None:
            mode_config.mode_a_enabled = body.call_screening_enabled
        if body.access_control is not None:
            mode_config.access_control = body.access_control
        if body.forwarding_number is not None:
            mode_config.forwarding_number = body.forwarding_number

        await db.flush()

        return await get_settings(current_user, db)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to update settings for user %s", current_user.user_id)
        raise AppError("SETTINGS_ERROR", f"Failed to update settings: {e}", 500)
