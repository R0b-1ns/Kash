"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Tags table
    op.create_table(
        'tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('color', sa.String(7), server_default='#3B82F6', nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tags_id', 'tags', ['id'])
    op.create_index('ix_tags_user_id', 'tags', ['user_id'])

    # Documents table
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('file_type', sa.String(50), nullable=True),
        sa.Column('doc_type', sa.String(50), nullable=True),
        sa.Column('date', sa.Date(), nullable=True),
        sa.Column('time', sa.Time(), nullable=True),
        sa.Column('merchant', sa.String(255), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('currency', sa.String(3), server_default='EUR', nullable=True),
        sa.Column('is_income', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('ocr_raw_text', sa.Text(), nullable=True),
        sa.Column('ocr_confidence', sa.Numeric(5, 2), nullable=True),
        sa.Column('synced_to_nas', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_documents_id', 'documents', ['id'])
    op.create_index('ix_documents_user_id', 'documents', ['user_id'])
    op.create_index('ix_documents_date', 'documents', ['date'])

    # Items table
    op.create_table(
        'items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('quantity', sa.Numeric(10, 3), server_default='1', nullable=True),
        sa.Column('unit', sa.String(50), nullable=True),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=True),
        sa.Column('total_price', sa.Numeric(12, 2), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_items_id', 'items', ['id'])
    op.create_index('ix_items_document_id', 'items', ['document_id'])

    # Document_tags junction table
    op.create_table(
        'document_tags',
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id']),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id']),
        sa.PrimaryKeyConstraint('document_id', 'tag_id')
    )

    # Budgets table
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('month', sa.String(7), nullable=False),
        sa.Column('limit_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), server_default='EUR', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_budgets_id', 'budgets', ['id'])
    op.create_index('ix_budgets_user_id', 'budgets', ['user_id'])
    op.create_index('ix_budgets_tag_id', 'budgets', ['tag_id'])
    op.create_index('ix_budgets_month', 'budgets', ['month'])

    # Currencies table
    op.create_table(
        'currencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(3), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('symbol', sa.String(5), nullable=False),
        sa.Column('rate_to_eur', sa.Numeric(12, 6), server_default='1.0', nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_currencies_id', 'currencies', ['id'])
    op.create_index('ix_currencies_code', 'currencies', ['code'], unique=True)

    # Insert default currencies
    op.execute("""
        INSERT INTO currencies (code, name, symbol, rate_to_eur) VALUES
        ('EUR', 'Euro', '€', 1.0),
        ('USD', 'Dollar américain', '$', 0.92),
        ('GBP', 'Livre sterling', '£', 1.17),
        ('CHF', 'Franc suisse', 'CHF', 1.08),
        ('JPY', 'Yen japonais', '¥', 0.0061),
        ('CAD', 'Dollar canadien', 'C$', 0.68)
    """)


def downgrade() -> None:
    op.drop_table('currencies')
    op.drop_table('budgets')
    op.drop_table('document_tags')
    op.drop_table('items')
    op.drop_table('documents')
    op.drop_table('tags')
    op.drop_table('users')
