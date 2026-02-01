"""
Schémas Pydantic pour les documents (factures, tickets, fiches de paie).

Seuls les schémas d'entrée sont définis ici.
Les réponses utilisent document_to_response() qui retourne un dict.
"""

from datetime import date as date_type, time as time_type
from decimal import Decimal
from typing import Optional, List, Union

from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    """Schéma pour créer un item dans un document."""
    name: str = Field(..., min_length=1, max_length=255)
    quantity: Decimal = Field(default=1, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)


class DocumentCreate(BaseModel):
    """Schéma pour la création manuelle d'un document."""
    doc_type: Optional[str] = Field(None, description="Type: receipt, invoice, payslip, other")
    date: Union[date_type, None] = None
    time: Union[time_type, None] = None
    merchant: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    total_amount: Optional[Decimal] = Field(None, ge=0)
    currency: str = Field(default="EUR", max_length=3)
    is_income: bool = Field(default=False)
    tag_ids: List[int] = Field(default=[])
    items: List[ItemCreate] = Field(default=[])


class DocumentUpdate(BaseModel):
    """Schéma pour la mise à jour d'un document."""
    doc_type: Union[str, None] = None
    date: Union[date_type, None] = None
    time: Union[time_type, None] = None
    merchant: Union[str, None] = Field(None, max_length=255)
    location: Union[str, None] = Field(None, max_length=255)
    total_amount: Union[Decimal, None] = Field(None, ge=0)
    currency: Union[str, None] = Field(None, max_length=3)
    is_income: Union[bool, None] = None
    tag_ids: Union[List[int], None] = None


class DocumentManualCreate(BaseModel):
    """Schéma pour créer une entrée financière manuelle (sans fichier)."""
    date: date_type = Field(..., description="Date de la transaction")
    merchant: str = Field(..., min_length=1, max_length=255, description="Marchand ou description")
    total_amount: Decimal = Field(..., ge=0, description="Montant total")
    currency: str = Field(default="EUR", max_length=3)
    is_income: bool = Field(default=False, description="True si c'est un revenu")
    doc_type: str = Field(default="other", description="Type: receipt, invoice, payslip, other")
    tag_ids: List[int] = Field(default=[], description="Liste des IDs de tags")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes optionnelles")
