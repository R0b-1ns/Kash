"""
Schémas Pydantic pour les tags.

Les tags permettent de catégoriser les documents de manière flexible.
L'utilisateur crée ses propres tags (ex: "Courses", "Restaurant", "Salaire").
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    """
    Schéma pour la création d'un tag.

    Example:
        {
            "name": "Courses",
            "color": "#22C55E",
            "icon": "shopping-cart"
        }
    """
    name: str = Field(..., min_length=1, max_length=100, description="Nom du tag")
    color: str = Field(
        default="#3B82F6",
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Couleur hexadécimale (ex: #3B82F6)"
    )
    icon: Optional[str] = Field(None, max_length=50, description="Nom de l'icône (optionnel)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Courses",
                "color": "#22C55E",
                "icon": "shopping-cart"
            }
        }


class TagUpdate(BaseModel):
    """
    Schéma pour la mise à jour d'un tag.

    Tous les champs sont optionnels.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)


class TagResponse(BaseModel):
    """
    Schéma de réponse pour un tag.
    """
    id: int
    name: str
    color: str
    icon: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
