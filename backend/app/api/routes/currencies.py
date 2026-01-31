"""
Routes pour la gestion des devises.

Les devises sont utilisées pour gérer les dépenses multi-devises (voyages).
Toutes les conversions se font vers l'EUR (devise de référence).

Endpoints:
- GET /currencies : Liste des devises disponibles
- POST /currencies : Ajouter une devise
- PUT /currencies/{code} : Mettre à jour le taux de change
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.currency import Currency
from app.schemas import CurrencyCreate, CurrencyUpdate, CurrencyResponse

router = APIRouter(prefix="/currencies", tags=["Devises"])


@router.get("", response_model=List[CurrencyResponse])
def list_currencies(
    db: Session = Depends(get_db)
    # Note: Pas d'authentification requise pour lister les devises
):
    """
    Liste toutes les devises disponibles.

    Les devises sont partagées entre tous les utilisateurs.

    Returns:
        Liste des devises avec leurs taux de conversion
    """
    currencies = db.query(Currency).order_by(Currency.code).all()
    return currencies


@router.post("", response_model=CurrencyResponse, status_code=status.HTTP_201_CREATED)
def create_currency(
    currency_data: CurrencyCreate,
    current_user: User = Depends(get_current_user),  # Auth requise pour modifier
    db: Session = Depends(get_db)
):
    """
    Ajoute une nouvelle devise.

    Note: Nécessite une authentification.
    Vérifie que le code n'existe pas déjà.

    Returns:
        La devise créée
    """
    # Vérifier que le code n'existe pas
    existing = db.query(Currency).filter(Currency.code == currency_data.code.upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La devise {currency_data.code.upper()} existe déjà"
        )

    currency = Currency(
        code=currency_data.code.upper(),
        name=currency_data.name,
        symbol=currency_data.symbol,
        rate_to_eur=currency_data.rate_to_eur
    )

    db.add(currency)
    db.commit()
    db.refresh(currency)

    return currency


@router.put("/{code}", response_model=CurrencyResponse)
def update_currency(
    code: str,
    currency_data: CurrencyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Met à jour le taux de change d'une devise.

    Args:
        code: Code ISO de la devise (ex: USD)

    Returns:
        La devise mise à jour
    """
    currency = db.query(Currency).filter(Currency.code == code.upper()).first()

    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Devise {code.upper()} non trouvée"
        )

    # Mettre à jour le taux
    if currency_data.rate_to_eur is not None:
        currency.rate_to_eur = currency_data.rate_to_eur

    db.commit()
    db.refresh(currency)

    return currency
