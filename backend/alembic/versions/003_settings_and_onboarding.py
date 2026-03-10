"""Add user_settings and onboarding_state tables

Revision ID: 003
Revises: 002
Create Date: 2026-02-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "schema_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column(
            "revision",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column(
            "notification_privacy_mode",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'private'"),
        ),
        sa.Column(
            "quiet_hours_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("quiet_hours_start", sa.Time(), nullable=True),
        sa.Column("quiet_hours_end", sa.Time(), nullable=True),
        sa.Column(
            "quiet_hours_days",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "timezone",
            sa.String(60),
            nullable=False,
            server_default=sa.text("'America/New_York'"),
        ),
        sa.Column(
            "memory_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "data_retention_days",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("30"),
        ),
        sa.Column(
            "biometric_unlock_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "recording_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "call_objective_mode",
            sa.String(40),
            nullable=False,
            server_default=sa.text("'screen_and_summarize'"),
        ),
        sa.Column(
            "max_call_length_seconds",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("180"),
        ),
        sa.Column(
            "vip_max_call_length_seconds",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("300"),
        ),
        sa.Column(
            "updated_by_device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
        sa.CheckConstraint(
            "notification_privacy_mode IN ('private', 'preview')",
            name="ck_user_settings_privacy_mode",
        ),
        sa.CheckConstraint(
            "data_retention_days IN (7, 30, 90)",
            name="ck_user_settings_retention_days",
        ),
        sa.CheckConstraint(
            "max_call_length_seconds BETWEEN 120 AND 300",
            name="ck_user_settings_max_call",
        ),
        sa.CheckConstraint(
            "vip_max_call_length_seconds BETWEEN 180 AND 600",
            name="ck_user_settings_vip_call",
        ),
    )

    op.create_table(
        "onboarding_state",
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "current_step",
            sa.String(40),
            nullable=False,
            server_default=sa.text("'privacy_review'"),
        ),
        sa.Column(
            "steps_completed",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_by_device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
    )


def downgrade() -> None:
    op.drop_table("onboarding_state")
    op.drop_table("user_settings")
