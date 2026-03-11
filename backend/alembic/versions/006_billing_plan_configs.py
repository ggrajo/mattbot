"""006 billing plan configs

Revision ID: 006
Revises: 005
Create Date: 2026-03-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "billing_plan_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("plan_code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(50), nullable=True),
        sa.Column("price_cents", sa.Integer(), nullable=True),
        sa.Column("minutes_included", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False,
                   server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                   server_default=sa.text("now()")),
        sa.UniqueConstraint("plan_code", name="uq_billing_plan_configs_code"),
    )

    op.execute(
        """
        INSERT INTO billing_plan_configs (id, plan_code, name, price_cents, minutes_included, is_active)
        VALUES
            (uuid_generate_v4(), 'free',     'Free',     0,    10,  true),
            (uuid_generate_v4(), 'standard', 'Standard', 1499, 120, true),
            (uuid_generate_v4(), 'pro',      'Pro',      2999, 500, true)
        """
    )


def downgrade() -> None:
    op.drop_table("billing_plan_configs")
