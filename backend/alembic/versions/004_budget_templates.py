"""Add budget templates tables.

Revision ID: 004
Revises: 003
Create Date: 2024-01-15

Ajoute les tables pour gérer les templates de budget.
Un template permet de sauvegarder une configuration de budgets
pour la réutiliser facilement chaque mois.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Créer les tables budget_templates et budget_template_items."""
    # Table principale des templates
    op.create_table(
        'budget_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Table des items de template
    op.create_table(
        'budget_template_items',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('budget_templates.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('tag_id', sa.Integer(), sa.ForeignKey('tags.id', ondelete='CASCADE'), nullable=False),
        sa.Column('limit_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='EUR'),
    )


def downgrade() -> None:
    """Supprimer les tables de templates."""
    op.drop_table('budget_template_items')
    op.drop_table('budget_templates')
