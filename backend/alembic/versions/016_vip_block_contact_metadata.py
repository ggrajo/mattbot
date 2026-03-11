"""Add contact metadata columns to vip_entries and block_entries.

Revision ID: 016
Revises: 015
Create Date: 2026-02-27

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "016"
down_revision: str | None = "015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "vip_entries",
        sa.Column("company", sa.String(200), nullable=True),
    )
    op.add_column(
        "vip_entries",
        sa.Column("relationship", sa.String(100), nullable=True),
    )
    op.add_column(
        "vip_entries",
        sa.Column("email", sa.String(254), nullable=True),
    )
    op.add_column(
        "vip_entries",
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.add_column(
        "block_entries",
        sa.Column("company", sa.String(200), nullable=True),
    )
    op.add_column(
        "block_entries",
        sa.Column("relationship", sa.String(100), nullable=True),
    )
    op.add_column(
        "block_entries",
        sa.Column("email", sa.String(254), nullable=True),
    )
    op.add_column(
        "block_entries",
        sa.Column("notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("block_entries", "notes")
    op.drop_column("block_entries", "email")
    op.drop_column("block_entries", "relationship")
    op.drop_column("block_entries", "company")

    op.drop_column("vip_entries", "notes")
    op.drop_column("vip_entries", "email")
    op.drop_column("vip_entries", "relationship")
    op.drop_column("vip_entries", "company")
