"""Hardening fixes: per-user ElevenLabs agent, handoff target phone, expanded enums.

Revision ID: 017
Revises: 016
Create Date: 2026-02-27

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "017"
down_revision: str | None = "016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "agents",
        sa.Column("elevenlabs_agent_id", sa.String(50), nullable=True),
    )

    op.add_column(
        "user_settings",
        sa.Column("handoff_target_phone_ciphertext", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("handoff_target_phone_nonce", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("handoff_target_phone_key_version", sa.Integer(), nullable=True),
    )
    op.add_column(
        "user_settings",
        sa.Column("handoff_target_phone_last4", sa.String(4), nullable=True),
    )

    op.drop_constraint("ck_user_settings_handoff_trigger", "user_settings", type_="check")
    op.create_check_constraint(
        "ck_user_settings_handoff_trigger",
        "user_settings",
        "handoff_trigger IN ('vip_only', 'urgent_only', 'vip_and_urgent', 'always', 'never')",
    )

    op.drop_constraint("ck_user_settings_temperament", "user_settings", type_="check")
    op.create_check_constraint(
        "ck_user_settings_temperament",
        "user_settings",
        "temperament_preset IN ('professional_polite', 'casual_friendly', 'short_and_direct', 'warm_and_supportive', 'formal', 'custom')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_user_settings_temperament", "user_settings", type_="check")
    op.create_check_constraint(
        "ck_user_settings_temperament",
        "user_settings",
        "temperament_preset IN ('professional_polite', 'casual_friendly', 'formal', 'custom')",
    )

    op.drop_constraint("ck_user_settings_handoff_trigger", "user_settings", type_="check")
    op.create_check_constraint(
        "ck_user_settings_handoff_trigger",
        "user_settings",
        "handoff_trigger IN ('vip_only', 'always', 'never')",
    )

    op.drop_column("user_settings", "handoff_target_phone_last4")
    op.drop_column("user_settings", "handoff_target_phone_key_version")
    op.drop_column("user_settings", "handoff_target_phone_nonce")
    op.drop_column("user_settings", "handoff_target_phone_ciphertext")

    op.drop_column("agents", "elevenlabs_agent_id")
