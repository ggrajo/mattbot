"""Initial identity, auth, sessions, devices, MFA schema

Revision ID: 001
Revises: None
Create Date: 2026-02-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # --- users ---
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column(
            "status",
            sa.String(30),
            nullable=False,
            server_default=sa.text("'pending_verification'"),
        ),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("default_timezone", sa.Text(), nullable=False, server_default=sa.text("'UTC'")),
        sa.Column("language_code", sa.String(10), nullable=False, server_default=sa.text("'en'")),
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
            "status IN ('active', 'pending_verification', 'locked', 'deleted')",
            name="ck_users_status",
        ),
        sa.CheckConstraint(
            "(status = 'deleted' AND deleted_at IS NOT NULL) OR "
            "(status != 'deleted' AND deleted_at IS NULL)",
            name="ck_users_deleted_consistency",
        ),
    )
    op.create_index("users_email_idx", "users", ["email"], unique=True)
    op.create_index("users_status_idx", "users", ["status"])

    # --- auth_identities ---
    op.create_table(
        "auth_identities",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(30), nullable=False),
        sa.Column("provider_subject", sa.Text(), nullable=False),
        sa.Column("provider_email", sa.Text(), nullable=True),
        sa.Column("provider_email_verified", sa.Boolean(), nullable=True),
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
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "provider IN ('email_password', 'google', 'apple')",
            name="ck_auth_identities_provider",
        ),
        sa.UniqueConstraint("provider", "provider_subject", name="uq_auth_identities_provider_sub"),
    )
    op.create_index("auth_identities_user_idx", "auth_identities", ["owner_user_id"])
    op.create_index(
        "auth_identities_provider_sub_idx", "auth_identities", ["provider", "provider_subject"]
    )

    # --- mfa_methods ---
    op.create_table(
        "mfa_methods",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("method_type", sa.String(20), nullable=False),
        sa.Column("totp_secret_ciphertext", sa.LargeBinary(), nullable=True),
        sa.Column("totp_secret_nonce", sa.LargeBinary(), nullable=True),
        sa.Column("totp_secret_key_version", sa.Integer(), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("enabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint("method_type IN ('totp', 'email_otp')", name="ck_mfa_methods_type"),
    )
    op.create_index("mfa_methods_user_idx", "mfa_methods", ["owner_user_id"])
    op.create_index(
        "uq_mfa_methods_primary_active",
        "mfa_methods",
        ["owner_user_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true AND disabled_at IS NULL"),
    )

    # --- recovery_codes ---
    op.create_table(
        "recovery_codes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("owner_user_id", "code_hash", name="uq_recovery_codes_user_hash"),
    )
    op.create_index("recovery_codes_user_idx", "recovery_codes", ["owner_user_id"])

    # --- devices ---
    op.create_table(
        "devices",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("platform", sa.String(10), nullable=False),
        sa.Column("device_name", sa.Text(), nullable=True),
        sa.Column("app_version", sa.String(30), nullable=True),
        sa.Column("os_version", sa.String(30), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoke_reason", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint("platform IN ('ios', 'android', 'web')", name="ck_devices_platform"),
    )
    op.create_index("devices_user_idx", "devices", ["owner_user_id"])
    op.create_index(
        "devices_user_active_idx",
        "devices",
        ["owner_user_id"],
        postgresql_where=sa.text("revoked_at IS NULL"),
    )

    # --- sessions ---
    op.create_table(
        "sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("access_token_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("access_token_hash", sa.String(64), nullable=False),
        sa.Column("access_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("refresh_token_hash", sa.String(64), nullable=False),
        sa.Column("refresh_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_refresh_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoke_reason", sa.Text(), nullable=True),
        sa.Column("ip_created", postgresql.INET(), nullable=True),
        sa.Column("ip_last", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
    )
    op.create_index("sessions_access_hash_idx", "sessions", ["access_token_hash"], unique=True)
    op.create_index("sessions_refresh_hash_idx", "sessions", ["refresh_token_hash"], unique=True)
    op.create_index("sessions_user_idx", "sessions", ["owner_user_id"])
    op.create_index("sessions_device_idx", "sessions", ["device_id"])
    op.create_index(
        "sessions_active_by_device_idx",
        "sessions",
        ["device_id"],
        postgresql_where=sa.text("revoked_at IS NULL"),
    )
    op.create_index("sessions_refresh_exp_idx", "sessions", ["refresh_expires_at"])

    # --- push_tokens ---
    op.create_table(
        "push_tokens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(10), nullable=False),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.CheckConstraint("provider IN ('fcm')", name="ck_push_tokens_provider"),
        sa.UniqueConstraint("provider", "token", name="uq_push_tokens_provider_token"),
    )
    op.create_index("push_tokens_device_idx", "push_tokens", ["device_id"])

    # --- audit_events ---
    op.create_table(
        "audit_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_type", sa.String(20), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(60), nullable=False),
        sa.Column(
            "event_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
        sa.Column("target_type", sa.String(30), nullable=True),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "actor_type IN ('user', 'admin', 'system', 'service')",
            name="ck_audit_events_actor_type",
        ),
    )
    op.create_index(
        "audit_events_user_time_idx", "audit_events", ["owner_user_id", sa.text("event_at DESC")]
    )
    op.create_index(
        "audit_events_type_time_idx", "audit_events", ["event_type", sa.text("event_at DESC")]
    )


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("push_tokens")
    op.drop_table("sessions")
    op.drop_table("devices")
    op.drop_table("recovery_codes")
    op.drop_table("mfa_methods")
    op.drop_table("auth_identities")
    op.drop_table("users")
