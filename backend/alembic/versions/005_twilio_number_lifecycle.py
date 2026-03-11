"""Twilio number lifecycle: add pending/suspended states and new columns

Revision ID: 005
Revises: 004
Create Date: 2026-02-23
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user_numbers",
        sa.Column(
            "suspended_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "user_numbers",
        sa.Column(
            "suspend_reason",
            sa.String(40),
            nullable=True,
        ),
    )

    op.add_column(
        "user_numbers",
        sa.Column("last_error", sa.Text(), nullable=True),
    )

    op.add_column(
        "user_numbers",
        sa.Column("webhook_url", sa.Text(), nullable=True),
    )

    op.execute("UPDATE user_numbers SET status = 'pending' WHERE status = 'provisioning'")

    op.drop_constraint("ck_user_numbers_status", "user_numbers", type_="check")

    op.create_check_constraint(
        "ck_user_numbers_status",
        "user_numbers",
        "status IN ('pending', 'active', 'suspended', 'released', 'failed')",
    )

    op.create_index(
        "ix_user_numbers_status_updated",
        "user_numbers",
        ["status", "updated_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_numbers_status_updated", table_name="user_numbers")

    op.drop_constraint("ck_user_numbers_status", "user_numbers", type_="check")

    op.create_check_constraint(
        "ck_user_numbers_status",
        "user_numbers",
        "status IN ('provisioning', 'active', 'released', 'failed')",
    )

    op.drop_column("user_numbers", "webhook_url")
    op.drop_column("user_numbers", "last_error")
    op.drop_column("user_numbers", "suspend_reason")
    op.drop_column("user_numbers", "suspended_at")
