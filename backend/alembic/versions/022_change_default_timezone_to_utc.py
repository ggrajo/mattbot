"""Change default timezone from America/New_York to UTC

Revision ID: 022
Revises: 021
Create Date: 2026-03-03
"""

from alembic import op

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "user_settings",
        "timezone",
        server_default="UTC",
    )


def downgrade() -> None:
    op.alter_column(
        "user_settings",
        "timezone",
        server_default="America/New_York",
    )
