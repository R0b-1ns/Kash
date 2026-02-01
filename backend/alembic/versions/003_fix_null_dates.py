"""Fix documents with NULL dates by setting date = created_at.

Revision ID: 003
Revises: 002
Create Date: 2024-01-15

Cette migration corrige les documents qui n'ont pas de date extraite
en utilisant leur date de création comme fallback.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Mettre à jour les documents sans date avec created_at."""
    # Utilise une requête SQL brute pour mettre à jour les documents
    # où date est NULL en utilisant la date de created_at
    op.execute("""
        UPDATE documents
        SET date = DATE(created_at)
        WHERE date IS NULL
    """)


def downgrade() -> None:
    """Pas de downgrade - on ne peut pas savoir quelles dates étaient NULL."""
    pass
