"""Add device details (IP, location, remembered) and quiet hours intervals

Revision ID: 007
Revises: 006
Create Date: 2026-02-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "devices",
        sa.Column("last_ip", sa.String(45), nullable=True),
    )
    op.add_column(
        "devices",
        sa.Column("last_location", sa.String(120), nullable=True),
    )
    op.add_column(
        "devices",
        sa.Column(
            "is_remembered",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "quiet_hours_intervals",
            JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "quiet_hours_allow_vip",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.execute("""
        UPDATE user_settings
        SET quiet_hours_intervals = jsonb_build_array(
            jsonb_build_object(
                'label', 'Default',
                'start', to_char(quiet_hours_start, 'HH24:MI'),
                'end', to_char(quiet_hours_end, 'HH24:MI'),
                'days', quiet_hours_days
            )
        )
        WHERE quiet_hours_start IS NOT NULL
          AND quiet_hours_end IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_column("user_settings", "quiet_hours_allow_vip")
    op.drop_column("user_settings", "quiet_hours_intervals")
    op.drop_column("devices", "is_remembered")
    op.drop_column("devices", "last_location")
    op.drop_column("devices", "last_ip")
