"""
Routes d'authentification.

Endpoints:
- POST /auth/register : Inscription d'un nouvel utilisateur
- POST /auth/login : Connexion et obtention du token JWT
- GET /auth/me : Informations de l'utilisateur connecté
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas import UserCreate, UserLogin, Token
from app.schemas.converters import user_to_response

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)) -> dict:
    """
    Inscription d'un nouvel utilisateur.

    - Vérifie que l'email n'est pas déjà utilisé
    - Hash le mot de passe
    - Crée l'utilisateur en base

    Returns:
        Les informations de l'utilisateur créé (sans le mot de passe)
    """
    # Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte avec cet email existe déjà"
        )

    # Créer l'utilisateur avec le mot de passe hashé
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        name=user_data.name
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user_to_response(user)


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Connexion d'un utilisateur.

    - Vérifie l'email et le mot de passe
    - Génère un token JWT

    Returns:
        Le token JWT pour les requêtes authentifiées
    """
    # Rechercher l'utilisateur par email
    user = db.query(User).filter(User.email == credentials.email).first()

    # Vérifier le mot de passe (même message d'erreur pour email/mdp incorrect = sécurité)
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Créer le token JWT
    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(access_token=access_token, token_type="bearer")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)) -> dict:
    """
    Récupère les informations de l'utilisateur connecté.

    Nécessite un token JWT valide dans le header Authorization.

    Returns:
        Les informations de l'utilisateur (sans le mot de passe)
    """
    return user_to_response(current_user)
