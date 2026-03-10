"""Add user profile fields: nickname, company_name, role_title, ai_greeting_instructions

Revision ID: 008
Revises: 007
Create Date: 2026-02-24
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "008"
down_revision: str | None = "007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("nickname", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("company_name", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("role_title", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("ai_greeting_instructions", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "ai_greeting_instructions")
    op.drop_column("users", "role_title")
    op.drop_column("users", "company_name")
    op.drop_column("users", "nickname")
