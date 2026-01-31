"""
Module de sécurité - Gestion de l'authentification JWT et hashage des mots de passe.

Ce module fournit :
- Hashage sécurisé des mots de passe avec bcrypt
- Création et vérification des tokens JWT
- Fonctions utilitaires pour l'authentification

Utilisation:
    from app.core.security import hash_password, verify_password, create_access_token
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

# Configuration du contexte de hashage avec bcrypt
# bcrypt est recommandé pour le hashage de mots de passe (résistant aux attaques par force brute)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash un mot de passe en clair avec bcrypt.

    Args:
        password: Le mot de passe en clair à hasher

    Returns:
        Le hash du mot de passe (stocké en BDD)

    Example:
        >>> hashed = hash_password("mon_mot_de_passe")
        >>> # hashed = "$2b$12$..."
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie si un mot de passe en clair correspond au hash stocké.

    Args:
        plain_password: Le mot de passe en clair (saisi par l'utilisateur)
        hashed_password: Le hash stocké en base de données

    Returns:
        True si le mot de passe correspond, False sinon

    Example:
        >>> is_valid = verify_password("mon_mot_de_passe", hashed_from_db)
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un token JWT pour l'authentification.

    Le token contient les données fournies (généralement l'ID utilisateur)
    et une date d'expiration.

    Args:
        data: Dictionnaire des données à encoder dans le token
              Typiquement {"sub": user_id} où "sub" = subject (standard JWT)
        expires_delta: Durée de validité du token (optionnel)
                      Par défaut: ACCESS_TOKEN_EXPIRE_MINUTES de la config

    Returns:
        Le token JWT encodé (string)

    Example:
        >>> token = create_access_token({"sub": str(user.id)})
        >>> # token = "eyJhbGciOiJIUzI1NiIs..."
    """
    to_encode = data.copy()

    # Calcul de la date d'expiration
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)

    # Ajout de l'expiration au payload
    to_encode.update({"exp": expire})

    # Encodage du token avec l'algorithme HS256
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Décode et valide un token JWT.

    Args:
        token: Le token JWT à décoder

    Returns:
        Le payload du token si valide, None sinon

    Raises:
        Retourne None en cas de token invalide ou expiré
        (pas d'exception pour simplifier la gestion d'erreur)

    Example:
        >>> payload = decode_access_token(token)
        >>> if payload:
        ...     user_id = payload.get("sub")
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        # Token invalide, expiré ou malformé
        return None
