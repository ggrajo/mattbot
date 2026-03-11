"""027 user settings full columns

Adds all remaining user_settings columns that were not covered by
migrations 004 (initial table), 007 (quiet hours), or 019 (calendar).

Revision ID: 027
Revises: 026
Create Date: 2026-03-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "027"
down_revision: Union[str, None] = "026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "user_settings"


def upgrade() -> None:
    # versioning
    op.add_column(TABLE, sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column(TABLE, sa.Column("revision", sa.Integer(), nullable=False, server_default="1"))

    # notifications
    op.add_column(TABLE, sa.Column("notification_privacy_mode", sa.String(20), nullable=False, server_default="private"))

    # quiet hours (days, intervals, allow_vip – 007 already added enabled/start/end)
    op.add_column(TABLE, sa.Column("quiet_hours_days", sa.dialects.postgresql.JSONB(), nullable=False, server_default="[]"))
    op.add_column(TABLE, sa.Column("quiet_hours_intervals", sa.dialects.postgresql.JSONB(), nullable=False, server_default="[]"))
    op.add_column(TABLE, sa.Column("quiet_hours_allow_vip", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("timezone", sa.String(60), nullable=False, server_default="UTC"))

    # personal phone (encrypted)
    op.add_column(TABLE, sa.Column("personal_phone_ciphertext", sa.LargeBinary(), nullable=True))
    op.add_column(TABLE, sa.Column("personal_phone_nonce", sa.LargeBinary(), nullable=True))
    op.add_column(TABLE, sa.Column("personal_phone_key_version", sa.Integer(), nullable=True))
    op.add_column(TABLE, sa.Column("personal_phone_last4", sa.String(4), nullable=True))

    # memory & privacy
    op.add_column(TABLE, sa.Column("memory_enabled", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column(TABLE, sa.Column("data_retention_days", sa.Integer(), nullable=False, server_default="30"))
    op.add_column(TABLE, sa.Column("biometric_unlock_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("recording_enabled", sa.Boolean(), nullable=False, server_default="false"))

    # call behavior
    op.add_column(TABLE, sa.Column("call_objective_mode", sa.String(40), nullable=False, server_default="screen_and_summarize"))
    op.add_column(TABLE, sa.Column("max_call_length_seconds", sa.Integer(), nullable=False, server_default="180"))
    op.add_column(TABLE, sa.Column("vip_max_call_length_seconds", sa.Integer(), nullable=False, server_default="300"))

    # handoff
    op.add_column(TABLE, sa.Column("handoff_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("handoff_trigger", sa.String(20), nullable=False, server_default="vip_only"))
    op.add_column(TABLE, sa.Column("handoff_offer_timeout_seconds", sa.Integer(), nullable=False, server_default="20"))
    op.add_column(TABLE, sa.Column("handoff_target_phone_ciphertext", sa.LargeBinary(), nullable=True))
    op.add_column(TABLE, sa.Column("handoff_target_phone_nonce", sa.LargeBinary(), nullable=True))
    op.add_column(TABLE, sa.Column("handoff_target_phone_key_version", sa.Integer(), nullable=True))
    op.add_column(TABLE, sa.Column("handoff_target_phone_last4", sa.String(4), nullable=True))

    # business hours
    op.add_column(TABLE, sa.Column("business_hours_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("business_hours_start", sa.Time(), nullable=True))
    op.add_column(TABLE, sa.Column("business_hours_end", sa.Time(), nullable=True))
    op.add_column(TABLE, sa.Column("business_hours_days", sa.dialects.postgresql.JSONB(), nullable=False, server_default="[]"))
    op.add_column(TABLE, sa.Column("after_hours_behavior", sa.String(40), nullable=False, server_default="screen_normally"))

    # contacts & categories
    op.add_column(TABLE, sa.Column("contact_category_defaults", sa.dialects.postgresql.JSONB(), nullable=False, server_default="{}"))
    op.add_column(TABLE, sa.Column("custom_contact_categories", sa.dialects.postgresql.JSONB(), nullable=False, server_default="[]"))

    # temperament & language
    op.add_column(TABLE, sa.Column("temperament_preset", sa.String(40), nullable=False, server_default="professional_polite"))
    op.add_column(TABLE, sa.Column("swearing_rule", sa.String(20), nullable=False, server_default="no_swearing"))
    op.add_column(TABLE, sa.Column("language_primary", sa.String(10), nullable=False, server_default="en"))
    op.add_column(TABLE, sa.Column("language_secondary", sa.String(10), nullable=True))

    # VIP
    op.add_column(TABLE, sa.Column("vip_calls_mark_important", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column(TABLE, sa.Column("vip_notification_intensity", sa.String(10), nullable=False, server_default="normal"))

    # blocked callers
    op.add_column(TABLE, sa.Column("blocked_caller_behavior", sa.String(30), nullable=False, server_default="end_immediately"))
    op.add_column(TABLE, sa.Column("log_blocked_attempts", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("notify_on_blocked", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("spam_labeling_enabled", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column(TABLE, sa.Column("block_suggestions_enabled", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column(TABLE, sa.Column("repeat_caller_threshold", sa.Integer(), nullable=False, server_default="3"))

    # text / messaging
    op.add_column(TABLE, sa.Column("text_approval_mode", sa.String(20), nullable=False, server_default="always_approve"))

    # assistant persona
    op.add_column(TABLE, sa.Column("assistant_name", sa.String(60), nullable=False, server_default="Alex"))
    op.add_column(TABLE, sa.Column("greeting_template", sa.String(40), nullable=False, server_default="standard"))
    op.add_column(TABLE, sa.Column("transcript_disclosure_mode", sa.String(20), nullable=False, server_default="ai_says_it"))
    op.add_column(TABLE, sa.Column("recording_announcement_required", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column(TABLE, sa.Column("important_rule", sa.String(20), nullable=False, server_default="vip_and_urgent"))
    op.add_column(TABLE, sa.Column("biometric_policy", sa.String(30), nullable=False, server_default="gate_call_details"))

    # calendar (duration + window – 019 already added booking_enabled)
    op.add_column(TABLE, sa.Column("calendar_default_duration_minutes", sa.Integer(), nullable=False, server_default="30"))
    op.add_column(TABLE, sa.Column("calendar_booking_window_days", sa.Integer(), nullable=False, server_default="14"))

    # urgent notifications (encrypted phone)
    op.add_column(TABLE, sa.Column("urgent_notify_sms", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("urgent_notify_email", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("urgent_notify_call", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column(TABLE, sa.Column("urgent_notify_phone_ciphertext", sa.LargeBinary(), nullable=True))
    op.add_column(TABLE, sa.Column("urgent_notify_phone_nonce", sa.LargeBinary(), nullable=True))
    op.add_column(TABLE, sa.Column("urgent_notify_phone_key_version", sa.Integer(), nullable=True))
    op.add_column(TABLE, sa.Column("urgent_notify_phone_last4", sa.String(4), nullable=True))
    op.add_column(TABLE, sa.Column("urgent_notify_email_address", sa.String(254), nullable=True))

    # audit
    op.add_column(TABLE, sa.Column("updated_by_device_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_user_settings_device", TABLE, "devices", ["updated_by_device_id"], ["id"], ondelete="SET NULL")

    # check constraints
    op.create_check_constraint("ck_user_settings_privacy_mode", TABLE, "notification_privacy_mode IN ('private', 'preview')")
    op.create_check_constraint("ck_user_settings_retention_days", TABLE, "data_retention_days IN (7, 30, 90)")
    op.create_check_constraint("ck_user_settings_max_call", TABLE, "max_call_length_seconds BETWEEN 120 AND 300")
    op.create_check_constraint("ck_user_settings_vip_call", TABLE, "vip_max_call_length_seconds BETWEEN 180 AND 600")
    op.create_check_constraint("ck_user_settings_handoff_trigger", TABLE, "handoff_trigger IN ('vip_only', 'urgent_only', 'vip_and_urgent', 'always', 'never')")
    op.create_check_constraint("ck_user_settings_handoff_timeout", TABLE, "handoff_offer_timeout_seconds BETWEEN 10 AND 60")
    op.create_check_constraint("ck_user_settings_after_hours", TABLE, "after_hours_behavior IN ('screen_normally', 'voicemail_only', 'reject')")
    op.create_check_constraint("ck_user_settings_temperament", TABLE, "temperament_preset IN ('professional_polite', 'casual_friendly', 'short_and_direct', 'warm_and_supportive', 'formal', 'custom')")
    op.create_check_constraint("ck_user_settings_swearing", TABLE, "swearing_rule IN ('no_swearing', 'mirror_caller', 'allow')")
    op.create_check_constraint("ck_user_settings_vip_notif", TABLE, "vip_notification_intensity IN ('normal', 'high', 'urgent')")
    op.create_check_constraint("ck_user_settings_blocked_behavior", TABLE, "blocked_caller_behavior IN ('end_immediately', 'play_message', 'silent_drop')")
    op.create_check_constraint("ck_user_settings_repeat_threshold", TABLE, "repeat_caller_threshold BETWEEN 1 AND 10")
    op.create_check_constraint("ck_user_settings_text_approval", TABLE, "text_approval_mode IN ('always_approve', 'auto_send', 'never')")
    op.create_check_constraint("ck_user_settings_greeting", TABLE, "greeting_template IN ('standard', 'brief', 'formal', 'custom')")
    op.create_check_constraint("ck_user_settings_disclosure", TABLE, "transcript_disclosure_mode IN ('ai_says_it', 'silent', 'beep')")
    op.create_check_constraint("ck_user_settings_important_rule", TABLE, "important_rule IN ('vip_and_urgent', 'vip_only', 'urgent_only', 'all')")
    op.create_check_constraint("ck_user_settings_biometric_policy", TABLE, "biometric_policy IN ('gate_call_details', 'gate_all', 'off')")
    op.create_check_constraint("ck_user_settings_calendar_duration", TABLE, "calendar_default_duration_minutes BETWEEN 15 AND 120")
    op.create_check_constraint("ck_user_settings_calendar_window", TABLE, "calendar_booking_window_days BETWEEN 1 AND 60")


def downgrade() -> None:
    # drop constraints
    constraints = [
        "ck_user_settings_calendar_window", "ck_user_settings_calendar_duration",
        "ck_user_settings_biometric_policy", "ck_user_settings_important_rule",
        "ck_user_settings_disclosure", "ck_user_settings_greeting",
        "ck_user_settings_text_approval", "ck_user_settings_repeat_threshold",
        "ck_user_settings_blocked_behavior", "ck_user_settings_vip_notif",
        "ck_user_settings_swearing", "ck_user_settings_temperament",
        "ck_user_settings_after_hours", "ck_user_settings_handoff_timeout",
        "ck_user_settings_handoff_trigger", "ck_user_settings_vip_call",
        "ck_user_settings_max_call", "ck_user_settings_retention_days",
        "ck_user_settings_privacy_mode",
    ]
    for name in constraints:
        op.drop_constraint(name, TABLE, type_="check")

    op.drop_constraint("fk_user_settings_device", TABLE, type_="foreignkey")

    columns = [
        "schema_version", "revision", "notification_privacy_mode",
        "quiet_hours_days", "quiet_hours_intervals", "quiet_hours_allow_vip", "timezone",
        "personal_phone_ciphertext", "personal_phone_nonce",
        "personal_phone_key_version", "personal_phone_last4",
        "memory_enabled", "data_retention_days", "biometric_unlock_enabled", "recording_enabled",
        "call_objective_mode", "max_call_length_seconds", "vip_max_call_length_seconds",
        "handoff_enabled", "handoff_trigger", "handoff_offer_timeout_seconds",
        "handoff_target_phone_ciphertext", "handoff_target_phone_nonce",
        "handoff_target_phone_key_version", "handoff_target_phone_last4",
        "business_hours_enabled", "business_hours_start", "business_hours_end",
        "business_hours_days", "after_hours_behavior",
        "contact_category_defaults", "custom_contact_categories",
        "temperament_preset", "swearing_rule", "language_primary", "language_secondary",
        "vip_calls_mark_important", "vip_notification_intensity",
        "blocked_caller_behavior", "log_blocked_attempts", "notify_on_blocked",
        "spam_labeling_enabled", "block_suggestions_enabled", "repeat_caller_threshold",
        "text_approval_mode", "assistant_name", "greeting_template",
        "transcript_disclosure_mode", "recording_announcement_required",
        "important_rule", "biometric_policy",
        "calendar_default_duration_minutes", "calendar_booking_window_days",
        "urgent_notify_sms", "urgent_notify_email", "urgent_notify_call",
        "urgent_notify_phone_ciphertext", "urgent_notify_phone_nonce",
        "urgent_notify_phone_key_version", "urgent_notify_phone_last4",
        "urgent_notify_email_address", "updated_by_device_id",
    ]
    for col in columns:
        op.drop_column(TABLE, col)
