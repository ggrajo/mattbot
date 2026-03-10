"""Add calendar booking link columns to calls table.

Revision ID: 020
Revises: 019
Create Date: 2026-03-03
"""

import sqlalchemy as sa

from alembic import op

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "calls",
        sa.Column("booked_calendar_event_id", sa.Text(), nullable=True),
    )
    op.add_column(
        "calls",
        sa.Column("booked_calendar_event_summary", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("calls", "booked_calendar_event_summary")
    op.drop_column("calls", "booked_calendar_event_id")
