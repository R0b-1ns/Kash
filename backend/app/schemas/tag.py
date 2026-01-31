"""
Schémas Pydantic pour les tags.

Seuls les schémas d'entrée sont définis ici.
Les réponses utilisent tag_to_response() qui retourne un dict.
"""

from typing import Optional

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    """Schéma pour la création d'un tag."""
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(
        default="#3B82F6",
        pattern=r"^#[0-9A-Fa-f]{6}$"
    )
    icon: Optional[str] = Field(None, max_length=50)


class TagUpdate(BaseModel):
    """Schéma pour la mise à jour d'un tag."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
