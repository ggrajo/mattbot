"""Part 5: call AI sessions, artifacts, memory items, usage events

Revision ID: 011
Revises: 010
Create Date: 2026-02-25

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "011"
down_revision: str | None = "010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ARTIFACT_STATUS = "IN ('pending', 'processing', 'ready', 'failed', 'not_available')"


def upgrade() -> None:
    op.create_table(
        "call_ai_sessions",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "call_id",
            sa.UUID(),
            sa.ForeignKey("calls.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column(
            "owner_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider_session_id", sa.Text(), nullable=True),
        sa.Column("agent_id", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("last_error_redacted", sa.Text(), nullable=True),
        sa.Column("prompt_pack_version", sa.String(20), nullable=True),
        sa.Column("settings_snapshot_id", sa.UUID(), nullable=True),
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
        sa.CheckConstraint(
            "status IN ('pending', 'connected', 'active', 'completed', 'failed', 'timeout')",
            name="ck_call_ai_sessions_status",
        ),
    )
    op.create_index("call_ai_sessions_call_id_idx", "call_ai_sessions", ["call_id"])
    op.create_index(
        "call_ai_sessions_user_status_idx",
        "call_ai_sessions",
        ["owner_user_id", "status"],
    )

    op.create_table(
        "call_artifacts",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "call_id",
            sa.UUID(),
            sa.ForeignKey("calls.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column(
            "owner_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("summary_text_ciphertext", sa.LargeBinary(), nullable=True),
        sa.Column("summary_text_nonce", sa.LargeBinary(), nullable=True),
        sa.Column("summary_text_key_version", sa.Integer(), nullable=True),
        sa.Column("summary_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("structured_extraction", sa.JSON(), nullable=True),
        sa.Column("labels_json", sa.JSON(), nullable=True),
        sa.Column("labels_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column(
            "transcript_provider", sa.String(20), nullable=False, server_default="elevenlabs"
        ),
        sa.Column("transcript_provider_ref", sa.Text(), nullable=True),
        sa.Column("transcript_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("transcript_last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("idempotency_key", sa.String(64), unique=True, nullable=True),
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
        sa.CheckConstraint(
            f"summary_status {_ARTIFACT_STATUS}",
            name="ck_call_artifacts_summary_status",
        ),
        sa.CheckConstraint(
            f"labels_status {_ARTIFACT_STATUS}",
            name="ck_call_artifacts_labels_status",
        ),
        sa.CheckConstraint(
            f"transcript_status {_ARTIFACT_STATUS}",
            name="ck_call_artifacts_transcript_status",
        ),
    )
    op.create_index("call_artifacts_call_id_idx", "call_artifacts", ["call_id"])
    op.create_index("call_artifacts_owner_idx", "call_artifacts", ["owner_user_id"])

    op.create_table(
        "call_memory_items",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "owner_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_call_id",
            sa.UUID(),
            sa.ForeignKey("calls.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("memory_type", sa.String(40), nullable=False),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("value_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("value_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("value_key_version", sa.Integer(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column(
            "user_confirmed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "memory_type IN ('caller_display_name', 'relationship_tag', "
            "'callback_window_preference', 'communication_preference', "
            "'repeated_reason_pattern')",
            name="ck_call_memory_items_type",
        ),
    )
    op.create_index(
        "call_memory_items_user_active_idx",
        "call_memory_items",
        ["owner_user_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "call_usage_events",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "call_id",
            sa.UUID(),
            sa.ForeignKey("calls.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "owner_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("idempotency_key", sa.String(128), unique=True, nullable=False),
        sa.Column("minutes_billed", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(20), nullable=False, server_default="call"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("call_usage_events_call_idx", "call_usage_events", ["call_id"])
    op.create_index(
        "call_usage_events_idemp_idx",
        "call_usage_events",
        ["idempotency_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("call_usage_events")
    op.drop_table("call_memory_items")
    op.drop_table("call_artifacts")
    op.drop_table("call_ai_sessions")
