"""
Routes pour les statistiques et le dashboard.

Ces endpoints fournissent les données agrégées pour l'interface:
- Résumé du mois (total dépenses, revenus, solde)
- Évolution mensuelle
- Répartition par tag
- Top articles achetés

Endpoints:
- GET /stats/summary : Résumé du mois (dépenses, revenus, solde)
- GET /stats/by-tag : Dépenses par tag
- GET /stats/monthly : Évolution mois par mois
- GET /stats/top-items : Articles les plus achetés
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.item import Item
from app.models.tag import Tag, DocumentTag

router = APIRouter(prefix="/stats", tags=["Statistiques"])


# =============================================================================
# Schémas de réponse pour les stats
# =============================================================================

class MonthlySummary(BaseModel):
    """Résumé mensuel: dépenses, revenus, solde."""
    month: str
    total_expenses: Decimal
    total_income: Decimal
    balance: Decimal
    transaction_count: int


class TagSpending(BaseModel):
    """Dépenses pour un tag."""
    tag_id: int
    tag_name: str
    tag_color: str
    total_amount: Decimal
    transaction_count: int
    percentage: float


class MonthlyEvolution(BaseModel):
    """Évolution mois par mois."""
    month: str
    expenses: Decimal
    income: Decimal


class TopItem(BaseModel):
    """Article le plus acheté."""
    name: str
    total_quantity: Decimal
    total_spent: Decimal
    purchase_count: int


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/summary", response_model=MonthlySummary)
def get_monthly_summary(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$", description="Mois (YYYY-MM), défaut: actuel"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Résumé financier du mois.

    Retourne:
    - Total des dépenses
    - Total des revenus
    - Solde (revenus - dépenses)
    - Nombre de transactions
    """
    # Mois par défaut = actuel
    if not month:
        today = date.today()
        month = today.strftime("%Y-%m")

    year, month_num = map(int, month.split("-"))

    # Sous-requête pour filtrer les documents du mois
    base_query = db.query(Document).filter(
        Document.user_id == current_user.id,
        extract("year", Document.date) == year,
        extract("month", Document.date) == month_num
    )

    # Total des dépenses
    expenses = base_query.filter(Document.is_income == False).with_entities(
        func.coalesce(func.sum(Document.total_amount), 0)
    ).scalar()

    # Total des revenus
    income = base_query.filter(Document.is_income == True).with_entities(
        func.coalesce(func.sum(Document.total_amount), 0)
    ).scalar()

    # Nombre de transactions
    count = base_query.count()

    return MonthlySummary(
        month=month,
        total_expenses=Decimal(str(expenses)),
        total_income=Decimal(str(income)),
        balance=Decimal(str(income)) - Decimal(str(expenses)),
        transaction_count=count
    )


@router.get("/by-tag", response_model=List[TagSpending])
def get_spending_by_tag(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Répartition des dépenses par tag pour un mois.

    Utile pour le graphique en camembert du dashboard.

    Retourne pour chaque tag:
    - Le montant total dépensé
    - Le nombre de transactions
    - Le pourcentage du total
    """
    if not month:
        today = date.today()
        month = today.strftime("%Y-%m")

    year, month_num = map(int, month.split("-"))

    # Requête: dépenses groupées par tag
    results = db.query(
        Tag.id,
        Tag.name,
        Tag.color,
        func.coalesce(func.sum(Document.total_amount), 0).label("total"),
        func.count(Document.id).label("count")
    ).join(
        DocumentTag, Tag.id == DocumentTag.tag_id
    ).join(
        Document, DocumentTag.document_id == Document.id
    ).filter(
        Tag.user_id == current_user.id,
        Document.is_income == False,
        extract("year", Document.date) == year,
        extract("month", Document.date) == month_num
    ).group_by(
        Tag.id, Tag.name, Tag.color
    ).order_by(
        func.sum(Document.total_amount).desc()
    ).all()

    # Calculer le total pour les pourcentages
    total_all = sum(r.total for r in results) if results else Decimal("1")

    return [
        TagSpending(
            tag_id=r.id,
            tag_name=r.name,
            tag_color=r.color,
            total_amount=Decimal(str(r.total)),
            transaction_count=r.count,
            percentage=round(float(r.total / total_all * 100), 2) if total_all > 0 else 0
        )
        for r in results
    ]


@router.get("/monthly", response_model=List[MonthlyEvolution])
def get_monthly_evolution(
    months: int = Query(12, ge=1, le=24, description="Nombre de mois à récupérer"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Évolution des dépenses et revenus mois par mois.

    Utile pour le graphique en barres/ligne du dashboard.

    Args:
        months: Nombre de mois à inclure (défaut: 12)

    Returns:
        Liste des mois avec dépenses et revenus
    """
    # Requête: agrégation par mois
    results = db.query(
        func.to_char(Document.date, 'YYYY-MM').label("month"),
        func.sum(
            func.case(
                (Document.is_income == False, Document.total_amount),
                else_=0
            )
        ).label("expenses"),
        func.sum(
            func.case(
                (Document.is_income == True, Document.total_amount),
                else_=0
            )
        ).label("income")
    ).filter(
        Document.user_id == current_user.id,
        Document.date.isnot(None)
    ).group_by(
        func.to_char(Document.date, 'YYYY-MM')
    ).order_by(
        func.to_char(Document.date, 'YYYY-MM').desc()
    ).limit(months).all()

    # Inverser pour avoir l'ordre chronologique
    return [
        MonthlyEvolution(
            month=r.month,
            expenses=Decimal(str(r.expenses or 0)),
            income=Decimal(str(r.income or 0))
        )
        for r in reversed(results)
    ]


@router.get("/top-items", response_model=List[TopItem])
def get_top_items(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Articles les plus achetés (en montant dépensé).

    Utile pour voir où va l'argent au niveau article.

    Args:
        month: Mois à filtrer (optionnel, sinon tous les temps)
        limit: Nombre d'articles à retourner

    Returns:
        Liste des top articles avec quantité totale et montant
    """
    query = db.query(
        Item.name,
        func.sum(Item.quantity).label("total_quantity"),
        func.sum(Item.total_price).label("total_spent"),
        func.count(Item.id).label("purchase_count")
    ).join(
        Document
    ).filter(
        Document.user_id == current_user.id
    )

    # Filtre par mois si spécifié
    if month:
        year, month_num = map(int, month.split("-"))
        query = query.filter(
            extract("year", Document.date) == year,
            extract("month", Document.date) == month_num
        )

    results = query.group_by(
        Item.name
    ).order_by(
        func.sum(Item.total_price).desc()
    ).limit(limit).all()

    return [
        TopItem(
            name=r.name,
            total_quantity=Decimal(str(r.total_quantity or 0)),
            total_spent=Decimal(str(r.total_spent or 0)),
            purchase_count=r.purchase_count
        )
        for r in results
    ]
