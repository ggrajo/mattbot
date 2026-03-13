"""030 – Spam entries table and user_settings spam columns.

Revision ID: 030
Revises: 029
Create Date: 2026-03-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "030"
down_revision: str | None = "029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "spam_entries",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phone_hash", sa.String(64), nullable=False),
        sa.Column("phone_last4", sa.String(4), nullable=False),
        sa.Column("spam_score", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("spam_call_count", sa.Integer, nullable=False, server_default=sa.text("1")),
        sa.Column("first_flagged_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("last_flagged_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("auto_blocked", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("source", sa.String(10), nullable=False, server_default="auto"),
        sa.UniqueConstraint("owner_user_id", "phone_hash", name="uq_spam_entries_user_phone"),
    )
    op.create_index("spam_entries_user_idx", "spam_entries", ["owner_user_id"])

    op.add_column(
        "user_settings",
        sa.Column("auto_block_spam", sa.Boolean, nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "user_settings",
        sa.Column("spam_block_threshold", sa.Integer, nullable=False, server_default=sa.text("2")),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "spam_block_threshold")
    op.drop_column("user_settings", "auto_block_spam")
    op.drop_index("spam_entries_user_idx", table_name="spam_entries")
    op.drop_table("spam_entries")
