"""
Schémas Pydantic pour les devises.

Les devises permettent de gérer les dépenses en différentes monnaies
(utile pour les voyages).

Toutes les conversions se font vers l'EUR (devise de référence).
Le taux de change (rate_to_eur) indique combien vaut 1 unité de la devise en EUR.
Exemple: 1 USD = 0.92 EUR -> rate_to_eur = 0.92
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class CurrencyCreate(BaseModel):
    """
    Schéma pour l'ajout d'une nouvelle devise.

    Note: Les devises principales sont pré-configurées.
    Ce schéma est utilisé pour ajouter des devises exotiques.
    """
    code: str = Field(..., min_length=3, max_length=3, description="Code ISO 4217 (ex: EUR, USD)")
    name: str = Field(..., max_length=100, description="Nom complet de la devise")
    symbol: str = Field(..., max_length=5, description="Symbole (ex: €, $, £)")
    rate_to_eur: Decimal = Field(..., gt=0, description="Taux de conversion vers EUR")

    class Config:
        json_schema_extra = {
            "example": {
                "code": "THB",
                "name": "Baht thaïlandais",
                "symbol": "฿",
                "rate_to_eur": 0.026
            }
        }


class CurrencyUpdate(BaseModel):
    """
    Schéma pour la mise à jour du taux de change.

    Seul le taux peut être mis à jour (les autres champs sont fixes).
    """
    rate_to_eur: Optional[Decimal] = Field(None, gt=0)


class CurrencyResponse(BaseModel):
    """
    Schéma de réponse pour une devise.
    """
    id: int
    code: str
    name: str
    symbol: str
    rate_to_eur: Decimal
    updated_at: datetime

    class Config:
        from_attributes = True
