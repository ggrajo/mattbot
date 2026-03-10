"""Add Google Calendar booking: tokens table, settings columns, onboarding step.

Revision ID: 019
Revises: 018
Create Date: 2026-03-03
"""

import logging

import sqlalchemy as sa

from alembic import op

logger = logging.getLogger(__name__)

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "google_calendar_tokens",
        sa.Column(
            "owner_user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("access_token_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("access_token_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("refresh_token_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("refresh_token_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("key_version", sa.Integer(), nullable=False),
        sa.Column("token_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("google_email", sa.String(255), nullable=False),
        sa.Column(
            "calendar_id",
            sa.String(255),
            nullable=False,
            server_default=sa.text("'primary'"),
        ),
        sa.Column(
            "connected_at",
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

    op.add_column(
        "user_settings",
        sa.Column(
            "calendar_booking_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "calendar_default_duration_minutes",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("30"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "calendar_booking_window_days",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("14"),
        ),
    )

    op.create_check_constraint(
        "ck_user_settings_calendar_duration",
        "user_settings",
        "calendar_default_duration_minutes BETWEEN 15 AND 120",
    )

    op.create_check_constraint(
        "ck_user_settings_calendar_window",
        "user_settings",
        "calendar_booking_window_days BETWEEN 1 AND 60",
    )

    connection = op.get_bind()

    try:
        result = connection.execute(
            sa.text("SELECT 1 FROM information_schema.tables WHERE table_name='onboarding_state'")
        )

        if result.scalar():
            connection.execute(
                sa.text(
                    "UPDATE onboarding_state "
                    "SET steps_completed = steps_completed || "
                    "'[\"calendar_setup\"]'::jsonb "
                    "WHERE steps_completed @> '[\"assistant_setup\"]'::jsonb "
                    "AND NOT steps_completed @> '[\"calendar_setup\"]'::jsonb"
                )
            )

    except Exception as e:
        logger.debug("Skipped onboarding_states backfill: %s", str(e))


def downgrade() -> None:
    op.drop_constraint("ck_user_settings_calendar_window", "user_settings", type_="check")
    op.drop_constraint("ck_user_settings_calendar_duration", "user_settings", type_="check")
    op.drop_column("user_settings", "calendar_booking_window_days")
    op.drop_column("user_settings", "calendar_default_duration_minutes")
    op.drop_column("user_settings", "calendar_booking_enabled")
    op.drop_table("google_calendar_tokens")
