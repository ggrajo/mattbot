from datetime import UTC
from datetime import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, LargeBinary, String, Time, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import JsonbDict


class UserSettings(Base):
    __tablename__ = "user_settings"

    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    notification_privacy_mode: Mapped[str] = mapped_column(String(20), nullable=False, server_default='private')
    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    quiet_hours_start: Mapped[str | None] = mapped_column(Time)
    quiet_hours_end: Mapped[str | None] = mapped_column(Time)
    quiet_hours_days: Mapped[str] = mapped_column(JsonbDict, nullable=False, server_default='[]')
    quiet_hours_intervals: Mapped[str] = mapped_column(JsonbDict, nullable=False, server_default='[]')
    quiet_hours_allow_vip: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    timezone: Mapped[str] = mapped_column(String(60), nullable=False, server_default='UTC')
    personal_phone_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    personal_phone_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    personal_phone_key_version: Mapped[int | None] = mapped_column(Integer)
    personal_phone_last4: Mapped[str | None] = mapped_column(String(4))
    memory_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    data_retention_days: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("30"))
    biometric_unlock_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    recording_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    theme_preference: Mapped[str] = mapped_column(String(10), nullable=False, server_default='system')
    call_objective_mode: Mapped[str] = mapped_column(String(40), nullable=False, server_default='screen_and_summarize')
    max_call_length_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("180"))
    vip_max_call_length_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("300"))
    handoff_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    handoff_trigger: Mapped[str] = mapped_column(String(20), nullable=False, server_default='vip_only')
    handoff_offer_timeout_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("20"))
    handoff_target_phone_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    handoff_target_phone_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    handoff_target_phone_key_version: Mapped[int | None] = mapped_column(Integer)
    handoff_target_phone_last4: Mapped[str | None] = mapped_column(String(4))
    business_hours_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    business_hours_start: Mapped[str | None] = mapped_column(Time)
    business_hours_end: Mapped[str | None] = mapped_column(Time)
    business_hours_days: Mapped[str] = mapped_column(JsonbDict, nullable=False, server_default='[]')
    after_hours_behavior: Mapped[str] = mapped_column(String(40), nullable=False, server_default='screen_normally')
    contact_category_defaults: Mapped[str] = mapped_column(JsonbDict, nullable=False, server_default='{}')
    custom_contact_categories: Mapped[str] = mapped_column(JsonbDict, nullable=False, server_default='[]')
    temperament_preset: Mapped[str] = mapped_column(String(40), nullable=False, server_default='professional_polite')
    swearing_rule: Mapped[str] = mapped_column(String(20), nullable=False, server_default='no_swearing')
    language_primary: Mapped[str] = mapped_column(String(10), nullable=False, server_default='en')
    language_secondary: Mapped[str | None] = mapped_column(String(10))
    vip_calls_mark_important: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    vip_notification_intensity: Mapped[str] = mapped_column(String(10), nullable=False, server_default='normal')
    blocked_caller_behavior: Mapped[str] = mapped_column(String(30), nullable=False, server_default='end_immediately')
    log_blocked_attempts: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    notify_on_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    spam_labeling_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    block_suggestions_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    repeat_caller_threshold: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("3"))
    text_approval_mode: Mapped[str] = mapped_column(String(20), nullable=False, server_default='always_approve')
    assistant_name: Mapped[str] = mapped_column(String(60), nullable=False, server_default='Alex')
    greeting_template: Mapped[str] = mapped_column(String(40), nullable=False, server_default='standard')
    transcript_disclosure_mode: Mapped[str] = mapped_column(String(20), nullable=False, server_default='ai_says_it')
    recording_announcement_required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    important_rule: Mapped[str] = mapped_column(String(20), nullable=False, server_default='vip_and_urgent')
    biometric_policy: Mapped[str] = mapped_column(String(30), nullable=False, server_default='gate_call_details')
    calendar_booking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    calendar_default_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("30"))
    calendar_booking_window_days: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("14"))
    urgent_notify_sms: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    urgent_notify_email: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    urgent_notify_call: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    urgent_notify_phone_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    urgent_notify_phone_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    urgent_notify_phone_key_version: Mapped[int | None] = mapped_column(Integer)
    urgent_notify_phone_last4: Mapped[str | None] = mapped_column(String(4))
    urgent_notify_email_address: Mapped[str | None] = mapped_column(String(254))
    updated_by_device_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user: Mapped["User | None"] = relationship("User", back_populates="settings", uselist=False)

    __table_args__ = (CheckConstraint("theme_preference IN ('system', 'light', 'dark')", name="ck_user_settings_theme_preference"), CheckConstraint("notification_privacy_mode IN ('private', 'preview')", name="ck_user_settings_privacy_mode"), CheckConstraint("data_retention_days IN (7, 30, 90)", name="ck_user_settings_retention_days"), CheckConstraint("max_call_length_seconds BETWEEN 120 AND 300", name="ck_user_settings_max_call"), CheckConstraint("vip_max_call_length_seconds BETWEEN 180 AND 600", name="ck_user_settings_vip_call"), CheckConstraint("handoff_trigger IN ('vip_only', 'urgent_only', 'vip_and_urgent', 'always', 'never')", name="ck_user_settings_handoff_trigger"), CheckConstraint("handoff_offer_timeout_seconds BETWEEN 10 AND 60", name="ck_user_settings_handoff_timeout"), CheckConstraint("after_hours_behavior IN ('screen_normally', 'voicemail_only', 'reject')", name="ck_user_settings_after_hours"), CheckConstraint("temperament_preset IN ('professional_polite', 'casual_friendly', 'short_and_direct', 'warm_and_supportive', 'formal', 'custom')", name="ck_user_settings_temperament"), CheckConstraint("swearing_rule IN ('no_swearing', 'mirror_caller', 'allow')", name="ck_user_settings_swearing"), CheckConstraint("vip_notification_intensity IN ('normal', 'high', 'urgent')", name="ck_user_settings_vip_notif"), CheckConstraint("blocked_caller_behavior IN ('end_immediately', 'play_message', 'silent_drop')", name="ck_user_settings_blocked_behavior"), CheckConstraint("repeat_caller_threshold BETWEEN 1 AND 10", name="ck_user_settings_repeat_threshold"), CheckConstraint("text_approval_mode IN ('always_approve', 'auto_send', 'never')", name="ck_user_settings_text_approval"), CheckConstraint("greeting_template IN ('standard', 'brief', 'formal', 'custom')", name="ck_user_settings_greeting"), CheckConstraint("transcript_disclosure_mode IN ('ai_says_it', 'silent', 'beep')", name="ck_user_settings_disclosure"), CheckConstraint("important_rule IN ('vip_and_urgent', 'vip_only', 'urgent_only', 'all')", name="ck_user_settings_important_rule"), CheckConstraint("biometric_policy IN ('gate_call_details', 'gate_all', 'off')", name="ck_user_settings_biometric_policy"), CheckConstraint("calendar_default_duration_minutes BETWEEN 15 AND 120", name="ck_user_settings_calendar_duration"), CheckConstraint("calendar_booking_window_days BETWEEN 1 AND 60", name="ck_user_settings_calendar_window"),)
