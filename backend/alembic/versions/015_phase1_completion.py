"""Phase 1 completion: VIP/block lists, reminders, notifications, handoff,
and expanded user_settings columns.

Revision ID: 015
Revises: 014
Create Date: 2026-02-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op

revision: str = "015"
down_revision: str | None = "014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "vip_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phone_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("phone_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("phone_key_version", sa.Integer(), nullable=False),
        sa.Column("phone_hash", sa.String(64), nullable=False),
        sa.Column("phone_last4", sa.String(4), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("owner_user_id", "phone_hash", name="uq_vip_entries_user_phone"),
    )

    op.create_index("vip_entries_user_idx", "vip_entries", ["owner_user_id"])

    op.create_table(
        "block_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phone_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("phone_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("phone_key_version", sa.Integer(), nullable=False),
        sa.Column("phone_hash", sa.String(64), nullable=False),
        sa.Column("phone_last4", sa.String(4), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("owner_user_id", "phone_hash", name="uq_block_entries_user_phone"),
    )

    op.create_index("block_entries_user_idx", "block_entries", ["owner_user_id"])

    op.create_table(
        "reminders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "call_id",
            UUID(as_uuid=True),
            sa.ForeignKey("calls.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone_at_creation", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("created_by_device_id", UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('scheduled', 'triggered', 'completed', 'cancelled')",
            name="ck_reminders_status",
        ),
    )

    op.create_index("reminders_user_due_idx", "reminders", ["owner_user_id", "due_at"])

    op.create_index(
        "reminders_scheduled_due_idx",
        "reminders",
        ["due_at"],
        postgresql_where=sa.text("status = 'scheduled'"),
    )

    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column(
            "priority",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'normal'"),
        ),
        sa.Column("source_entity_type", sa.Text(), nullable=True),
        sa.Column("source_entity_id", UUID(as_uuid=True), nullable=True),
        sa.Column("privacy_mode_applied", sa.Text(), nullable=False),
        sa.Column(
            "quiet_hours_applied",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'none'"),
        ),
        sa.Column("content_hash", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "type IN ('call_screened_created', 'call_important_detected', "
            "'handoff_available', 'call_processing_error', 'reminder_due')",
            name="ck_notifications_type",
        ),
        sa.CheckConstraint(
            "priority IN ('low', 'normal', 'high', 'critical')",
            name="ck_notifications_priority",
        ),
        sa.CheckConstraint(
            "source_entity_type IN ('call', 'handoff_offer', 'reminder', "
            "'system_error') OR source_entity_type IS NULL",
            name="ck_notifications_source_entity_type",
        ),
        sa.CheckConstraint(
            "privacy_mode_applied IN ('private', 'preview')",
            name="ck_notifications_privacy_mode",
        ),
        sa.CheckConstraint(
            "quiet_hours_applied IN ('none', 'silent', 'suppressed')",
            name="ck_notifications_quiet_hours",
        ),
    )

    op.create_index(
        "notifications_user_created_idx",
        "notifications",
        ["owner_user_id", sa.text("created_at DESC")],
    )

    op.create_table(
        "notification_deliveries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "notification_id",
            UUID(as_uuid=True),
            sa.ForeignKey("notifications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'queued'"),
        ),
        sa.Column(
            "attempt_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_message_id", sa.Text(), nullable=True),
        sa.Column("last_error_code", sa.Text(), nullable=True),
        sa.Column("last_error_message_short", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "provider IN ('apns', 'fcm')",
            name="ck_notification_deliveries_provider",
        ),
        sa.CheckConstraint(
            "status IN ('queued', 'sending', 'provider_accepted', "
            "'provider_rejected', 'delivered_ack', 'expired', 'cancelled')",
            name="ck_notification_deliveries_status",
        ),
        sa.UniqueConstraint(
            "notification_id",
            "device_id",
            name="uq_notification_deliveries_notif_device",
        ),
    )

    op.create_table(
        "handoff_offers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "call_id",
            UUID(as_uuid=True),
            sa.ForeignKey("calls.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'offered'"),
        ),
        sa.Column("offer_reason", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "selected_device_id",
            UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("preview_payload", JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("call_id", name="uq_handoff_offers_call"),
        sa.CheckConstraint(
            "status IN ('offered', 'accepted', 'declined', 'expired')",
            name="ck_handoff_offers_status",
        ),
        sa.CheckConstraint(
            "offer_reason IS NULL OR offer_reason IN ('vip', 'urgent', 'vip_and_urgent')",
            name="ck_handoff_offers_reason",
        ),
    )

    op.create_index("handoff_offers_user_idx", "handoff_offers", ["owner_user_id"])

    op.create_index(
        "handoff_offers_pending_idx",
        "handoff_offers",
        ["status", "expires_at"],
        postgresql_where=sa.text("status = 'offered'"),
    )

    op.create_table(
        "handoff_suppressions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("destination_phone_hash", sa.String(64), nullable=False),
        sa.Column(
            "suppression_expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "handoff_suppressions_user_dest_idx",
        "handoff_suppressions",
        ["owner_user_id", "destination_phone_hash"],
    )

    op.add_column(
        "calls",
        sa.Column(
            "handoff_eligible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "calls",
        sa.Column("handoff_status", sa.Text(), nullable=True),
    )

    op.add_column(
        "calls",
        sa.Column("handoff_offered_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "calls",
        sa.Column(
            "handoff_offer_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "calls",
        sa.Column("handoff_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "calls",
        sa.Column("handoff_selected_device_id", UUID(as_uuid=True), nullable=True),
    )

    op.add_column(
        "calls",
        sa.Column(
            "handoff_attempt_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.add_column(
        "calls",
        sa.Column("handoff_failure_reason", sa.Text(), nullable=True),
    )

    op.add_column(
        "calls",
        sa.Column(
            "handoff_loop_detected",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.create_check_constraint(
        "ck_calls_handoff_status",
        "calls",
        "handoff_status IS NULL OR handoff_status IN ("
        "'not_applicable', 'eligible_pending_minimum_data', "
        "'offered', 'accepted', 'declined', 'expired', "
        "'transfer_starting', 'transfer_connected', "
        "'transfer_failed', 'transfer_cancelled')",
    )

    op.create_index(
        "calls_retention_idx",
        "calls",
        ["retention_expires_at"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "handoff_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "handoff_trigger",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'vip_only'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "handoff_offer_timeout_seconds",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("20"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "business_hours_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column("business_hours_start", sa.Time(), nullable=True),
    )

    op.add_column(
        "user_settings",
        sa.Column("business_hours_end", sa.Time(), nullable=True),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "business_hours_days",
            JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "after_hours_behavior",
            sa.String(40),
            nullable=False,
            server_default=sa.text("'screen_normally'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "temperament_preset",
            sa.String(40),
            nullable=False,
            server_default=sa.text("'professional_polite'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "swearing_rule",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'no_swearing'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "language_primary",
            sa.String(10),
            nullable=False,
            server_default=sa.text("'en'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column("language_secondary", sa.String(10), nullable=True),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "vip_calls_mark_important",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "vip_notification_intensity",
            sa.String(10),
            nullable=False,
            server_default=sa.text("'normal'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "blocked_caller_behavior",
            sa.String(30),
            nullable=False,
            server_default=sa.text("'end_immediately'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "log_blocked_attempts",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "notify_on_blocked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "spam_labeling_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "block_suggestions_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "repeat_caller_threshold",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("3"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "text_approval_mode",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'always_approve'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "assistant_name",
            sa.String(60),
            nullable=False,
            server_default=sa.text("'Alex'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "greeting_template",
            sa.String(40),
            nullable=False,
            server_default=sa.text("'standard'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "transcript_disclosure_mode",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'ai_says_it'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "recording_announcement_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "important_rule",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'vip_and_urgent'"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "biometric_policy",
            sa.String(30),
            nullable=False,
            server_default=sa.text("'gate_call_details'"),
        ),
    )

    op.create_check_constraint(
        "ck_user_settings_handoff_trigger",
        "user_settings",
        "handoff_trigger IN ('vip_only', 'always', 'never')",
    )

    op.create_check_constraint(
        "ck_user_settings_handoff_timeout",
        "user_settings",
        "handoff_offer_timeout_seconds BETWEEN 10 AND 60",
    )

    op.create_check_constraint(
        "ck_user_settings_after_hours",
        "user_settings",
        "after_hours_behavior IN ('screen_normally', 'voicemail_only', 'reject')",
    )

    op.create_check_constraint(
        "ck_user_settings_temperament",
        "user_settings",
        "temperament_preset IN ('professional_polite', 'casual_friendly', 'formal', 'custom')",
    )

    op.create_check_constraint(
        "ck_user_settings_swearing",
        "user_settings",
        "swearing_rule IN ('no_swearing', 'mirror_caller', 'allow')",
    )

    op.create_check_constraint(
        "ck_user_settings_vip_notif",
        "user_settings",
        "vip_notification_intensity IN ('normal', 'high', 'urgent')",
    )

    op.create_check_constraint(
        "ck_user_settings_blocked_behavior",
        "user_settings",
        "blocked_caller_behavior IN ('end_immediately', 'play_message', 'silent_drop')",
    )

    op.create_check_constraint(
        "ck_user_settings_repeat_threshold",
        "user_settings",
        "repeat_caller_threshold BETWEEN 1 AND 10",
    )

    op.create_check_constraint(
        "ck_user_settings_text_approval",
        "user_settings",
        "text_approval_mode IN ('always_approve', 'auto_send', 'never')",
    )

    op.create_check_constraint(
        "ck_user_settings_greeting",
        "user_settings",
        "greeting_template IN ('standard', 'brief', 'formal', 'custom')",
    )

    op.create_check_constraint(
        "ck_user_settings_disclosure",
        "user_settings",
        "transcript_disclosure_mode IN ('ai_says_it', 'silent', 'beep')",
    )

    op.create_check_constraint(
        "ck_user_settings_important_rule",
        "user_settings",
        "important_rule IN ('vip_and_urgent', 'vip_only', 'urgent_only', 'all')",
    )

    op.create_check_constraint(
        "ck_user_settings_biometric_policy",
        "user_settings",
        "biometric_policy IN ('gate_call_details', 'gate_all', 'off')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_user_settings_biometric_policy", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_important_rule", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_disclosure", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_greeting", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_text_approval", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_repeat_threshold", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_blocked_behavior", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_vip_notif", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_swearing", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_temperament", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_after_hours", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_handoff_timeout", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_handoff_trigger", "user_settings", type_="check")

    op.drop_column("user_settings", "biometric_policy")
    op.drop_column("user_settings", "important_rule")
    op.drop_column("user_settings", "recording_announcement_required")
    op.drop_column("user_settings", "transcript_disclosure_mode")
    op.drop_column("user_settings", "greeting_template")
    op.drop_column("user_settings", "assistant_name")
    op.drop_column("user_settings", "text_approval_mode")
    op.drop_column("user_settings", "repeat_caller_threshold")
    op.drop_column("user_settings", "block_suggestions_enabled")
    op.drop_column("user_settings", "spam_labeling_enabled")
    op.drop_column("user_settings", "notify_on_blocked")
    op.drop_column("user_settings", "log_blocked_attempts")
    op.drop_column("user_settings", "blocked_caller_behavior")
    op.drop_column("user_settings", "vip_notification_intensity")
    op.drop_column("user_settings", "vip_calls_mark_important")
    op.drop_column("user_settings", "language_secondary")
    op.drop_column("user_settings", "language_primary")
    op.drop_column("user_settings", "swearing_rule")
    op.drop_column("user_settings", "temperament_preset")
    op.drop_column("user_settings", "after_hours_behavior")
    op.drop_column("user_settings", "business_hours_days")
    op.drop_column("user_settings", "business_hours_end")
    op.drop_column("user_settings", "business_hours_start")
    op.drop_column("user_settings", "business_hours_enabled")
    op.drop_column("user_settings", "handoff_offer_timeout_seconds")
    op.drop_column("user_settings", "handoff_trigger")
    op.drop_column("user_settings", "handoff_enabled")

    op.drop_index("calls_retention_idx", table_name="calls")
    op.drop_constraint("ck_calls_handoff_status", "calls", type_="check")
    op.drop_column("calls", "handoff_loop_detected")
    op.drop_column("calls", "handoff_failure_reason")
    op.drop_column("calls", "handoff_attempt_count")
    op.drop_column("calls", "handoff_selected_device_id")
    op.drop_column("calls", "handoff_accepted_at")
    op.drop_column("calls", "handoff_offer_expires_at")
    op.drop_column("calls", "handoff_offered_at")
    op.drop_column("calls", "handoff_status")
    op.drop_column("calls", "handoff_eligible")

    op.drop_table("handoff_suppressions")
    op.drop_table("handoff_offers")
    op.drop_table("notification_deliveries")
    op.drop_table("notifications")
    op.drop_table("reminders")
    op.drop_table("block_entries")
    op.drop_table("vip_entries")
