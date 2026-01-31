"""
Schémas Pydantic pour les documents (factures, tickets, fiches de paie).

Un document représente un fichier uploadé (image ou PDF) avec les données
extraites par l'OCR et l'IA.

Structure:
- Document: Le fichier principal avec métadonnées (date, marchand, montant)
- Items: Les articles individuels contenus dans le document (pour les tickets de caisse)
"""

from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field

from app.schemas.tag import TagResponse
from app.schemas.item import ItemResponse, ItemCreate



# =============================================================================
# Types de documents supportés
# =============================================================================
# - receipt: Ticket de caisse (supermarché, restaurant, etc.)
# - invoice: Facture (électricité, internet, etc.)
# - payslip: Fiche de paie
# - other: Autre type de document


class DocumentCreate(BaseModel):
    """
    Schéma pour la création manuelle d'un document.

    Note: En pratique, les documents sont créés automatiquement
    lors de l'upload via l'endpoint /documents/upload.
    Ce schéma est utilisé pour les corrections manuelles.
    """
    doc_type: Optional[str] = Field(None, description="Type: receipt, invoice, payslip, other")
    date: Optional[date] = Field(None, description="Date du document")
    time: Optional[time] = Field(None, description="Heure (si disponible)")
    merchant: Optional[str] = Field(None, max_length=255, description="Nom du marchand/entreprise")
    location: Optional[str] = Field(None, max_length=255, description="Lieu/adresse")
    total_amount: Optional[Decimal] = Field(None, ge=0, description="Montant total")
    currency: str = Field(default="EUR", max_length=3, description="Code devise (EUR, USD, etc.)")
    is_income: bool = Field(default=False, description="True si c'est une entrée d'argent")
    tag_ids: List[int] = Field(default=[], description="IDs des tags à associer")
    items: List[ItemCreate] = Field(default=[], description="Articles du document")


class DocumentUpdate(BaseModel):
    """
    Schéma pour la mise à jour d'un document.

    Utilisé pour corriger les données extraites par l'IA
    ou ajouter des informations manuellement.
    """
    doc_type: Optional[str] = None
    date: Optional[date] = None
    time: Optional[time] = None
    merchant: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    total_amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    is_income: Optional[bool] = None
    tag_ids: Optional[List[int]] = Field(None, description="Remplace tous les tags existants")


class DocumentResponse(BaseModel):
    """
    Schéma de réponse pour un document.

    Inclut toutes les données extraites + les relations (tags, items).
    """
    id: int
    file_path: str
    original_name: str
    file_type: Optional[str]
    doc_type: Optional[str]

    # Données extraites
    date: Optional[date]
    time: Optional[time]
    merchant: Optional[str]
    location: Optional[str]
    total_amount: Optional[Decimal]
    currency: str
    is_income: bool

    # OCR
    ocr_raw_text: Optional[str]
    ocr_confidence: Optional[Decimal]

    # Sync NAS
    synced_to_nas: bool
    synced_at: Optional[datetime]

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Relations
    tags: List[TagResponse] = []
    items: List[ItemResponse] = []

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """
    Schéma pour la liste des documents (pagination).

    Version allégée sans le texte OCR brut (pour optimiser les perfs).
    """
    id: int
    original_name: str
    doc_type: Optional[str]
    date: Optional[date]
    merchant: Optional[str]
    total_amount: Optional[Decimal]
    currency: str
    is_income: bool
    created_at: datetime
    tags: List[TagResponse] = []

    class Config:
        from_attributes = True
