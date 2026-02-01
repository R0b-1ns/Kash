"""Add CASCADE delete on foreign keys for tags and documents.

Revision ID: 005
Revises: 004
Create Date: 2024-01-15

Quand un tag ou document est supprimé, les enregistrements liés
doivent être supprimés automatiquement (CASCADE DELETE).
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Ajouter CASCADE DELETE sur les FK."""

    # 1. budgets.tag_id -> tags.id
    op.drop_constraint('budgets_tag_id_fkey', 'budgets', type_='foreignkey')
    op.create_foreign_key(
        'budgets_tag_id_fkey',
        'budgets',
        'tags',
        ['tag_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # 2. document_tags.tag_id -> tags.id
    op.drop_constraint('document_tags_tag_id_fkey', 'document_tags', type_='foreignkey')
    op.create_foreign_key(
        'document_tags_tag_id_fkey',
        'document_tags',
        'tags',
        ['tag_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # 3. document_tags.document_id -> documents.id
    op.drop_constraint('document_tags_document_id_fkey', 'document_tags', type_='foreignkey')
    op.create_foreign_key(
        'document_tags_document_id_fkey',
        'document_tags',
        'documents',
        ['document_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Retirer CASCADE DELETE."""

    # budgets.tag_id
    op.drop_constraint('budgets_tag_id_fkey', 'budgets', type_='foreignkey')
    op.create_foreign_key(
        'budgets_tag_id_fkey',
        'budgets',
        'tags',
        ['tag_id'],
        ['id']
    )

    # document_tags.tag_id
    op.drop_constraint('document_tags_tag_id_fkey', 'document_tags', type_='foreignkey')
    op.create_foreign_key(
        'document_tags_tag_id_fkey',
        'document_tags',
        'tags',
        ['tag_id'],
        ['id']
    )

    # document_tags.document_id
    op.drop_constraint('document_tags_document_id_fkey', 'document_tags', type_='foreignkey')
    op.create_foreign_key(
        'document_tags_document_id_fkey',
        'document_tags',
        'documents',
        ['document_id'],
        ['id']
    )
