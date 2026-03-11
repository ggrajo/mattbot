"""Replace push_tokens unique constraint with partial unique index.

Revision ID: 018
Revises: 017
Create Date: 2026-02-28
"""

from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.execute("DELETE FROM push_tokens WHERE revoked_at IS NOT NULL")

    op.drop_constraint("uq_push_tokens_provider_token", "push_tokens", type_="unique")

    op.execute(
        "CREATE UNIQUE INDEX uq_push_tokens_active_token "
        "ON push_tokens (provider, token) WHERE revoked_at IS NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_push_tokens_active_token")
    op.create_unique_constraint(
        "uq_push_tokens_provider_token", "push_tokens", ["provider", "token"]
    )
