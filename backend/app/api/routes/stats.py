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
from sqlalchemy import func, extract, case, cast, Date, or_

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.item import Item
from app.models.tag import Tag, DocumentTag
from app.models.item_alias import ItemAlias

router = APIRouter(prefix="/stats", tags=["Statistiques"])


def get_effective_date():
    """
    Retourne une expression SQL pour la date effective du document.
    Utilise Document.date si disponible, sinon Document.created_at.
    """
    return func.coalesce(Document.date, cast(Document.created_at, Date))


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


class TopMerchant(BaseModel):
    """Marchand avec le plus de dépenses."""
    merchant: str
    total_spent: Decimal
    visit_count: int


class RecurringBreakdown(BaseModel):
    """Répartition récurrent vs ponctuel."""
    recurring_total: Decimal
    one_time_total: Decimal
    recurring_count: int
    one_time_count: int
    recurring_percentage: float


class TagEvolutionEntry(BaseModel):
    """Entrée d'évolution pour un tag."""
    tag_id: int
    tag_name: str
    tag_color: str
    amount: Decimal


class TagEvolutionMonth(BaseModel):
    """Évolution des dépenses par tag sur un mois."""
    month: str
    tags: List[TagEvolutionEntry]


class DayOfWeekSpending(BaseModel):
    """Dépenses par jour de la semaine."""
    day: int
    day_name: str
    total: Decimal
    count: int


class TopTransaction(BaseModel):
    """Plus grande transaction individuelle."""
    id: int
    merchant: Optional[str]
    total_amount: Decimal
    date: Optional[str]
    doc_type: Optional[str]


# =============================================================================
# Endpoints
# =============================================================================

class MonthlySummaryWithComparison(MonthlySummary):
    """Résumé mensuel avec comparaison au mois précédent."""
    previous_expenses: Optional[Decimal] = None
    previous_income: Optional[Decimal] = None
    expense_change_percent: Optional[float] = None
    income_change_percent: Optional[float] = None


@router.get("/summary")
def get_monthly_summary(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$", description="Mois (YYYY-MM), défaut: actuel"),
    include_previous: bool = Query(False, description="Inclure la comparaison avec le mois précédent"),
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
    - (Optionnel) Comparaison avec le mois précédent
    """
    # Mois par défaut = actuel
    if not month:
        today = date.today()
        month = today.strftime("%Y-%m")

    year, month_num = map(int, month.split("-"))

    # Date effective (date du document ou date de création)
    effective_date = get_effective_date()

    # Sous-requête pour filtrer les documents du mois
    base_query = db.query(Document).filter(
        Document.user_id == current_user.id,
        extract("year", effective_date) == year,
        extract("month", effective_date) == month_num
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

    result = {
        "month": month,
        "total_expenses": Decimal(str(expenses)),
        "total_income": Decimal(str(income)),
        "balance": Decimal(str(income)) - Decimal(str(expenses)),
        "transaction_count": count,
    }

    # Calcul optionnel du mois précédent
    if include_previous:
        # Calculer le mois précédent
        if month_num == 1:
            prev_year, prev_month = year - 1, 12
        else:
            prev_year, prev_month = year, month_num - 1

        prev_query = db.query(Document).filter(
            Document.user_id == current_user.id,
            extract("year", effective_date) == prev_year,
            extract("month", effective_date) == prev_month
        )

        prev_expenses = prev_query.filter(Document.is_income == False).with_entities(
            func.coalesce(func.sum(Document.total_amount), 0)
        ).scalar()

        prev_income = prev_query.filter(Document.is_income == True).with_entities(
            func.coalesce(func.sum(Document.total_amount), 0)
        ).scalar()

        result["previous_expenses"] = Decimal(str(prev_expenses))
        result["previous_income"] = Decimal(str(prev_income))

        # Calculer les pourcentages de variation
        if float(prev_expenses) > 0:
            result["expense_change_percent"] = round(
                (float(expenses) - float(prev_expenses)) / float(prev_expenses) * 100, 1
            )
        else:
            result["expense_change_percent"] = None

        if float(prev_income) > 0:
            result["income_change_percent"] = round(
                (float(income) - float(prev_income)) / float(prev_income) * 100, 1
            )
        else:
            result["income_change_percent"] = None

    return result


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

    # Date effective (date du document ou date de création)
    effective_date = get_effective_date()

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
        extract("year", effective_date) == year,
        extract("month", effective_date) == month_num
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
    # Date effective (date du document ou date de création)
    effective_date = get_effective_date()

    # Requête: agrégation par mois
    results = db.query(
        func.to_char(effective_date, 'YYYY-MM').label("month"),
        func.sum(
            case(
                (Document.is_income == False, Document.total_amount),
                else_=0
            )
        ).label("expenses"),
        func.sum(
            case(
                (Document.is_income == True, Document.total_amount),
                else_=0
            )
        ).label("income")
    ).filter(
        Document.user_id == current_user.id
    ).group_by(
        func.to_char(effective_date, 'YYYY-MM')
    ).order_by(
        func.to_char(effective_date, 'YYYY-MM').desc()
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
    limit: int = Query(10, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Articles les plus achetés (en montant dépensé).

    Utilise les alias d'articles pour regrouper les variantes.
    Par exemple, "COCA-COLA" et "Coca Cola" seront groupés sous "Coca-Cola"
    si un alias est défini.

    Args:
        month: Mois à filtrer (optionnel, sinon tous les temps)
        limit: Nombre d'articles à retourner

    Returns:
        Liste des top articles avec quantité totale et montant
    """
    # Récupérer les alias de l'utilisateur
    aliases = {
        a.alias_name: a.canonical_name
        for a in db.query(ItemAlias).filter(ItemAlias.user_id == current_user.id).all()
    }

    # Utiliser COALESCE avec une sous-requête pour remplacer les noms par leur alias
    # Si un alias existe, utiliser le canonical_name, sinon garder le nom original
    alias_subquery = db.query(ItemAlias.alias_name, ItemAlias.canonical_name).filter(
        ItemAlias.user_id == current_user.id
    ).subquery()

    # Nom effectif = canonical_name si alias existe, sinon Item.name
    effective_name = func.coalesce(alias_subquery.c.canonical_name, Item.name)

    query = db.query(
        effective_name.label("name"),
        func.sum(Item.quantity).label("total_quantity"),
        func.sum(Item.total_price).label("total_spent"),
        func.count(Item.id).label("purchase_count")
    ).outerjoin(
        alias_subquery, Item.name == alias_subquery.c.alias_name
    ).join(
        Document
    ).filter(
        Document.user_id == current_user.id
    )

    # Filtre par mois si spécifié
    if month:
        year, month_num = map(int, month.split("-"))
        effective_date = get_effective_date()
        query = query.filter(
            extract("year", effective_date) == year,
            extract("month", effective_date) == month_num
        )

    results = query.group_by(
        effective_name
    ).order_by(
        func.count(Item.id).desc(),  # D'abord par nombre d'achats
        func.sum(Item.total_price).desc()  # Puis par montant total
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


@router.get("/top-merchants", response_model=List[TopMerchant])
def get_top_merchants(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Marchands avec le plus de dépenses.

    Retourne pour chaque marchand:
    - Le montant total dépensé
    - Le nombre de visites (transactions)
    """
    effective_date = get_effective_date()

    query = db.query(
        Document.merchant,
        func.sum(Document.total_amount).label("total_spent"),
        func.count(Document.id).label("visit_count")
    ).filter(
        Document.user_id == current_user.id,
        Document.is_income == False,
        Document.merchant.isnot(None),
        Document.merchant != ""
    )

    if month:
        year, month_num = map(int, month.split("-"))
        query = query.filter(
            extract("year", effective_date) == year,
            extract("month", effective_date) == month_num
        )

    results = query.group_by(
        Document.merchant
    ).order_by(
        func.sum(Document.total_amount).desc()
    ).limit(limit).all()

    return [
        TopMerchant(
            merchant=r.merchant,
            total_spent=Decimal(str(r.total_spent or 0)),
            visit_count=r.visit_count
        )
        for r in results
    ]


@router.get("/recurring-breakdown", response_model=RecurringBreakdown)
def get_recurring_breakdown(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Répartition des dépenses récurrentes vs ponctuelles.

    Retourne:
    - Total récurrent et ponctuel
    - Nombre de transactions dans chaque catégorie
    - Pourcentage de récurrent
    """
    if not month:
        today = date.today()
        month = today.strftime("%Y-%m")

    year, month_num = map(int, month.split("-"))
    effective_date = get_effective_date()

    base_query = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.is_income == False,
        extract("year", effective_date) == year,
        extract("month", effective_date) == month_num
    )

    # Récurrent : templates (is_recurring=True) + dépenses générées par abonnements (recurring_parent_id != NULL)
    recurring_result = base_query.filter(
        or_(Document.is_recurring == True, Document.recurring_parent_id.isnot(None))
    ).with_entities(
        func.coalesce(func.sum(Document.total_amount), 0).label("total"),
        func.count(Document.id).label("count")
    ).first()

    # Ponctuel : uniquement les dépenses sans lien avec un abonnement
    one_time_result = base_query.filter(
        Document.is_recurring == False,
        Document.recurring_parent_id.is_(None)
    ).with_entities(
        func.coalesce(func.sum(Document.total_amount), 0).label("total"),
        func.count(Document.id).label("count")
    ).first()

    recurring_total = Decimal(str(recurring_result.total if recurring_result else 0))
    one_time_total = Decimal(str(one_time_result.total if one_time_result else 0))
    total = recurring_total + one_time_total

    return RecurringBreakdown(
        recurring_total=recurring_total,
        one_time_total=one_time_total,
        recurring_count=recurring_result.count if recurring_result else 0,
        one_time_count=one_time_result.count if one_time_result else 0,
        recurring_percentage=round(float(recurring_total / total * 100), 1) if total > 0 else 0
    )


@router.get("/tag-evolution", response_model=List[TagEvolutionMonth])
def get_tag_evolution(
    months: int = Query(6, ge=1, le=12, description="Nombre de mois à récupérer"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Évolution des dépenses par tag sur N mois.

    Utile pour le graphique en aires empilées.
    """
    effective_date = get_effective_date()

    # Récupérer les dépenses par mois et par tag
    results = db.query(
        func.to_char(effective_date, 'YYYY-MM').label("month"),
        Tag.id.label("tag_id"),
        Tag.name.label("tag_name"),
        Tag.color.label("tag_color"),
        func.coalesce(func.sum(Document.total_amount), 0).label("amount")
    ).join(
        DocumentTag, Tag.id == DocumentTag.tag_id
    ).join(
        Document, DocumentTag.document_id == Document.id
    ).filter(
        Tag.user_id == current_user.id,
        Document.is_income == False
    ).group_by(
        func.to_char(effective_date, 'YYYY-MM'),
        Tag.id,
        Tag.name,
        Tag.color
    ).order_by(
        func.to_char(effective_date, 'YYYY-MM').desc()
    ).all()

    # Organiser par mois
    months_data = {}
    for r in results:
        if r.month not in months_data:
            months_data[r.month] = []
        months_data[r.month].append(TagEvolutionEntry(
            tag_id=r.tag_id,
            tag_name=r.tag_name,
            tag_color=r.tag_color,
            amount=Decimal(str(r.amount))
        ))

    # Trier et limiter aux N derniers mois
    sorted_months = sorted(months_data.keys(), reverse=True)[:months]

    return [
        TagEvolutionMonth(month=m, tags=months_data[m])
        for m in reversed(sorted_months)
    ]


@router.get("/by-day-of-week", response_model=List[DayOfWeekSpending])
def get_spending_by_day_of_week(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dépenses par jour de la semaine.

    Retourne les totaux pour chaque jour (0=Lundi à 6=Dimanche).
    """
    effective_date = get_effective_date()

    # EXTRACT DOW: 0=Sunday, 1=Monday, ..., 6=Saturday en PostgreSQL
    # On convertit en 0=Lundi, ..., 6=Dimanche
    dow_expr = (extract("dow", effective_date) + 6) % 7

    query = db.query(
        dow_expr.label("day"),
        func.sum(Document.total_amount).label("total"),
        func.count(Document.id).label("count")
    ).filter(
        Document.user_id == current_user.id,
        Document.is_income == False
    )

    if month:
        year, month_num = map(int, month.split("-"))
        query = query.filter(
            extract("year", effective_date) == year,
            extract("month", effective_date) == month_num
        )

    results = query.group_by(dow_expr).order_by(dow_expr).all()

    # Noms des jours en français
    day_names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

    # Créer un dict pour accès rapide
    results_dict = {int(r.day): r for r in results}

    # Retourner tous les jours (même si 0)
    return [
        DayOfWeekSpending(
            day=i,
            day_name=day_names[i],
            total=Decimal(str(results_dict[i].total if i in results_dict else 0)),
            count=results_dict[i].count if i in results_dict else 0
        )
        for i in range(7)
    ]


@router.get("/top-transactions", response_model=List[TopTransaction])
def get_top_transactions(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Plus grandes transactions individuelles (dépenses).

    Retourne les documents avec les plus gros montants.
    """
    effective_date = get_effective_date()

    query = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.is_income == False,
        Document.total_amount.isnot(None)
    )

    if month:
        year, month_num = map(int, month.split("-"))
        query = query.filter(
            extract("year", effective_date) == year,
            extract("month", effective_date) == month_num
        )

    results = query.order_by(
        Document.total_amount.desc()
    ).limit(limit).all()

    return [
        TopTransaction(
            id=doc.id,
            merchant=doc.merchant,
            total_amount=Decimal(str(doc.total_amount)),
            date=doc.date.isoformat() if doc.date else None,
            doc_type=doc.doc_type
        )
        for doc in results
    ]
