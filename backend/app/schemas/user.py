"""
Schémas Pydantic pour les utilisateurs.

Seuls les schémas d'entrée sont définis ici.
Les réponses utilisent user_to_response() qui retourne un dict.
"""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schéma pour la création d'un utilisateur."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: Optional[str] = Field(None, max_length=100)


class UserLogin(BaseModel):
    """Schéma pour la connexion."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schéma pour la mise à jour du profil."""
    name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)


class Token(BaseModel):
    """Schéma pour la réponse d'authentification."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Données extraites d'un token JWT."""
    user_id: Optional[int] = None
