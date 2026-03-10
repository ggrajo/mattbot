"""Dynamic billing plan configs: new tables + drop hardcoded plan CHECK

Revision ID: 006
Revises: 005
Create Date: 2026-02-23
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "billing_plan_configs",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_by_admin_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_index(
        "uq_billing_plan_configs_active",
        "billing_plan_configs",
        ["is_active"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    op.create_table(
        "billing_plan_config_plans",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "config_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("billing_plan_configs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("price_usd", sa.String(10), nullable=False),
        sa.Column("included_minutes", sa.Integer(), nullable=False),
        sa.Column("stripe_price_id", sa.Text(), nullable=True),
        sa.Column(
            "requires_credit_card",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "limited",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "icon",
            sa.Text(),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.UniqueConstraint("config_id", "code", name="uq_billing_plan_config_plans_code"),
    )

    op.create_table(
        "billing_plan_config_rules",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "config_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("billing_plan_configs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("from_plan", sa.String(30), nullable=False),
        sa.Column("to_plan", sa.String(30), nullable=False),
        sa.Column(
            "trigger",
            sa.String(30),
            nullable=False,
            server_default=sa.text("'minutes_exceeded'"),
        ),
        sa.UniqueConstraint(
            "config_id",
            "from_plan",
            name="uq_billing_plan_config_rules_from",
        ),
    )

    op.drop_constraint(
        "ck_billing_subscriptions_plan",
        "billing_subscriptions",
        type_="check",
    )


def downgrade() -> None:
    op.create_check_constraint(
        "ck_billing_subscriptions_plan",
        "billing_subscriptions",
        "plan IN ('free', 'standard', 'pro')",
    )
    op.drop_table("billing_plan_config_rules")
    op.drop_table("billing_plan_config_plans")
    op.drop_table("billing_plan_configs")
