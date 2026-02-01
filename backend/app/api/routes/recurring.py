"""
Routes pour la gestion des documents récurrents (abonnements).

Endpoints:
- GET /recurring : Liste les templates récurrents de l'utilisateur
- POST /recurring/generate : Génère les entrées du mois courant
- POST /recurring/{id}/toggle : Active/désactive un récurrent
- GET /recurring/summary : Résumé des charges fixes mensuelles
"""

import logging
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, extract

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.item import Item
from app.schemas.converters import document_to_response, document_to_list_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recurring", tags=["Recurring"])


def get_month_start_end(month_str: Optional[str] = None):
    """
    Parse un mois au format YYYY-MM et retourne (premier jour, dernier jour).
    Si non fourni, utilise le mois courant.
    """
    if month_str:
        try:
            year, month = map(int, month_str.split("-"))
            start = date(year, month, 1)
        except (ValueError, TypeError):
            start = date.today().replace(day=1)
    else:
        start = date.today().replace(day=1)

    # Dernier jour du mois
    if start.month == 12:
        end = date(start.year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(start.year, start.month + 1, 1) - timedelta(days=1)

    return start, end


def should_generate_for_month(doc: Document, target_month: date) -> bool:
    """
    Vérifie si un document récurrent doit être généré pour un mois donné.

    - monthly : génère chaque mois
    - quarterly : génère en janvier, avril, juillet, octobre
    - yearly : génère uniquement le mois anniversaire (basé sur la date du document)
    """
    if not doc.is_recurring or not doc.recurring_frequency:
        return False

    # Vérifier si la date de fin n'est pas dépassée
    if doc.recurring_end_date and target_month > doc.recurring_end_date:
        return False

    frequency = doc.recurring_frequency.lower()

    if frequency == "monthly":
        return True
    elif frequency == "quarterly":
        # Génère en janvier (1), avril (4), juillet (7), octobre (10)
        return target_month.month in [1, 4, 7, 10]
    elif frequency == "yearly":
        # Génère uniquement le mois anniversaire
        if doc.date:
            return target_month.month == doc.date.month
        return target_month.month == 1  # Par défaut janvier si pas de date
    else:
        return False


@router.get("")
def list_recurring_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Liste tous les documents récurrents (templates) de l'utilisateur.
    """
    documents = db.query(Document).options(
        joinedload(Document.tags)
    ).filter(
        Document.user_id == current_user.id,
        Document.is_recurring == True,
        Document.recurring_parent_id.is_(None)  # Seulement les templates, pas les générés
    ).order_by(Document.merchant).all()

    return [document_to_list_response(doc) for doc in documents]


@router.get("/summary")
def get_recurring_summary(
    month: Optional[str] = Query(None, description="Mois au format YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Retourne un résumé des charges fixes mensuelles.

    Inclut:
    - total_monthly : montant total mensuel estimé
    - total_count : nombre de templates actifs
    - next_generation_date : prochain 1er du mois
    - generated_this_month : nombre de docs générés ce mois
    - templates : liste des templates avec infos
    """
    month_start, month_end = get_month_start_end(month)

    # Récupérer les templates récurrents
    templates = db.query(Document).options(
        joinedload(Document.tags)
    ).filter(
        Document.user_id == current_user.id,
        Document.is_recurring == True,
        Document.recurring_parent_id.is_(None)
    ).all()

    # Calculer le total mensuel (seulement les mensuels, ou divisé pour quarterly/yearly)
    total_monthly = 0
    template_infos = []

    for doc in templates:
        amount = float(doc.total_amount) if doc.total_amount else 0

        # Ajuster selon la fréquence pour avoir un équivalent mensuel
        if doc.recurring_frequency == "monthly":
            monthly_amount = amount
        elif doc.recurring_frequency == "quarterly":
            monthly_amount = amount / 3
        elif doc.recurring_frequency == "yearly":
            monthly_amount = amount / 12
        else:
            monthly_amount = amount

        total_monthly += monthly_amount

        # Dernière génération pour ce template
        last_generated = db.query(Document).filter(
            Document.recurring_parent_id == doc.id
        ).order_by(Document.date.desc()).first()

        template_infos.append({
            "id": doc.id,
            "merchant": doc.merchant,
            "total_amount": float(doc.total_amount) if doc.total_amount else 0,
            "currency": doc.currency or "EUR",
            "frequency": doc.recurring_frequency,
            "is_active": doc.is_recurring,
            "end_date": doc.recurring_end_date.isoformat() if doc.recurring_end_date else None,
            "last_generated": last_generated.date.isoformat() if last_generated and last_generated.date else None,
            "tags": [{"id": t.id, "name": t.name, "color": t.color} for t in doc.tags] if doc.tags else [],
        })

    # Compter les documents générés ce mois
    generated_count = db.query(func.count(Document.id)).filter(
        Document.user_id == current_user.id,
        Document.recurring_parent_id.isnot(None),
        Document.date >= month_start,
        Document.date <= month_end
    ).scalar()

    # Compter combien de templates n'ont pas encore été générés ce mois
    pending_count = 0
    for doc in templates:
        if not should_generate_for_month(doc, month_start):
            continue
        # Vérifier si déjà généré ce mois
        existing = db.query(Document).filter(
            Document.recurring_parent_id == doc.id,
            Document.date >= month_start,
            Document.date <= month_end
        ).first()
        if not existing:
            pending_count += 1

    return {
        "total_monthly": round(total_monthly, 2),
        "total_count": len(templates),
        "pending_this_month": pending_count,
        "generated_this_month": generated_count,
        "month": month_start.strftime("%Y-%m"),
        "templates": template_infos
    }


@router.post("/generate")
def generate_recurring_documents(
    month: Optional[str] = Query(None, description="Mois au format YYYY-MM (défaut: mois courant)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Génère les documents récurrents pour un mois donné.

    Pour chaque template récurrent actif:
    1. Vérifie si la fréquence correspond au mois cible
    2. Vérifie si pas déjà généré ce mois
    3. Crée une copie du document avec la date du mois

    Returns:
        - created: nombre de documents créés
        - skipped: nombre de documents ignorés (déjà générés ou fréquence non applicable)
        - details: liste des documents créés
    """
    month_start, month_end = get_month_start_end(month)

    # Récupérer tous les templates récurrents actifs
    templates = db.query(Document).options(
        joinedload(Document.tags),
        joinedload(Document.items)
    ).filter(
        Document.user_id == current_user.id,
        Document.is_recurring == True,
        Document.recurring_parent_id.is_(None)
    ).all()

    created = 0
    skipped = 0
    created_docs = []

    for template in templates:
        # Vérifier si on doit générer pour ce mois
        if not should_generate_for_month(template, month_start):
            skipped += 1
            logger.debug(f"Template {template.id} ignoré: fréquence {template.recurring_frequency} ne correspond pas à {month_start}")
            continue

        # Vérifier si déjà généré ce mois
        existing = db.query(Document).filter(
            Document.recurring_parent_id == template.id,
            Document.date >= month_start,
            Document.date <= month_end
        ).first()

        if existing:
            skipped += 1
            logger.debug(f"Template {template.id} ignoré: déjà généré ce mois (doc {existing.id})")
            continue

        # Calculer la date pour le nouveau document
        # Si le template a une date, on garde le même jour du mois
        if template.date:
            try:
                new_date = month_start.replace(day=template.date.day)
            except ValueError:
                # Si le jour n'existe pas (ex: 31 février), prendre le dernier jour
                new_date = month_end
        else:
            new_date = month_start

        # Créer le document
        new_doc = Document(
            user_id=current_user.id,
            file_path=None,  # Pas de fichier pour les documents générés
            original_name=None,
            file_type=None,
            doc_type=template.doc_type,
            date=new_date,
            time=template.time,
            merchant=template.merchant,
            location=template.location,
            total_amount=template.total_amount,
            currency=template.currency,
            is_income=template.is_income,
            ocr_raw_text=f"Généré automatiquement depuis l'abonnement #{template.id}",
            ocr_confidence=None,
            is_recurring=False,  # Le document généré n'est pas lui-même récurrent
            recurring_parent_id=template.id,
            synced_to_nas=False,
        )

        # Copier les tags
        new_doc.tags = list(template.tags)

        # Copier les items
        for item in template.items:
            new_item = Item(
                name=item.name,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=item.unit_price,
                total_price=item.total_price,
                category=item.category,
            )
            new_doc.items.append(new_item)

        db.add(new_doc)
        db.flush()  # Pour obtenir l'ID

        created += 1
        created_docs.append({
            "id": new_doc.id,
            "merchant": new_doc.merchant,
            "date": new_doc.date.isoformat() if new_doc.date else None,
            "total_amount": float(new_doc.total_amount) if new_doc.total_amount else 0,
            "parent_id": template.id,
        })

        logger.info(f"Document récurrent généré: {new_doc.id} depuis template {template.id}")

    db.commit()

    return {
        "success": True,
        "month": month_start.strftime("%Y-%m"),
        "created": created,
        "skipped": skipped,
        "details": created_docs
    }


@router.post("/{document_id}/toggle")
def toggle_recurring(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Active ou désactive le statut récurrent d'un document.

    Si le document est récurrent, il devient non-récurrent et vice-versa.
    """
    document = db.query(Document).options(
        joinedload(Document.tags),
        joinedload(Document.items)
    ).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    # Inverser le statut
    document.is_recurring = not document.is_recurring

    # Si on désactive, on peut aussi supprimer la fréquence
    if not document.is_recurring:
        document.recurring_frequency = None
        document.recurring_end_date = None

    db.commit()
    db.refresh(document)

    logger.info(f"Document {document_id} récurrent togglé: {document.is_recurring}")

    return document_to_response(document)


@router.get("/generated")
def list_generated_documents(
    month: Optional[str] = Query(None, description="Mois au format YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Liste les documents générés automatiquement pour un mois donné.
    """
    month_start, month_end = get_month_start_end(month)

    documents = db.query(Document).options(
        joinedload(Document.tags)
    ).filter(
        Document.user_id == current_user.id,
        Document.recurring_parent_id.isnot(None),
        Document.date >= month_start,
        Document.date <= month_end
    ).order_by(Document.date.desc()).all()

    return [document_to_list_response(doc) for doc in documents]
