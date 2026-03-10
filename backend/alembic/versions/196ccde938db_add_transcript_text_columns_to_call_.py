"""add_transcript_text_columns_to_call_artifacts

Revision ID: 196ccde938db
Revises: 027
Create Date: 2026-03-08 02:11:20.646019
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "196ccde938db"
down_revision: str | None = "027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "call_artifacts", sa.Column("transcript_text_ciphertext", sa.LargeBinary(), nullable=True)
    )
    op.add_column(
        "call_artifacts", sa.Column("transcript_text_nonce", sa.LargeBinary(), nullable=True)
    )
    op.add_column(
        "call_artifacts", sa.Column("transcript_text_key_version", sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("call_artifacts", "transcript_text_key_version")
    op.drop_column("call_artifacts", "transcript_text_nonce")
    op.drop_column("call_artifacts", "transcript_text_ciphertext")
