"""Add encrypted notes columns to call_artifacts

Revision ID: 013
Revises: 012
Create Date: 2026-02-27

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "013"
down_revision: str | None = "012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "call_artifacts",
        sa.Column("notes_ciphertext", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "call_artifacts",
        sa.Column("notes_nonce", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "call_artifacts",
        sa.Column("notes_key_version", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("call_artifacts", "notes_key_version")
    op.drop_column("call_artifacts", "notes_nonce")
    op.drop_column("call_artifacts", "notes_ciphertext")
