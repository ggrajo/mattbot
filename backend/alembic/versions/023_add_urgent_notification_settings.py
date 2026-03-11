"""Add urgent notification settings columns

Revision ID: 023
Revises: 022
Create Date: 2026-03-03
"""

import sqlalchemy as sa

from alembic import op

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column(
            "urgent_notify_sms", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )
    op.add_column(
        "user_settings",
        sa.Column(
            "urgent_notify_email", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )
    op.add_column(
        "user_settings",
        sa.Column(
            "urgent_notify_call", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )
    op.add_column(
        "user_settings",
        sa.Column("urgent_notify_phone_ciphertext", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("urgent_notify_phone_nonce", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("urgent_notify_phone_key_version", sa.Integer(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("urgent_notify_phone_last4", sa.String(4), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("urgent_notify_email_address", sa.String(254), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "urgent_notify_email_address")
    op.drop_column("user_settings", "urgent_notify_phone_last4")
    op.drop_column("user_settings", "urgent_notify_phone_key_version")
    op.drop_column("user_settings", "urgent_notify_phone_nonce")
    op.drop_column("user_settings", "urgent_notify_phone_ciphertext")
    op.drop_column("user_settings", "urgent_notify_call")
    op.drop_column("user_settings", "urgent_notify_email")
    op.drop_column("user_settings", "urgent_notify_sms")
