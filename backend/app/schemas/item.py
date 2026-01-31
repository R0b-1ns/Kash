"""
Schémas Pydantic pour les items (articles).

Un item représente une ligne d'un ticket de caisse ou d'une facture.
Par exemple, pour un ticket de supermarché:
- 2x Yaourt nature -> 1 item (quantity=2)
- 1x Pain de mie -> 1 item (quantity=1)
- 500g Pommes -> 1 item (quantity=0.5, unit="kg")

Cela permet d'analyser les dépenses au niveau article
(ex: "Combien j'ai dépensé en yaourts ce mois-ci?").
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    """
    Schéma pour la création d'un item.

    Utilisé lors de l'extraction automatique ou de l'ajout manuel.
    """
    name: str = Field(..., min_length=1, max_length=255, description="Nom de l'article")
    quantity: Decimal = Field(default=1, ge=0, description="Quantité (ex: 2, 0.5)")
    unit: Optional[str] = Field(None, max_length=50, description="Unité (kg, L, pièce, etc.)")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="Prix unitaire")
    total_price: Optional[Decimal] = Field(None, ge=0, description="Prix total de la ligne")
    category: Optional[str] = Field(None, max_length=100, description="Catégorie de l'article")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Yaourt nature x4",
                "quantity": 2,
                "unit": "lot",
                "unit_price": 1.99,
                "total_price": 3.98,
                "category": "Produits laitiers"
            }
        }


class ItemUpdate(BaseModel):
    """
    Schéma pour la mise à jour d'un item.

    Tous les champs sont optionnels.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)


class ItemResponse(BaseModel):
    """
    Schéma de réponse pour un item.
    """
    id: int
    document_id: int
    name: str
    quantity: Decimal
    unit: Optional[str]
    unit_price: Optional[Decimal]
    total_price: Optional[Decimal]
    category: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
