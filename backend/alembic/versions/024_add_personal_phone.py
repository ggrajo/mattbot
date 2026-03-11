"""Add personal phone number to user_settings

Revision ID: 024
Revises: 023
Create Date: 2026-03-03
"""

import sqlalchemy as sa

from alembic import op

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("personal_phone_ciphertext", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("personal_phone_nonce", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("personal_phone_key_version", sa.Integer(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("personal_phone_last4", sa.String(4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "personal_phone_last4")
    op.drop_column("user_settings", "personal_phone_key_version")
    op.drop_column("user_settings", "personal_phone_nonce")
    op.drop_column("user_settings", "personal_phone_ciphertext")
