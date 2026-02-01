"""Add recurring document fields

Revision ID: 008
Revises: 007
Create Date: 2024-01-20
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_recurring column - marks document as a recurring template
    op.add_column('documents', sa.Column('is_recurring', sa.Boolean(),
                  server_default='false', nullable=False))

    # Add recurring_frequency - monthly, quarterly, yearly
    op.add_column('documents', sa.Column('recurring_frequency', sa.String(20),
                  nullable=True))

    # Add recurring_end_date - optional end date for the subscription
    op.add_column('documents', sa.Column('recurring_end_date', sa.Date(),
                  nullable=True))

    # Add recurring_parent_id - links generated documents to their template
    op.add_column('documents', sa.Column('recurring_parent_id', sa.Integer(),
                  sa.ForeignKey('documents.id', ondelete='SET NULL'),
                  nullable=True))

    # Add index for faster queries on recurring documents
    op.create_index('ix_documents_is_recurring', 'documents', ['is_recurring'])
    op.create_index('ix_documents_recurring_parent_id', 'documents', ['recurring_parent_id'])


def downgrade() -> None:
    op.drop_index('ix_documents_recurring_parent_id', 'documents')
    op.drop_index('ix_documents_is_recurring', 'documents')
    op.drop_column('documents', 'recurring_parent_id')
    op.drop_column('documents', 'recurring_end_date')
    op.drop_column('documents', 'recurring_frequency')
    op.drop_column('documents', 'is_recurring')
