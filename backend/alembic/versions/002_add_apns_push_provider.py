"""Add apns to push token provider constraint

Revision ID: 002
Revises: 001
Create Date: 2026-02-21
"""

from collections.abc import Sequence

from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_push_tokens_provider", "push_tokens", type_="check")
    op.create_check_constraint(
        "ck_push_tokens_provider",
        "push_tokens",
        "provider IN ('fcm', 'apns')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_push_tokens_provider", "push_tokens", type_="check")
    op.create_check_constraint(
        "ck_push_tokens_provider",
        "push_tokens",
        "provider IN ('fcm')",
    )
