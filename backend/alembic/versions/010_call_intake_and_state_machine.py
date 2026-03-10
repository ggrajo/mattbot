"""Part 4: inbound call intake and state machine

Revision ID: 010
Revises: 009
Create Date: 2026-02-25

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "010"
down_revision: str | None = "009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "calls",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "owner_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_type", sa.String(30), nullable=False),
        sa.Column("direction", sa.String(10), nullable=False, server_default="inbound"),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("caller_phone_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("caller_phone_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("caller_phone_key_version", sa.Integer(), nullable=False),
        sa.Column("caller_phone_hash", sa.String(64), nullable=False),
        sa.Column("caller_phone_last4", sa.String(4), nullable=False),
        sa.Column("caller_display", sa.Text(), nullable=True),
        sa.Column("provider", sa.String(20), nullable=False, server_default="twilio"),
        sa.Column("provider_call_sid", sa.Text(), nullable=False),
        sa.Column("provider_parent_call_sid", sa.Text(), nullable=True),
        sa.Column(
            "forwarding_detected",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("forwarding_verification_hint", sa.Text(), nullable=True),
        sa.Column(
            "missing_summary",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "missing_transcript",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "missing_labels",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("from_masked", sa.Text(), nullable=False),
        sa.Column("to_masked", sa.Text(), nullable=False),
        sa.Column("retention_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
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
            "source_type IN ('dedicated_number', 'forwarded')",
            name="ck_calls_source_type",
        ),
        sa.CheckConstraint(
            "direction IN ('inbound')",
            name="ck_calls_direction",
        ),
        sa.CheckConstraint(
            "status IN ('created', 'inbound_received', 'twiml_responded', "
            "'in_progress', 'completed', 'partial', 'failed', 'canceled')",
            name="ck_calls_status",
        ),
        sa.CheckConstraint(
            "provider IN ('twilio')",
            name="ck_calls_provider",
        ),
        sa.UniqueConstraint("provider", "provider_call_sid", name="uq_calls_provider_sid"),
    )
    op.create_index(
        "calls_user_started_idx",
        "calls",
        ["owner_user_id", sa.text("started_at DESC")],
    )
    op.create_index(
        "calls_user_status_idx",
        "calls",
        ["owner_user_id", "status", sa.text("started_at DESC")],
    )
    op.create_index("calls_provider_sid_idx", "calls", ["provider_call_sid"])
    op.create_index(
        "calls_user_caller_hash_idx",
        "calls",
        ["owner_user_id", "caller_phone_hash"],
    )

    op.create_table(
        "call_events",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "call_id",
            sa.UUID(),
            sa.ForeignKey("calls.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(60), nullable=False),
        sa.Column("provider_status", sa.String(30), nullable=True),
        sa.Column(
            "event_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("details_redacted", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "call_id", "event_type", "provider_status", name="uq_call_events_dedupe"
        ),
    )
    op.create_index(
        "call_events_call_idx",
        "call_events",
        ["call_id", sa.text("event_at ASC")],
    )
    op.create_index(
        "call_events_user_idx",
        "call_events",
        ["owner_user_id", sa.text("event_at DESC")],
    )

    op.create_table(
        "provider_events",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("provider_event_id", sa.Text(), nullable=True),
        sa.Column("provider_call_sid", sa.Text(), nullable=True),
        sa.Column("event_type", sa.String(60), nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "process_status",
            sa.String(20),
            nullable=False,
            server_default="received",
        ),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column(
            "call_id",
            sa.UUID(),
            sa.ForeignKey("calls.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "owner_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("payload_redacted", sa.JSON(), nullable=True),
        sa.Column("signature_valid", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "provider IN ('twilio', 'elevenlabs')",
            name="ck_provider_events_provider",
        ),
        sa.CheckConstraint(
            "process_status IN ('received', 'processed', 'failed')",
            name="ck_provider_events_status",
        ),
    )
    op.create_index(
        "provider_events_status_idx",
        "provider_events",
        ["process_status", sa.text("received_at ASC")],
    )
    op.create_index(
        "provider_events_call_sid_idx",
        "provider_events",
        ["provider_call_sid"],
    )


def downgrade() -> None:
    op.drop_table("provider_events")
    op.drop_table("call_events")
    op.drop_table("calls")
