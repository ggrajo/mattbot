"""011 call ai sessions and artifacts"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "call_ai_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("call_id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=True),
        sa.Column("elevenlabs_conversation_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"], ondelete="CASCADE"),
        sa.CheckConstraint("status IN ('active', 'ended', 'failed')", name="ck_call_ai_sessions_status"),
    )
    op.create_index("ix_call_ai_sessions_call_id", "call_ai_sessions", ["call_id"])
    op.create_index("ix_call_ai_sessions_call_id_status", "call_ai_sessions", ["call_id", "status"])

    op.create_table(
        "call_artifacts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("call_id", sa.Uuid(), nullable=False),
        sa.Column("artifact_type", sa.String(30), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "artifact_type IN ('transcript', 'summary', 'action_items', 'recording_url')",
            name="ck_call_artifacts_type",
        ),
    )
    op.create_index("ix_call_artifacts_call_id", "call_artifacts", ["call_id"])

    op.create_table(
        "call_memory_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("call_id", sa.Uuid(), nullable=True),
        sa.Column("memory_type", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "memory_type IN ('fact', 'preference', 'action', 'note')",
            name="ck_call_memory_items_type",
        ),
        sa.CheckConstraint(
            "source IN ('ai', 'user', 'system')",
            name="ck_call_memory_items_source",
        ),
    )
    op.create_index("ix_call_memory_items_user_id", "call_memory_items", ["user_id"])

    op.create_table(
        "call_usage_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("call_id", sa.Uuid(), nullable=True),
        sa.Column("minutes", sa.Numeric(10, 2), nullable=False),
        sa.Column("event_type", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "event_type IN ('call', 'adjustment')",
            name="ck_call_usage_events_type",
        ),
    )
    op.create_index("ix_call_usage_events_user_id", "call_usage_events", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_call_usage_events_user_id", table_name="call_usage_events")
    op.drop_table("call_usage_events")
    op.drop_index("ix_call_memory_items_user_id", table_name="call_memory_items")
    op.drop_table("call_memory_items")
    op.drop_index("ix_call_artifacts_call_id", table_name="call_artifacts")
    op.drop_table("call_artifacts")
    op.drop_index("ix_call_ai_sessions_call_id_status", table_name="call_ai_sessions")
    op.drop_index("ix_call_ai_sessions_call_id", table_name="call_ai_sessions")
    op.drop_table("call_ai_sessions")
