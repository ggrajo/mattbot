"""Add minutes_carried_over to billing_subscriptions

Revision ID: 009
Revises: 008
Create Date: 2026-02-24

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "009"
down_revision: str | None = "008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "billing_subscriptions",
        sa.Column(
            "minutes_carried_over",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("billing_subscriptions", "minutes_carried_over")
