"""Add processing status fields for async upload

Revision ID: 007
Revises: 006
Create Date: 2024-01-15
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add processing_status column with default 'completed' for existing documents
    op.add_column('documents', sa.Column('processing_status', sa.String(20), server_default='completed', nullable=False))
    op.add_column('documents', sa.Column('processing_error', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('documents', 'processing_error')
    op.drop_column('documents', 'processing_status')
