"""
Schémas Pydantic pour les devises.

Seuls les schémas d'entrée sont définis ici.
Les réponses utilisent currency_to_response() qui retourne un dict.
"""

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class CurrencyCreate(BaseModel):
    """Schéma pour l'ajout d'une devise."""
    code: str = Field(..., min_length=3, max_length=3)
    name: str = Field(..., max_length=100)
    symbol: str = Field(..., max_length=5)
    rate_to_eur: Decimal = Field(..., gt=0)


class CurrencyUpdate(BaseModel):
    """Schéma pour la mise à jour du taux de change."""
    rate_to_eur: Optional[Decimal] = Field(None, gt=0)
