"""
Modèle ItemAlias - Regroupement d'articles similaires.

Permet de définir un nom "canonique" pour regrouper des variantes
d'un même article (ex: "Coca-Cola" regroupe "COCA-COLA", "coca cola", etc.)

Utilisé pour:
- Améliorer les statistiques d'articles fréquents
- Normaliser les noms extraits par l'OCR
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ItemAlias(Base):
    """
    Table de correspondance pour regrouper les articles similaires.

    Chaque entrée lie un nom d'article (alias_name) à un nom canonique.
    Le nom canonique est celui qui sera affiché dans les stats.

    Exemple:
        canonical_name: "Coca-Cola"
        alias_name: "COCA-COLA" (ou "coca cola", "Coca Cola 33cl", etc.)
    """
    __tablename__ = "item_aliases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Le nom normalisé/canonique (celui qu'on affiche)
    canonical_name = Column(String(255), nullable=False, index=True)

    # Le nom tel qu'extrait par l'OCR (la variante)
    alias_name = Column(String(255), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relation
    user = relationship("User", back_populates="item_aliases")

    # Contrainte d'unicité: un alias ne peut correspondre qu'à un seul canonical pour un user
    __table_args__ = (
        UniqueConstraint('user_id', 'alias_name', name='uq_user_alias'),
    )

    def __repr__(self):
        return f"<ItemAlias {self.alias_name} -> {self.canonical_name}>"
