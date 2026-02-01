"""
Schémas Pydantic pour les alias d'articles.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class ItemAliasCreate(BaseModel):
    """Schéma pour créer un alias."""
    canonical_name: str = Field(..., min_length=1, max_length=255)
    alias_name: str = Field(..., min_length=1, max_length=255)


class ItemAliasUpdate(BaseModel):
    """Schéma pour modifier un alias."""
    canonical_name: Optional[str] = Field(None, min_length=1, max_length=255)


class ItemAliasBulkCreate(BaseModel):
    """Schéma pour créer plusieurs alias d'un coup (regroupement)."""
    canonical_name: str = Field(..., min_length=1, max_length=255)
    alias_names: List[str] = Field(..., min_length=1)


class ItemAliasGroupUpdate(BaseModel):
    """Schéma pour renommer un groupe (changer le nom canonique)."""
    old_canonical_name: str = Field(..., min_length=1, max_length=255)
    new_canonical_name: str = Field(..., min_length=1, max_length=255)
