"""029 – Custom contact categories: drop fixed CHECK, widen column, add user custom list.

Revision ID: 029
Revises: 028
Create Date: 2026-03-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "029"
down_revision: str | None = "028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_contact_profiles_category",
        "contact_profiles",
        type_="check",
    )

    op.alter_column(
        "contact_profiles",
        "category",
        type_=sa.String(50),
        existing_type=sa.String(20),
        existing_nullable=False,
        existing_server_default=sa.text("'other'"),
    )

    op.add_column(
        "user_settings",
        sa.Column(
            "custom_contact_categories",
            sa.JSON,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.execute(
        "UPDATE contact_profiles SET category = 'other' "
        "WHERE category NOT IN ('business', 'friends', 'family', 'other')"
    )

    op.drop_column("user_settings", "custom_contact_categories")

    op.alter_column(
        "contact_profiles",
        "category",
        type_=sa.String(20),
        existing_type=sa.String(50),
        existing_nullable=False,
        existing_server_default=sa.text("'other'"),
    )

    op.create_check_constraint(
        "ck_contact_profiles_category",
        "contact_profiles",
        "category IN ('business', 'friends', 'family', 'other')",
    )
