"""028 onboarding state

Creates the onboarding_states table for tracking user onboarding progress.

Revision ID: 028
Revises: 027
Create Date: 2026-03-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "028"
down_revision: Union[str, None] = "027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "onboarding_states",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                   server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("current_step", sa.String(60), nullable=False, server_default="welcome"),
        sa.Column("completed_steps", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_onboarding_states_user_id"),
    )
    op.create_index("ix_onboarding_states_user_id", "onboarding_states", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_onboarding_states_user_id", table_name="onboarding_states")
    op.drop_table("onboarding_states")
