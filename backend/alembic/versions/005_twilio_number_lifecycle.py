"""005 twilio number lifecycle indexes

Revision ID: 005
Revises: 004
Create Date: 2026-03-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("user_numbers_e164_idx", "user_numbers", ["e164"])
    op.create_index("user_numbers_status_idx", "user_numbers", ["status"])
    op.create_index("billing_subscriptions_status_idx",
                     "billing_subscriptions", ["status"])


def downgrade() -> None:
    op.drop_index("billing_subscriptions_status_idx",
                   table_name="billing_subscriptions")
    op.drop_index("user_numbers_status_idx", table_name="user_numbers")
    op.drop_index("user_numbers_e164_idx", table_name="user_numbers")
