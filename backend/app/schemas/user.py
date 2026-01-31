"""
Schémas Pydantic pour les utilisateurs.

Ces schémas définissent la structure des données pour :
- Création de compte (UserCreate)
- Connexion (UserLogin)
- Réponses API (UserResponse)
- Token JWT (Token)

Les schémas Pydantic assurent la validation automatique des données
et la sérialisation/désérialisation JSON.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# =============================================================================
# Schémas d'entrée (requêtes)
# =============================================================================

class UserCreate(BaseModel):
    """
    Schéma pour la création d'un nouvel utilisateur.

    Utilisé lors de l'inscription (POST /auth/register).
    """
    email: EmailStr = Field(..., description="Adresse email (doit être unique)")
    password: str = Field(..., min_length=8, description="Mot de passe (min 8 caractères)")
    name: Optional[str] = Field(None, max_length=100, description="Nom d'affichage")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "utilisateur@example.com",
                "password": "motdepasse123",
                "name": "Jean Dupont"
            }
        }


class UserLogin(BaseModel):
    """
    Schéma pour la connexion d'un utilisateur.

    Utilisé lors de la connexion (POST /auth/login).
    """
    email: EmailStr = Field(..., description="Adresse email")
    password: str = Field(..., description="Mot de passe")


class UserUpdate(BaseModel):
    """
    Schéma pour la mise à jour du profil utilisateur.

    Tous les champs sont optionnels (mise à jour partielle).
    """
    name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8, description="Nouveau mot de passe")


# =============================================================================
# Schémas de sortie (réponses)
# =============================================================================

class UserResponse(BaseModel):
    """
    Schéma de réponse pour les données utilisateur.

    Ne contient PAS le mot de passe (sécurité).
    """
    id: int
    email: EmailStr
    name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True  # Permet la conversion depuis un objet SQLAlchemy


class Token(BaseModel):
    """
    Schéma pour la réponse d'authentification.

    Contient le token JWT et son type.
    """
    access_token: str = Field(..., description="Token JWT")
    token_type: str = Field(default="bearer", description="Type de token (toujours 'bearer')")


class TokenData(BaseModel):
    """
    Données extraites d'un token JWT décodé.

    Utilisé en interne pour typer les données du token.
    """
    user_id: Optional[int] = None
