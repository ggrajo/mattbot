"""Widen voice_catalog.locale to varchar(50) for ElevenLabs accent labels

Revision ID: 025
Revises: 024
Create Date: 2026-03-04
"""

import sqlalchemy as sa

from alembic import op

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "voice_catalog",
        "locale",
        type_=sa.String(50),
        existing_type=sa.String(10),
        existing_nullable=False,
        existing_server_default=sa.text("'en'"),
    )


def downgrade() -> None:
    op.alter_column(
        "voice_catalog",
        "locale",
        type_=sa.String(10),
        existing_type=sa.String(50),
        existing_nullable=False,
        existing_server_default=sa.text("'en'"),
    )
