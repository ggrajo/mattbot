"""Agent model, voice catalog, prompt suggestions, prompt layering

Revision ID: 012
Revises: 011
Create Date: 2026-02-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "012"
down_revision: str | None = "011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- voice_catalog --
    op.create_table(
        "voice_catalog",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("provider_voice_id", sa.String(100), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("locale", sa.String(10), nullable=False, server_default="en"),
        sa.Column("gender_tag", sa.String(20), nullable=True),
        sa.Column("preview_url", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "voice_catalog_active_idx",
        "voice_catalog",
        ["is_active", "sort_order"],
    )

    # -- prompt_suggestions --
    op.create_table(
        "prompt_suggestions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "prompt_suggestions_active_idx",
        "prompt_suggestions",
        ["is_active", "sort_order"],
    )

    # -- agents --
    op.create_table(
        "agents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("display_name", sa.Text(), nullable=False, server_default="Call Screener"),
        sa.Column("function_type", sa.String(40), nullable=False, server_default="call_screener"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
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
        sa.CheckConstraint("status IN ('active', 'archived')", name="ck_agents_status"),
    )
    op.create_index(
        "uq_agents_user_default",
        "agents",
        ["owner_user_id"],
        unique=True,
        postgresql_where=sa.text("is_default = true"),
    )
    op.create_index("agents_owner_user_id_idx", "agents", ["owner_user_id"])

    # -- agent_configs --
    op.create_table(
        "agent_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "agent_id",
            UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column(
            "voice_id",
            UUID(as_uuid=True),
            sa.ForeignKey("voice_catalog.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_instructions", sa.Text(), nullable=True),
        sa.Column("system_prompt_key", sa.String(40), nullable=False, server_default="default_v1"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
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
    )

    # -- add agent_id / voice_id to calls --
    op.add_column(
        "calls",
        sa.Column("agent_id", UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "calls",
        sa.Column("voice_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_calls_agent_id", "calls", "agents", ["agent_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key(
        "fk_calls_voice_id", "calls", "voice_catalog", ["voice_id"], ["id"], ondelete="SET NULL"
    )

    # -- re-type agent_id in call_ai_sessions --
    op.drop_column("call_ai_sessions", "agent_id")
    op.add_column(
        "call_ai_sessions",
        sa.Column("agent_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_call_ai_sessions_agent_id",
        "call_ai_sessions",
        "agents",
        ["agent_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # -- seed voice_catalog --
    voices_table = sa.table(
        "voice_catalog",
        sa.column("id", UUID(as_uuid=True)),
        sa.column("provider_voice_id", sa.String),
        sa.column("display_name", sa.String),
        sa.column("locale", sa.String),
        sa.column("gender_tag", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        voices_table,
        [
            {
                "id": "00000000-0000-4000-a000-000000000001",
                "provider_voice_id": "21m00Tcm4TlvDq8ikWAM",
                "display_name": "Rachel",
                "locale": "en",
                "gender_tag": "female",
                "sort_order": 0,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-a000-000000000002",
                "provider_voice_id": "pNInz6obpgDQGcFmaJgB",
                "display_name": "Adam",
                "locale": "en",
                "gender_tag": "male",
                "sort_order": 1,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-a000-000000000003",
                "provider_voice_id": "EXAVITQu4vr4xnSDxMaL",
                "display_name": "Bella",
                "locale": "en",
                "gender_tag": "female",
                "sort_order": 2,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-a000-000000000004",
                "provider_voice_id": "ErXwobaYiN019PkySvjV",
                "display_name": "Antoni",
                "locale": "en",
                "gender_tag": "male",
                "sort_order": 3,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-a000-000000000005",
                "provider_voice_id": "MF3mGyEYCl7XYWbV9V6O",
                "display_name": "Elli",
                "locale": "en",
                "gender_tag": "female",
                "sort_order": 4,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-a000-000000000006",
                "provider_voice_id": "TxGEqnHWrfWFTfGW9XjX",
                "display_name": "Josh",
                "locale": "en",
                "gender_tag": "male",
                "sort_order": 5,
                "is_active": True,
            },
        ],
    )

    # -- seed prompt_suggestions --
    suggestions_table = sa.table(
        "prompt_suggestions",
        sa.column("id", UUID(as_uuid=True)),
        sa.column("title", sa.String),
        sa.column("text", sa.Text),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        suggestions_table,
        [
            {
                "id": "00000000-0000-4000-b000-000000000001",
                "title": "Professional tone",
                "text": "Always maintain a professional and polite tone when speaking with callers.",
                "sort_order": 0,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-b000-000000000002",
                "title": "Take messages",
                "text": "If the caller wants to leave a message, collect their name, number, and a brief message.",
                "sort_order": 1,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-b000-000000000003",
                "title": "Screen for urgency",
                "text": "Ask the caller how urgent their matter is and whether it can wait until the next business day.",
                "sort_order": 2,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-b000-000000000004",
                "title": "No commitments",
                "text": "Do not make promises or commitments on my behalf. Let the caller know I will get back to them.",
                "sort_order": 3,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-b000-000000000005",
                "title": "Short and concise",
                "text": "Keep responses short and to the point. Do not engage in lengthy conversations.",
                "sort_order": 4,
                "is_active": True,
            },
            {
                "id": "00000000-0000-4000-b000-000000000006",
                "title": "Business context",
                "text": "I run a small business. Callers may be clients, vendors, or potential customers.",
                "sort_order": 5,
                "is_active": True,
            },
        ],
    )


def downgrade() -> None:
    op.drop_constraint("fk_call_ai_sessions_agent_id", "call_ai_sessions", type_="foreignkey")
    op.drop_column("call_ai_sessions", "agent_id")
    op.add_column(
        "call_ai_sessions",
        sa.Column("agent_id", sa.Text(), nullable=True),
    )

    op.drop_constraint("fk_calls_voice_id", "calls", type_="foreignkey")
    op.drop_constraint("fk_calls_agent_id", "calls", type_="foreignkey")
    op.drop_column("calls", "voice_id")
    op.drop_column("calls", "agent_id")

    op.drop_table("agent_configs")
    op.drop_table("agents")
    op.drop_index("prompt_suggestions_active_idx", table_name="prompt_suggestions")
    op.drop_table("prompt_suggestions")
    op.drop_index("voice_catalog_active_idx", table_name="voice_catalog")
    op.drop_table("voice_catalog")
