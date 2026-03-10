"""Add PIN login columns to devices table

Revision ID: 027
Revises: 026
Create Date: 2026-03-05
"""

import sqlalchemy as sa

from alembic import op

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "devices",
        sa.Column("pin_hash", sa.String(255), nullable=True),
    )
    op.add_column(
        "devices",
        sa.Column(
            "pin_failed_attempts",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.add_column(
        "devices",
        sa.Column("pin_locked_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "devices",
        sa.Column("pin_set_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("devices", "pin_set_at")
    op.drop_column("devices", "pin_locked_until")
    op.drop_column("devices", "pin_failed_attempts")
    op.drop_column("devices", "pin_hash")
