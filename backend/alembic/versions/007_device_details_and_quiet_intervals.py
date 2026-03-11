"""007 device details and quiet intervals"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("devices", sa.Column("biometric_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("devices", sa.Column("biometric_type", sa.String(30), nullable=True))

    op.add_column("user_settings", sa.Column("quiet_hours_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("user_settings", sa.Column("quiet_hours_start", sa.String(5), nullable=True))
    op.add_column("user_settings", sa.Column("quiet_hours_end", sa.String(5), nullable=True))

def downgrade() -> None:
    op.drop_column("user_settings", "quiet_hours_end")
    op.drop_column("user_settings", "quiet_hours_start")
    op.drop_column("user_settings", "quiet_hours_enabled")
    op.drop_column("devices", "biometric_type")
    op.drop_column("devices", "biometric_enabled")
