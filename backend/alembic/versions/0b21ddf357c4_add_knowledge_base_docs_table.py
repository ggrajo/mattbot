"""add knowledge_base_docs table

Revision ID: 0b21ddf357c4
Revises: 030
Create Date: 2026-03-14 01:33:41.827148
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '0b21ddf357c4'
down_revision: Union[str, None] = '030'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'knowledge_base_docs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('owner_user_id', sa.UUID(), nullable=False),
        sa.Column('el_document_id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('source_type', sa.String(length=20), nullable=False),
        sa.Column('source_ref', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('el_document_id'),
    )
    op.create_index(
        op.f('ix_knowledge_base_docs_owner_user_id'),
        'knowledge_base_docs',
        ['owner_user_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_knowledge_base_docs_owner_user_id'), table_name='knowledge_base_docs')
    op.drop_table('knowledge_base_docs')
