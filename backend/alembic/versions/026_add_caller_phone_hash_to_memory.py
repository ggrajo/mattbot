"""026 add caller phone hash to memory

Revision ID: 026
Revises: 019
Create Date: 2026-03-11
"""

from alembic import op
import sqlalchemy as sa

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "call_memory_items",
        sa.Column("caller_phone_hash", sa.String(64), nullable=True, index=True),
    )
    op.add_column(
        "call_memory_items",
        sa.Column("caller_name", sa.String(100), nullable=True),
    )
    op.add_column(
        "call_memory_items",
        sa.Column("importance", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "call_memory_items",
        sa.Column("expires_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("call_memory_items", "expires_at")
    op.drop_column("call_memory_items", "importance")
    op.drop_column("call_memory_items", "caller_name")
    op.drop_column("call_memory_items", "caller_phone_hash")
