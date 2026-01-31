"""
Schémas Pydantic pour les items (articles).

Seuls les schémas d'entrée sont définis ici.
Les réponses utilisent item_to_response() qui retourne un dict.
"""

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    """Schéma pour la création d'un item."""
    name: str = Field(..., min_length=1, max_length=255)
    quantity: Decimal = Field(default=1, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)


class ItemUpdate(BaseModel):
    """Schéma pour la mise à jour d'un item."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)
