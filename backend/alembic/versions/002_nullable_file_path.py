"""Rendre file_path nullable pour les entrées manuelles

Revision ID: 002
Revises: 001
Create Date: 2026-02-01

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rendre file_path nullable pour permettre les entrées manuelles
    op.alter_column('documents', 'file_path',
                    existing_type=sa.String(500),
                    nullable=True)

    # Rendre original_name nullable aussi (pas de fichier = pas de nom original)
    op.alter_column('documents', 'original_name',
                    existing_type=sa.String(255),
                    nullable=True)

    # Rendre file_type nullable
    op.alter_column('documents', 'file_type',
                    existing_type=sa.String(100),
                    nullable=True)


def downgrade() -> None:
    # Attention: cette migration ne peut pas être annulée si des entrées manuelles existent
    op.alter_column('documents', 'file_path',
                    existing_type=sa.String(500),
                    nullable=False)

    op.alter_column('documents', 'original_name',
                    existing_type=sa.String(255),
                    nullable=False)

    op.alter_column('documents', 'file_type',
                    existing_type=sa.String(100),
                    nullable=False)
