"""Add caller_phone_hash to call_memory_items for per-caller memory lookup

Revision ID: 026
Revises: 025
Create Date: 2026-03-04
"""

import sqlalchemy as sa

from alembic import op

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "call_memory_items",
        sa.Column("caller_phone_hash", sa.String(64), nullable=True),
    )

    op.execute("""
        UPDATE call_memory_items m
        SET caller_phone_hash = c.caller_phone_hash
        FROM calls c
        WHERE m.source_call_id = c.id
          AND m.caller_phone_hash IS NULL
        """)

    op.create_index(
        "call_memory_items_user_caller_active_idx",
        "call_memory_items",
        ["owner_user_id", "caller_phone_hash"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("call_memory_items_user_caller_active_idx", table_name="call_memory_items")
    op.drop_column("call_memory_items", "caller_phone_hash")
