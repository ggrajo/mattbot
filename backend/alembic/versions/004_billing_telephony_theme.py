"""Add billing, telephony, and theme_preference

Revision ID: 004
Revises: 003
Create Date: 2026-02-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column(
            "theme_preference",
            sa.String(10),
            nullable=False,
            server_default=sa.text("'system'"),
        ),
    )

    op.create_check_constraint(
        "ck_user_settings_theme_preference",
        "user_settings",
        "theme_preference IN ('system', 'light', 'dark')",
    )

    op.create_table(
        "billing_customers",
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("stripe_customer_id", sa.Text(), nullable=True, unique=True),
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

    op.create_table(
        "billing_subscriptions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("plan", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("stripe_subscription_id", sa.Text(), nullable=True, unique=True),
        sa.Column("stripe_price_id", sa.Text(), nullable=True),
        sa.Column(
            "current_period_start",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "cancel_at_period_end",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("minutes_included", sa.Integer(), nullable=False),
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
            "plan IN ('free', 'standard', 'pro')",
            name="ck_billing_subscriptions_plan",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')",
            name="ck_billing_subscriptions_status",
        ),
    )

    op.create_index(
        "ix_billing_subscriptions_owner",
        "billing_subscriptions",
        ["owner_user_id"],
    )

    op.create_table(
        "billing_payment_methods",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stripe_payment_method_id", sa.Text(), nullable=True, unique=True),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("last4", sa.Text(), nullable=True),
        sa.Column("exp_month", sa.Integer(), nullable=True),
        sa.Column("exp_year", sa.Integer(), nullable=True),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
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

    op.create_index(
        "ix_billing_payment_methods_owner",
        "billing_payment_methods",
        ["owner_user_id"],
    )

    op.create_table(
        "billing_usage",
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "minutes_used",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("last_usage_source", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "billing_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("provider_event_id", sa.Text(), nullable=False, unique=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("payload_redacted", postgresql.JSONB(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "ix_billing_events_event_type",
        "billing_events",
        ["event_type"],
    )

    op.create_table(
        "user_numbers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("twilio_number_sid", sa.Text(), nullable=True, unique=True),
        sa.Column("e164", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("provisioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
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
            "status IN ('provisioning', 'active', 'released', 'failed')",
            name="ck_user_numbers_status",
        ),
    )

    op.create_table(
        "call_mode_configs",
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "mode_a_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "mode_b_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "access_control",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'everyone'"),
        ),
        sa.Column("personal_number_e164_hash", sa.Text(), nullable=True),
        sa.Column(
            "personal_number_e164_ciphertext",
            sa.LargeBinary(),
            nullable=True,
        ),
        sa.Column("personal_number_nonce", sa.LargeBinary(), nullable=True),
        sa.Column("personal_number_key_version", sa.Integer(), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "verification_status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'unverified'"),
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
            "access_control IN ('everyone', 'contacts', 'vip')",
            name="ck_call_mode_configs_access_control",
        ),
        sa.CheckConstraint(
            "verification_status IN ('unverified', 'pending', 'verified', 'failed')",
            name="ck_call_mode_configs_verification_status",
        ),
    )

    op.create_table(
        "forwarding_verification_attempts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("verification_code", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("initiated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("twilio_call_sid", sa.Text(), nullable=True),
        sa.Column("details_redacted", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'passed', 'failed', 'expired')",
            name="ck_fwd_verification_status",
        ),
    )

    op.create_index(
        "ix_fwd_verification_user_status",
        "forwarding_verification_attempts",
        ["owner_user_id", "status"],
    )


def downgrade() -> None:
    op.drop_table("forwarding_verification_attempts")
    op.drop_table("call_mode_configs")
    op.drop_table("user_numbers")
    op.drop_table("billing_events")
    op.drop_table("billing_usage")
    op.drop_table("billing_payment_methods")
    op.drop_table("billing_subscriptions")
    op.drop_table("billing_customers")
    op.drop_constraint("ck_user_settings_theme_preference", "user_settings", type_="check")
    op.drop_column("user_settings", "theme_preference")
