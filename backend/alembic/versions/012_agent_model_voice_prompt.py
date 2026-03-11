"""012 agent model voice catalog and prompt suggestions"""

from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False, server_default="MattBot"),
        sa.Column("system_prompt", sa.Text(), nullable=True),
        sa.Column("greeting_message", sa.String(500), nullable=True),
        sa.Column("voice_id", sa.String(100), nullable=True),
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("personality", sa.String(30), nullable=False, server_default="professional"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_agents_user_id", "agents", ["user_id"])

    # Now add FK from call_ai_sessions.agent_id -> agents.id
    op.create_foreign_key(
        "fk_call_ai_sessions_agent_id",
        "call_ai_sessions",
        "agents",
        ["agent_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "agent_configs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("config_key", sa.String(100), nullable=False),
        sa.Column("config_value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("agent_id", "config_key", name="uq_agent_configs_agent_key"),
    )
    op.create_index("ix_agent_configs_agent_id", "agent_configs", ["agent_id"])

    op.create_table(
        "voice_catalog",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("voice_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(30), nullable=False, server_default="elevenlabs"),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column("accent", sa.String(50), nullable=True),
        sa.Column("preview_url", sa.String(500), nullable=True),
        sa.Column("locale", sa.String(10), nullable=False, server_default="en"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("voice_id"),
    )

    op.create_table(
        "prompt_suggestions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prompt_suggestions_category", "prompt_suggestions", ["category"])


def downgrade() -> None:
    op.drop_index("ix_prompt_suggestions_category", table_name="prompt_suggestions")
    op.drop_table("prompt_suggestions")
    op.drop_table("voice_catalog")
    op.drop_index("ix_agent_configs_agent_id", table_name="agent_configs")
    op.drop_table("agent_configs")
    op.drop_constraint("fk_call_ai_sessions_agent_id", "call_ai_sessions", type_="foreignkey")
    op.drop_index("ix_agents_user_id", table_name="agents")
    op.drop_table("agents")
