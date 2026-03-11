"""Add greeting_instructions to agent_configs

Revision ID: 021
Revises: 020
Create Date: 2026-03-03
"""

import sqlalchemy as sa

from alembic import op

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "agent_configs",
        sa.Column("greeting_instructions", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("agent_configs", "greeting_instructions")
