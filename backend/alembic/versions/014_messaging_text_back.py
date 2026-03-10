"""Messaging / text-back tables: outbound_messages, text_send_attempts, text_back_templates

Revision ID: 014
Revises: 013
Create Date: 2026-02-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "014"
down_revision: str | None = "013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "text_back_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("tone_tag", sa.Text(), nullable=False),
        sa.Column(
            "enabled_by_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "is_builtin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "category IN ('busy', 'callback_request', 'request_details', "
            "'reschedule', 'wrong_number', 'sales_decline')",
            name="ck_text_back_templates_category",
        ),
        sa.CheckConstraint(
            "tone_tag IN ('neutral', 'warm', 'formal', 'concise')",
            name="ck_text_back_templates_tone_tag",
        ),
    )
    op.create_index(
        "text_back_templates_category_idx",
        "text_back_templates",
        ["category"],
    )

    op.create_table(
        "outbound_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "call_id",
            UUID(as_uuid=True),
            sa.ForeignKey("calls.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action_type", sa.Text(), nullable=False, server_default="text_back"),
        sa.Column("status", sa.Text(), nullable=False, server_default="drafted"),
        sa.Column("from_number_e164", sa.Text(), nullable=True),
        sa.Column("to_number_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("to_number_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("to_number_key_version", sa.Integer(), nullable=False),
        sa.Column("to_number_hash", sa.String(64), nullable=False),
        sa.Column("to_number_last4", sa.String(4), nullable=False),
        sa.Column("draft_body_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("draft_body_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("draft_body_key_version", sa.Integer(), nullable=False),
        sa.Column("final_body_ciphertext", sa.LargeBinary(), nullable=True),
        sa.Column("final_body_nonce", sa.LargeBinary(), nullable=True),
        sa.Column("final_body_key_version", sa.Integer(), nullable=True),
        sa.Column("template_id_used", UUID(as_uuid=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by_device_id", UUID(as_uuid=True), nullable=True),
        sa.Column("last_error_code", sa.String(60), nullable=True),
        sa.Column("last_error_message_short", sa.Text(), nullable=True),
        sa.Column("retention_expires_at", sa.DateTime(timezone=True), nullable=True),
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
            "status IN ('drafted', 'awaiting_approval', 'approved', 'sending', "
            "'sent', 'delivered', 'failed', 'cancelled')",
            name="ck_outbound_messages_status",
        ),
    )
    op.create_index(
        "outbound_messages_user_call_idx",
        "outbound_messages",
        ["owner_user_id", "call_id"],
    )
    op.create_index(
        "outbound_messages_user_created_idx",
        "outbound_messages",
        ["owner_user_id", sa.text("created_at DESC")],
    )

    op.create_table(
        "text_send_attempts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "message_id",
            UUID(as_uuid=True),
            sa.ForeignKey("outbound_messages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False, server_default="twilio"),
        sa.Column("provider_message_sid", sa.Text(), nullable=True),
        sa.Column("provider_status", sa.Text(), nullable=True),
        sa.Column("provider_error_code", sa.Text(), nullable=True),
        sa.Column("provider_error_message_short", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "text_send_attempts_message_idx",
        "text_send_attempts",
        ["message_id"],
    )
    op.create_index(
        "text_send_attempts_provider_sid_idx",
        "text_send_attempts",
        ["provider_message_sid"],
        postgresql_where=sa.text("provider_message_sid IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_table("text_send_attempts")
    op.drop_table("outbound_messages")
    op.drop_table("text_back_templates")
