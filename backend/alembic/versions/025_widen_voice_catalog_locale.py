"""025 widen voice_catalog locale column to VARCHAR(50)"""

from alembic import op
import sqlalchemy as sa

revision = "025"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "voice_catalog",
        "locale",
        existing_type=sa.String(10),
        type_=sa.String(50),
        existing_nullable=False,
        existing_server_default="en",
    )


def downgrade() -> None:
    op.alter_column(
        "voice_catalog",
        "locale",
        existing_type=sa.String(50),
        type_=sa.String(10),
        existing_nullable=False,
        existing_server_default="en",
    )
