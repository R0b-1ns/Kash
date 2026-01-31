"""
Schémas Pydantic pour les budgets.

Un budget définit une limite de dépenses mensuelle pour un tag donné.
Par exemple:
- Tag "Courses" -> Budget 400€ pour janvier 2026
- Tag "Restaurant" -> Budget 150€ pour janvier 2026

L'application calcule ensuite le pourcentage consommé et affiche
des alertes visuelles (vert/orange/rouge).
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.tag import TagResponse



class BudgetCreate(BaseModel):
    """
    Schéma pour la création d'un budget.

    Le mois est au format "YYYY-MM" (ex: "2026-01").
    """
    tag_id: int = Field(..., description="ID du tag concerné")
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Mois au format YYYY-MM")
    limit_amount: Decimal = Field(..., gt=0, description="Montant limite en devise")
    currency: str = Field(default="EUR", max_length=3, description="Code devise")

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

    class Config:
        json_schema_extra = {
            "example": {
                "tag_id": 1,
                "month": "2026-01",
                "limit_amount": 400.00,
                "currency": "EUR"
            }
        }


class BudgetUpdate(BaseModel):
    """
    Schéma pour la mise à jour d'un budget.

    Seul le montant limite peut être modifié.
    Pour changer le tag ou le mois, supprimer et recréer.
    """
    limit_amount: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)


class BudgetResponse(BaseModel):
    """
    Schéma de réponse pour un budget.
    """
    id: int
    tag_id: int
    month: str
    limit_amount: Decimal
    currency: str
    created_at: datetime
    updated_at: datetime

    # Relation
    tag: Optional[TagResponse] = None

    class Config:
        from_attributes = True


class BudgetWithSpending(BaseModel):
    """
    Schéma de réponse enrichi avec les dépenses actuelles.

    Utilisé dans le dashboard pour afficher la progression.
    """
    id: int
    tag_id: int
    tag_name: str
    tag_color: str
    month: str
    limit_amount: Decimal
    currency: str

    # Données calculées
    spent_amount: Decimal = Field(..., description="Montant déjà dépensé")
    remaining_amount: Decimal = Field(..., description="Montant restant")
    percentage_used: float = Field(..., ge=0, description="Pourcentage consommé (0-100+)")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "tag_id": 1,
                "tag_name": "Courses",
                "tag_color": "#22C55E",
                "month": "2026-01",
                "limit_amount": 400.00,
                "currency": "EUR",
                "spent_amount": 287.50,
                "remaining_amount": 112.50,
                "percentage_used": 71.875
            }
        }
