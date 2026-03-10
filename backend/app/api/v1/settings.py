"""User settings CRUD with optimistic concurrency."""

from datetime import UTC, datetime, time

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import encrypt_field
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.user_settings import UserSettings
from app.schemas.settings import (
    SettingsPatchRequest,
    SettingsPatchResponse,
    SettingsResponse,
)
from app.services import audit_service

router = APIRouter()

_SENSITIVE_KEYS = {
    "text_approval_mode",
    "transcript_disclosure_mode",
    "notification_privacy_mode",
    "biometric_unlock_enabled",
    "biometric_policy",
    "recording_announcement_required",
    "recording_enabled",
}


def _settings_to_response(s: UserSettings) -> SettingsResponse:
    from app.schemas.settings import QuietHoursInterval

    intervals_raw = s.quiet_hours_intervals if s.quiet_hours_intervals else []
    intervals = [QuietHoursInterval(**iv) for iv in intervals_raw] if intervals_raw else []

    return SettingsResponse(
        **{
            "theme_preference": s.theme_preference,
            "notification_privacy_mode": s.notification_privacy_mode,
            "quiet_hours_enabled": s.quiet_hours_enabled,
            "quiet_hours_start": s.quiet_hours_start.strftime("%H:%M")
            if s.quiet_hours_start
            else None,
            "quiet_hours_end": s.quiet_hours_end.strftime("%H:%M") if s.quiet_hours_end else None,
            "quiet_hours_days": s.quiet_hours_days if s.quiet_hours_days else [],
            "quiet_hours_intervals": intervals,
            "quiet_hours_allow_vip": s.quiet_hours_allow_vip,
            "timezone": s.timezone,
            "personal_phone_last4": s.personal_phone_last4,
            "memory_enabled": s.memory_enabled,
            "data_retention_days": s.data_retention_days,
            "biometric_unlock_enabled": s.biometric_unlock_enabled,
            "recording_enabled": s.recording_enabled,
            "call_objective_mode": s.call_objective_mode,
            "max_call_length_seconds": s.max_call_length_seconds,
            "vip_max_call_length_seconds": s.vip_max_call_length_seconds,
            "handoff_enabled": s.handoff_enabled,
            "handoff_trigger": s.handoff_trigger,
            "handoff_offer_timeout_seconds": s.handoff_offer_timeout_seconds,
            "handoff_target_phone_last4": s.handoff_target_phone_last4,
            "business_hours_enabled": s.business_hours_enabled,
            "business_hours_start": s.business_hours_start.strftime("%H:%M")
            if s.business_hours_start
            else None,
            "business_hours_end": s.business_hours_end.strftime("%H:%M")
            if s.business_hours_end
            else None,
            "business_hours_days": s.business_hours_days if s.business_hours_days else [],
            "after_hours_behavior": s.after_hours_behavior,
            "temperament_preset": s.temperament_preset,
            "swearing_rule": s.swearing_rule,
            "language_primary": s.language_primary,
            "language_secondary": s.language_secondary,
            "vip_calls_mark_important": s.vip_calls_mark_important,
            "vip_notification_intensity": s.vip_notification_intensity,
            "blocked_caller_behavior": s.blocked_caller_behavior,
            "log_blocked_attempts": s.log_blocked_attempts,
            "notify_on_blocked": s.notify_on_blocked,
            "spam_labeling_enabled": s.spam_labeling_enabled,
            "block_suggestions_enabled": s.block_suggestions_enabled,
            "repeat_caller_threshold": s.repeat_caller_threshold,
            "text_approval_mode": s.text_approval_mode,
            "assistant_name": s.assistant_name,
            "greeting_template": s.greeting_template,
            "transcript_disclosure_mode": s.transcript_disclosure_mode,
            "recording_announcement_required": s.recording_announcement_required,
            "important_rule": s.important_rule,
            "biometric_policy": s.biometric_policy,
            "calendar_booking_enabled": s.calendar_booking_enabled,
            "calendar_default_duration_minutes": s.calendar_default_duration_minutes,
            "calendar_booking_window_days": s.calendar_booking_window_days,
            "urgent_notify_sms": s.urgent_notify_sms,
            "urgent_notify_email": s.urgent_notify_email,
            "urgent_notify_call": s.urgent_notify_call,
            "urgent_notify_phone_last4": s.urgent_notify_phone_last4,
            "urgent_notify_email_address": s.urgent_notify_email_address,
            "revision": s.revision,
        }
    )


def _parse_time(value: str) -> time:
    parts = value.split(":")
    return time(int(parts[0]), int(parts[1]))


@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SettingsResponse:
    settings = await db.get(UserSettings, current_user.user_id)
    if settings is None:
        settings = UserSettings(owner_user_id=current_user.user_id)
        db.add(settings)
        await db.flush()
        await db.refresh(settings)
    return _settings_to_response(settings)


@router.patch("", response_model=SettingsPatchResponse)
async def patch_settings(
    body: SettingsPatchRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SettingsPatchResponse:
    settings = await db.get(UserSettings, current_user.user_id)
    if settings is None:
        settings = UserSettings(owner_user_id=current_user.user_id)
        db.add(settings)
        await db.flush()
        await db.refresh(settings)

    if settings.revision != body.expected_revision:
        raise AppError(
            "REVISION_CONFLICT",
            "Settings were updated on another device. Please refresh and try again.",
            409,
        )

    changes = body.changes.model_dump(exclude_none=True)
    if not changes:
        return SettingsPatchResponse(
            revision=settings.revision,
            settings=_settings_to_response(settings),
        )

    import re

    if "handoff_target_phone" in changes:
        raw_phone = changes.pop("handoff_target_phone")
        if raw_phone:
            cleaned = re.sub(r"[^+\d]", "", raw_phone)
            ct, nonce, kv = encrypt_field(cleaned.encode("utf-8"))
            settings.handoff_target_phone_ciphertext = ct
            settings.handoff_target_phone_nonce = nonce
            settings.handoff_target_phone_key_version = kv
            settings.handoff_target_phone_last4 = cleaned[-4:] if len(cleaned) >= 4 else cleaned
        else:
            settings.handoff_target_phone_ciphertext = None
            settings.handoff_target_phone_nonce = None
            settings.handoff_target_phone_key_version = None
            settings.handoff_target_phone_last4 = None

    if "personal_phone" in changes:
        raw_phone = changes.pop("personal_phone")
        if raw_phone:
            cleaned = re.sub(r"[^+\d]", "", raw_phone)
            ct, nonce, kv = encrypt_field(cleaned.encode("utf-8"))
            settings.personal_phone_ciphertext = ct
            settings.personal_phone_nonce = nonce
            settings.personal_phone_key_version = kv
            settings.personal_phone_last4 = cleaned[-4:] if len(cleaned) >= 4 else cleaned
        else:
            settings.personal_phone_ciphertext = None
            settings.personal_phone_nonce = None
            settings.personal_phone_key_version = None
            settings.personal_phone_last4 = None

    if "urgent_notify_phone" in changes:
        raw_phone = changes.pop("urgent_notify_phone")
        if raw_phone:
            cleaned = re.sub(r"[^+\d]", "", raw_phone)
            ct, nonce, kv = encrypt_field(cleaned.encode("utf-8"))
            settings.urgent_notify_phone_ciphertext = ct
            settings.urgent_notify_phone_nonce = nonce
            settings.urgent_notify_phone_key_version = kv
            settings.urgent_notify_phone_last4 = cleaned[-4:] if len(cleaned) >= 4 else cleaned
        else:
            settings.urgent_notify_phone_ciphertext = None
            settings.urgent_notify_phone_nonce = None
            settings.urgent_notify_phone_key_version = None
            settings.urgent_notify_phone_last4 = None

    time_fields = (
        "quiet_hours_start",
        "quiet_hours_end",
        "business_hours_start",
        "business_hours_end",
    )

    changed_keys: list = []
    for key, value in changes.items():
        if key in time_fields:
            setattr(settings, key, _parse_time(value) if value else None)
        elif key == "quiet_hours_intervals":
            intervals_dicts = [iv if isinstance(iv, dict) else iv.model_dump() for iv in value]
            setattr(settings, key, intervals_dicts)
            if intervals_dicts:
                first = intervals_dicts[0]
                settings.quiet_hours_start = _parse_time(first["start"])
                settings.quiet_hours_end = _parse_time(first["end"])
                settings.quiet_hours_days = first.get("days", [0, 1, 2, 3, 4, 5, 6])
        else:
            setattr(settings, key, value)
        changed_keys.append(key)

    settings.revision += 1
    settings.updated_at = utcnow()
    settings.updated_by_device_id = current_user.device_id

    audit_details = {"changed_keys": changed_keys, "revision": settings.revision}
    for k in changed_keys:
        if k not in _SENSITIVE_KEYS:
            audit_details[k] = changes[k]

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user_id,
        event_type="settings.updated",
        actor_id=current_user.device_id,
        details=audit_details,
    )

    if "notification_privacy_mode" in changed_keys:
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="settings.privacy_mode_changed",
            actor_id=current_user.device_id,
            details={"new_mode": changes["notification_privacy_mode"]},
        )

    if (
        "quiet_hours_enabled" in changed_keys
        or "quiet_hours_start" in changed_keys
        or "quiet_hours_end" in changed_keys
        or "quiet_hours_days" in changed_keys
        or "quiet_hours_intervals" in changed_keys
        or "quiet_hours_allow_vip" in changed_keys
    ):
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="settings.quiet_hours_updated",
            actor_id=current_user.device_id,
        )

    if "memory_enabled" in changed_keys:
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="settings.memory_toggled",
            actor_id=current_user.device_id,
            details={"enabled": changes["memory_enabled"]},
        )

    if "biometric_unlock_enabled" in changed_keys:
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="settings.biometric_toggled",
            actor_id=current_user.device_id,
        )

    if "theme_preference" in changed_keys:
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="THEME_PREFERENCE_UPDATED",
            actor_id=current_user.device_id,
            details={"new_value": changes["theme_preference"]},
        )

    handoff_keys = {"handoff_enabled", "handoff_trigger", "handoff_offer_timeout_seconds"}
    if handoff_keys & set(changed_keys):
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="settings.handoff_updated",
            actor_id=current_user.device_id,
            details={k: changes[k] for k in changed_keys if k in handoff_keys},
        )

    if "text_approval_mode" in changed_keys:
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="settings.text_approval_mode_changed",
            actor_id=current_user.device_id,
            details={"new_mode": changes["text_approval_mode"]},
        )

    if "transcript_disclosure_mode" in changed_keys:
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="settings.disclosure_mode_changed",
            actor_id=current_user.device_id,
            details={"new_mode": changes["transcript_disclosure_mode"]},
        )

    if "biometric_policy" in changed_keys:
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="settings.biometric_policy_changed",
            actor_id=current_user.device_id,
            details={"new_policy": changes["biometric_policy"]},
        )

    await db.flush()

    _agent_sync_keys = {
        "language_primary",
        "transcript_disclosure_mode",
        "handoff_trigger",
        "max_call_length_seconds",
        "calendar_default_duration_minutes",
        "assistant_name",
        "calendar_booking_window_days",
        "handoff_enabled",
        "greeting_template",
        "temperament_preset",
        "swearing_rule",
        "recording_announcement_required",
        "recording_enabled",
        "calendar_booking_enabled",
    }

    if _agent_sync_keys & set(changed_keys):
        try:
            from app.services import agent_service

            agent = await agent_service.get_or_create_default_agent(
                db,
                current_user.user_id,
            )
            await agent_service.ensure_elevenlabs_agent(
                db,
                agent,
                current_user.user_id,
            )
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "Failed to sync ElevenLabs agent after settings update"
            )

    return SettingsPatchResponse(
        revision=settings.revision,
        settings=_settings_to_response(settings),
    )
