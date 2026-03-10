"""028 – contact_profiles table and category defaults column.

Revision ID: 028
Revises: 196ccde938db
Create Date: 2026-03-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "028"
down_revision: str | None = "196ccde938db"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contact_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phone_ciphertext", sa.LargeBinary, nullable=False),
        sa.Column("phone_nonce", sa.LargeBinary, nullable=False),
        sa.Column("phone_key_version", sa.Integer, nullable=False),
        sa.Column("phone_hash", sa.String(64), nullable=False),
        sa.Column("phone_last4", sa.String(4), nullable=False),
        sa.Column("display_name", sa.Text, nullable=True),
        sa.Column("company", sa.String(200), nullable=True),
        sa.Column("relationship", sa.String(100), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "category",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'other'"),
        ),
        sa.Column(
            "is_vip",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_blocked",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("block_reason", sa.Text, nullable=True),
        sa.Column("ai_temperament_preset", sa.String(40), nullable=True),
        sa.Column("ai_greeting_template", sa.String(40), nullable=True),
        sa.Column("ai_greeting_instructions_ciphertext", sa.LargeBinary, nullable=True),
        sa.Column("ai_greeting_instructions_nonce", sa.LargeBinary, nullable=True),
        sa.Column("ai_greeting_instructions_key_version", sa.Integer, nullable=True),
        sa.Column("ai_swearing_rule", sa.String(20), nullable=True),
        sa.Column("ai_max_call_length_seconds", sa.Integer, nullable=True),
        sa.Column("ai_custom_instructions_ciphertext", sa.LargeBinary, nullable=True),
        sa.Column("ai_custom_instructions_nonce", sa.LargeBinary, nullable=True),
        sa.Column("ai_custom_instructions_key_version", sa.Integer, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "owner_user_id",
            "phone_hash",
            name="uq_contact_profiles_user_phone",
        ),
        sa.CheckConstraint(
            "category IN ('business', 'friends', 'family', 'other')",
            name="ck_contact_profiles_category",
        ),
        sa.CheckConstraint(
            "ai_temperament_preset IS NULL OR ai_temperament_preset IN "
            "('professional_polite', 'casual_friendly', 'short_and_direct', "
            "'warm_and_supportive', 'formal', 'custom')",
            name="ck_contact_profiles_temperament",
        ),
        sa.CheckConstraint(
            "ai_swearing_rule IS NULL OR ai_swearing_rule IN "
            "('no_swearing', 'mirror_caller', 'allow')",
            name="ck_contact_profiles_swearing",
        ),
        sa.CheckConstraint(
            "ai_greeting_template IS NULL OR ai_greeting_template IN "
            "('standard', 'brief', 'formal', 'custom')",
            name="ck_contact_profiles_greeting_template",
        ),
    )

    op.create_index(
        "contact_profiles_user_idx",
        "contact_profiles",
        ["owner_user_id"],
    )

    op.create_index(
        "contact_profiles_user_category_idx",
        "contact_profiles",
        ["owner_user_id", "category"],
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "contact_category_defaults",
            sa.JSON,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )

    op.execute("""
        INSERT INTO contact_profiles (
            id, owner_user_id,
            phone_ciphertext, phone_nonce, phone_key_version,
            phone_hash, phone_last4,
            display_name, company, relationship, email, notes,
            category, is_vip, is_blocked,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(), v.owner_user_id,
            v.phone_ciphertext, v.phone_nonce, v.phone_key_version,
            v.phone_hash, v.phone_last4,
            v.display_name, v.company, v.relationship, v.email, v.notes,
            'other', true, false,
            v.created_at, v.updated_at
        FROM vip_entries v
        ON CONFLICT (owner_user_id, phone_hash) DO UPDATE
            SET is_vip = true
    """)

    op.execute("""
        INSERT INTO contact_profiles (
            id, owner_user_id,
            phone_ciphertext, phone_nonce, phone_key_version,
            phone_hash, phone_last4,
            display_name, company, relationship, email, notes,
            category, is_vip, is_blocked, block_reason,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(), b.owner_user_id,
            b.phone_ciphertext, b.phone_nonce, b.phone_key_version,
            b.phone_hash, b.phone_last4,
            b.display_name, b.company, b.relationship, b.email, b.notes,
            'other', false, true, b.reason,
            b.created_at, b.updated_at
        FROM block_entries b
        ON CONFLICT (owner_user_id, phone_hash) DO UPDATE
            SET is_blocked = true,
                block_reason = EXCLUDED.block_reason
    """)


def downgrade() -> None:
    op.drop_column("user_settings", "contact_category_defaults")
    op.drop_index("contact_profiles_user_category_idx", table_name="contact_profiles")
    op.drop_index("contact_profiles_user_idx", table_name="contact_profiles")
    op.drop_table("contact_profiles")
