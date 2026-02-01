"""Add item_aliases table for grouping similar items

Revision ID: 006
Revises: 005
Create Date: 2024-01-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'item_aliases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('canonical_name', sa.String(255), nullable=False),
        sa.Column('alias_name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'alias_name', name='uq_user_alias')
    )
    op.create_index(op.f('ix_item_aliases_id'), 'item_aliases', ['id'], unique=False)
    op.create_index(op.f('ix_item_aliases_user_id'), 'item_aliases', ['user_id'], unique=False)
    op.create_index(op.f('ix_item_aliases_canonical_name'), 'item_aliases', ['canonical_name'], unique=False)
    op.create_index(op.f('ix_item_aliases_alias_name'), 'item_aliases', ['alias_name'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_item_aliases_alias_name'), table_name='item_aliases')
    op.drop_index(op.f('ix_item_aliases_canonical_name'), table_name='item_aliases')
    op.drop_index(op.f('ix_item_aliases_user_id'), table_name='item_aliases')
    op.drop_index(op.f('ix_item_aliases_id'), table_name='item_aliases')
    op.drop_table('item_aliases')
