"""
Routes pour la gestion des budgets mensuels.

Un budget définit une limite de dépenses pour un tag sur un mois donné.
L'utilisateur peut ainsi suivre sa consommation par catégorie.

Endpoints:
- GET /budgets : Liste des budgets (filtrable par mois)
- GET /budgets/current : Budgets du mois en cours avec dépenses calculées
- POST /budgets : Créer un budget
- PUT /budgets/{id} : Modifier un budget
- DELETE /budgets/{id} : Supprimer un budget
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.tag import Tag, DocumentTag
from app.models.document import Document
from app.schemas import BudgetCreate, BudgetUpdate
from app.schemas.converters import budget_to_response

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def get_effective_date():
    """
    Retourne une expression SQL pour la date effective du document.
    Utilise Document.date si disponible, sinon Document.created_at.
    """
    return func.coalesce(Document.date, cast(Document.created_at, Date))


def calculate_spending_for_tag(db: Session, user_id: int, tag_id: int, month: str) -> Decimal:
    """
    Calcule le total des dépenses pour un tag sur un mois donné.
    """
    year, month_num = map(int, month.split("-"))
    effective_date = get_effective_date()

    result = db.query(func.coalesce(func.sum(Document.total_amount), 0)).join(
        DocumentTag
    ).filter(
        Document.user_id == user_id,
        DocumentTag.tag_id == tag_id,
        Document.is_income == False,
        func.extract("year", effective_date) == year,
        func.extract("month", effective_date) == month_num
    ).scalar()

    return Decimal(str(result))


@router.get("")
def list_budgets(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$", description="Filtrer par mois (YYYY-MM)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Liste tous les budgets de l'utilisateur.
    """
    query = db.query(Budget).filter(Budget.user_id == current_user.id)

    if month:
        query = query.filter(Budget.month == month)

    budgets = query.order_by(Budget.month.desc()).all()

    # Conversion manuelle
    return [budget_to_response(b) for b in budgets]


@router.get("/current")
def get_current_budgets(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$", description="Mois (défaut: mois actuel)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Récupère les budgets du mois avec les dépenses calculées.
    """
    if not month:
        today = date.today()
        month = today.strftime("%Y-%m")

    budgets = db.query(Budget, Tag).join(Tag).filter(
        Budget.user_id == current_user.id,
        Budget.month == month
    ).all()

    result = []
    for budget, tag in budgets:
        spent = calculate_spending_for_tag(db, current_user.id, tag.id, month)
        remaining = budget.limit_amount - spent
        percentage = float(spent / budget.limit_amount * 100) if budget.limit_amount > 0 else 0

        result.append({
            "id": budget.id,
            "tag_id": tag.id,
            "tag_name": tag.name,
            "tag_color": tag.color,
            "month": budget.month,
            "limit_amount": float(budget.limit_amount),
            "currency": budget.currency,
            "spent_amount": float(spent),
            "remaining_amount": float(remaining),
            "percentage_used": round(percentage, 2)
        })

    return result


@router.post("", status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Crée un nouveau budget.
    """
    tag = db.query(Tag).filter(
        Tag.id == budget_data.tag_id,
        Tag.user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag non trouvé"
        )

    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.tag_id == budget_data.tag_id,
        Budget.month == budget_data.month
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Un budget existe déjà pour ce tag en {budget_data.month}"
        )

    budget = Budget(
        user_id=current_user.id,
        tag_id=budget_data.tag_id,
        month=budget_data.month,
        limit_amount=budget_data.limit_amount,
        currency=budget_data.currency
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    # Conversion manuelle
    return budget_to_response(budget)


@router.put("/{budget_id}")
def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Modifie un budget existant.
    """
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget non trouvé"
        )

    update_data = budget_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)

    db.commit()
    db.refresh(budget)

    # Conversion manuelle
    return budget_to_response(budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime un budget.
    """
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget non trouvé"
        )

    db.delete(budget)
    db.commit()

    return None
