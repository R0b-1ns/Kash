"""
Modèles pour les templates de budget.

Un template permet de sauvegarder une configuration de budgets
(ensemble de tags avec leurs limites) pour la réutiliser facilement
lors de la création des budgets d'un nouveau mois.
"""

from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, func, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class BudgetTemplate(Base):
    """
    Template de budget.

    Contient un nom et une liste d'items (tag + limit).
    """
    __tablename__ = "budget_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relation avec les items du template
    items = relationship("BudgetTemplateItem", back_populates="template", cascade="all, delete-orphan")


class BudgetTemplateItem(Base):
    """
    Item d'un template de budget.

    Représente une ligne du template : un tag avec sa limite.
    """
    __tablename__ = "budget_template_items"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("budget_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)

    limit_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="EUR")

    # Relations
    template = relationship("BudgetTemplate", back_populates="items")
    tag = relationship("Tag")
