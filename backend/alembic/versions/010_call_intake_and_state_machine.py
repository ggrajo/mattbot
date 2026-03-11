"""010 call intake and state machine"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "010"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "calls",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("twilio_call_sid", sa.String(64), nullable=True),
        sa.Column("from_number", sa.String(20), nullable=False),
        sa.Column("to_number", sa.String(20), nullable=False),
        sa.Column("direction", sa.String(10), nullable=False, server_default="inbound"),
        sa.Column("status", sa.String(30), nullable=False, server_default="ringing"),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("ended_reason", sa.String(50), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("answered_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("twilio_call_sid"),
    )
    op.create_index("ix_calls_user_id", "calls", ["user_id"])
    op.create_index("ix_calls_user_status", "calls", ["user_id", "status"])

    op.create_table(
        "call_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("call_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_call_events_call_id", "call_events", ["call_id"])

    op.create_table(
        "provider_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False, server_default="twilio"),
        sa.Column("provider_event_id", sa.String(128), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload_redacted", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_event_id"),
    )


def downgrade() -> None:
    op.drop_table("provider_events")
    op.drop_table("call_events")
    op.drop_index("ix_calls_user_status", table_name="calls")
    op.drop_index("ix_calls_user_id", table_name="calls")
    op.drop_table("calls")
