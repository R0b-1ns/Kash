"""
Dépendances FastAPI réutilisables.

Ce module fournit des dépendances injectables via Depends():
- get_db: Session de base de données
- get_current_user: Utilisateur authentifié

Utilisation dans les routes:
    @router.get("/protected")
    def protected_route(current_user: User = Depends(get_current_user)):
        return {"user_id": current_user.id}
"""

from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.models.user import User

# Schéma d'authentification Bearer Token
# Extrait automatiquement le token du header "Authorization: Bearer <token>"
security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """
    Dépendance qui fournit une session de base de données.

    La session est automatiquement fermée à la fin de la requête
    grâce au pattern "try/finally".

    Usage:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dépendance qui vérifie le token JWT et retourne l'utilisateur authentifié.

    Processus:
    1. Extrait le token du header Authorization
    2. Décode et valide le token JWT
    3. Récupère l'utilisateur en base de données
    4. Retourne l'utilisateur ou lève une exception 401

    Args:
        credentials: Token extrait automatiquement du header
        db: Session de base de données

    Returns:
        L'objet User correspondant au token

    Raises:
        HTTPException 401: Token invalide, expiré ou utilisateur inexistant

    Usage:
        @router.get("/me")
        def get_me(current_user: User = Depends(get_current_user)):
            return {"email": current_user.email}
    """
    # Exception standard pour les erreurs d'authentification
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Extraire le token
    token = credentials.credentials

    # Décoder le token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # Extraire l'ID utilisateur du payload
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception

    # Récupérer l'utilisateur en base
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user
