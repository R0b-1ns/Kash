"""
Schémas Pydantic pour les budgets.

Seuls les schémas d'entrée sont définis ici.
Les réponses utilisent budget_to_response() qui retourne un dict.
"""

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class BudgetCreate(BaseModel):
    """Schéma pour la création d'un budget."""
    tag_id: int = Field(..., description="ID du tag concerné")
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Mois au format YYYY-MM")
    limit_amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="EUR", max_length=3)

    @field_validator("month")
    @classmethod
    def validate_month(cls, v: str) -> str:
        """Valide que le mois est cohérent (01-12)."""
        year, month = v.split("-")
        if not (1 <= int(month) <= 12):
            raise ValueError("Le mois doit être entre 01 et 12")
        if not (2000 <= int(year) <= 2100):
            raise ValueError("L'année doit être entre 2000 et 2100")
        return v


class BudgetUpdate(BaseModel):
    """Schéma pour la mise à jour d'un budget."""
    limit_amount: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)
