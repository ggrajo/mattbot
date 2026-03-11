"""004 billing telephony theme

Revision ID: 004
Revises: 001
Create Date: 2026-03-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- billing_customers ---
    op.create_table(
        "billing_customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("billing_provider", sa.String(20), nullable=False,
                   server_default=sa.text("'manual'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_billing_customers_user_id"),
        sa.UniqueConstraint("stripe_customer_id", name="uq_billing_customers_stripe_id"),
    )

    # --- billing_subscriptions ---
    op.create_table(
        "billing_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan", sa.String(20), nullable=False,
                   server_default=sa.text("'free'")),
        sa.Column("status", sa.String(30), nullable=False,
                   server_default=sa.text("'incomplete'")),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("stripe_price_id", sa.String(), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False,
                   server_default=sa.text("false")),
        sa.Column("minutes_included", sa.Integer(), nullable=False,
                   server_default=sa.text("10")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_billing_subscriptions_user_id"),
        sa.UniqueConstraint("stripe_subscription_id",
                            name="uq_billing_subscriptions_stripe_id"),
        sa.CheckConstraint(
            "plan IN ('free', 'standard', 'pro')",
            name="ck_billing_subscriptions_plan",
        ),
        sa.CheckConstraint(
            "status IN ('incomplete', 'active', 'past_due', 'canceled', 'trialing', 'unpaid')",
            name="ck_billing_subscriptions_status",
        ),
    )

    # --- billing_payment_methods ---
    op.create_table(
        "billing_payment_methods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_payment_method_id", sa.String(), nullable=True),
        sa.Column("brand", sa.String(30), nullable=True),
        sa.Column("last4", sa.String(4), nullable=True),
        sa.Column("exp_month", sa.Integer(), nullable=True),
        sa.Column("exp_year", sa.Integer(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False,
                   server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("stripe_payment_method_id",
                            name="uq_billing_pm_stripe_id"),
    )
    op.create_index("billing_payment_methods_user_idx",
                     "billing_payment_methods", ["user_id"])

    # --- billing_usage ---
    op.create_table(
        "billing_usage",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("minutes_used", sa.Integer(), nullable=False,
                   server_default=sa.text("0")),
        sa.Column("last_reset_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_billing_usage_user_id"),
    )

    # --- billing_events ---
    op.create_table(
        "billing_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("provider_event_id", sa.String(), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload_redacted", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.UniqueConstraint("provider_event_id",
                            name="uq_billing_events_provider_id"),
    )
    op.create_index("billing_events_type_idx", "billing_events", ["event_type"])

    # --- user_numbers ---
    op.create_table(
        "user_numbers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("twilio_number_sid", sa.String(), nullable=True),
        sa.Column("e164", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False,
                   server_default=sa.text("'active'")),
        sa.Column("provisioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_user_numbers_user_id"),
        sa.UniqueConstraint("twilio_number_sid", name="uq_user_numbers_twilio_sid"),
        sa.UniqueConstraint("e164", name="uq_user_numbers_e164"),
        sa.CheckConstraint(
            "status IN ('active', 'released', 'suspended')",
            name="ck_user_numbers_status",
        ),
    )

    # --- call_mode_configs ---
    op.create_table(
        "call_mode_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mode", sa.String(10), nullable=False,
                   server_default=sa.text("'mode_a'")),
        sa.Column("forwarding_number", sa.String(20), nullable=True),
        sa.Column("forwarding_verified", sa.Boolean(), nullable=False,
                   server_default=sa.text("false")),
        sa.Column("forwarding_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_call_mode_configs_user_id"),
        sa.CheckConstraint(
            "mode IN ('mode_a', 'mode_b', 'mode_c')",
            name="ck_call_mode_configs_mode",
        ),
    )

    # --- forwarding_verification_attempts ---
    op.create_table(
        "forwarding_verification_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("verification_code", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False,
                   server_default=sa.text("'pending'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "status IN ('pending', 'verified', 'expired', 'failed')",
            name="ck_fwd_verification_status",
        ),
    )
    op.create_index("fwd_verification_user_idx",
                     "forwarding_verification_attempts", ["user_id"])

    # --- user_settings (new table with theme_preference) ---
    op.create_table(
        "user_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("theme_preference", sa.String(10), nullable=False,
                   server_default=sa.text("'system'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_user_settings_user_id"),
        sa.CheckConstraint(
            "theme_preference IN ('light', 'dark', 'system')",
            name="ck_user_settings_theme",
        ),
    )


def downgrade() -> None:
    op.drop_table("user_settings")
    op.drop_table("forwarding_verification_attempts")
    op.drop_table("call_mode_configs")
    op.drop_table("user_numbers")
    op.drop_table("billing_events")
    op.drop_table("billing_usage")
    op.drop_table("billing_payment_methods")
    op.drop_table("billing_subscriptions")
    op.drop_table("billing_customers")
