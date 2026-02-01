"""
Schémas Pydantic pour les templates de budget.
"""

from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


class BudgetTemplateItemCreate(BaseModel):
    """Item pour la création d'un template."""
    tag_id: int
    limit_amount: Decimal = Field(..., ge=0)
    currency: str = Field(default="EUR", max_length=3)


class BudgetTemplateCreate(BaseModel):
    """
    Schéma pour créer un template de budget.

    Deux modes possibles:
    1. from_month: Créer depuis les budgets d'un mois existant
    2. items: Créer manuellement avec une liste d'items
    """
    name: str = Field(..., min_length=1, max_length=100)
    from_month: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$", description="Créer depuis les budgets de ce mois")
    items: Optional[List[BudgetTemplateItemCreate]] = Field(None, description="Items manuels si from_month n'est pas fourni")


class BudgetTemplateApply(BaseModel):
    """Schéma pour appliquer un template à un mois."""
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Mois cible (YYYY-MM)")
    skip_existing: bool = Field(default=True, description="Ignorer les tags qui ont déjà un budget")
