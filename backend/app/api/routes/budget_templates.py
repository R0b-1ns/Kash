"""
Routes pour la gestion des templates de budget.

Un template permet de sauvegarder une configuration de budgets
pour la réutiliser facilement lors de la création des budgets d'un nouveau mois.

Endpoints:
- GET /budget-templates : Liste des templates
- POST /budget-templates : Créer un template (depuis un mois existant)
- DELETE /budget-templates/{id} : Supprimer un template
- POST /budget-templates/{id}/apply : Appliquer un template à un mois
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.budget_template import BudgetTemplate, BudgetTemplateItem
from app.models.tag import Tag
from app.schemas import BudgetTemplateCreate, BudgetTemplateApply

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/budget-templates", tags=["Budget Templates"])


def template_to_response(template: BudgetTemplate) -> dict:
    """Convertit un template SQLAlchemy en dict pour la réponse API."""
    return {
        "id": template.id,
        "name": template.name,
        "created_at": template.created_at.isoformat() if template.created_at else None,
        "items": [
            {
                "tag_id": item.tag_id,
                "tag_name": item.tag.name if item.tag else "Tag supprimé",
                "tag_color": item.tag.color if item.tag else "#cccccc",
                "limit_amount": float(item.limit_amount),
                "currency": item.currency,
            }
            for item in template.items
        ],
        "item_count": len(template.items),
    }


@router.get("")
def list_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Liste tous les templates de budget de l'utilisateur.
    """
    templates = db.query(BudgetTemplate).options(
        joinedload(BudgetTemplate.items).joinedload(BudgetTemplateItem.tag)
    ).filter(
        BudgetTemplate.user_id == current_user.id
    ).order_by(BudgetTemplate.name).all()

    return [template_to_response(t) for t in templates]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_template(
    data: BudgetTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Crée un nouveau template de budget.

    Deux modes possibles:
    1. from_month: Créer depuis les budgets d'un mois existant
    2. items: Créer manuellement avec une liste d'items
    """
    # Vérifier qu'un mode est choisi
    if not data.from_month and not data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Spécifiez 'from_month' ou 'items'"
        )

    # Créer le template
    template = BudgetTemplate(
        user_id=current_user.id,
        name=data.name
    )

    if data.from_month:
        # Récupérer les budgets du mois spécifié
        budgets = db.query(Budget).filter(
            Budget.user_id == current_user.id,
            Budget.month == data.from_month
        ).all()

        if not budgets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Aucun budget trouvé pour le mois {data.from_month}"
            )

        # Créer les items du template depuis les budgets
        for budget in budgets:
            item = BudgetTemplateItem(
                tag_id=budget.tag_id,
                limit_amount=budget.limit_amount,
                currency=budget.currency
            )
            template.items.append(item)

        logger.info(f"Template créé depuis {len(budgets)} budgets du mois {data.from_month}")

    else:
        # Créer depuis les items fournis
        # Vérifier que les tags appartiennent à l'utilisateur
        tag_ids = [item.tag_id for item in data.items]
        valid_tags = db.query(Tag).filter(
            Tag.id.in_(tag_ids),
            Tag.user_id == current_user.id
        ).all()

        valid_tag_ids = {t.id for t in valid_tags}
        invalid_ids = set(tag_ids) - valid_tag_ids

        if invalid_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tags invalides: {list(invalid_ids)}"
            )

        for item_data in data.items:
            item = BudgetTemplateItem(
                tag_id=item_data.tag_id,
                limit_amount=item_data.limit_amount,
                currency=item_data.currency
            )
            template.items.append(item)

    db.add(template)
    db.commit()

    # Recharger avec les relations
    db.refresh(template)
    template = db.query(BudgetTemplate).options(
        joinedload(BudgetTemplate.items).joinedload(BudgetTemplateItem.tag)
    ).filter(BudgetTemplate.id == template.id).first()

    logger.info(f"Template '{data.name}' créé avec {len(template.items)} items")

    return template_to_response(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime un template de budget.
    """
    template = db.query(BudgetTemplate).filter(
        BudgetTemplate.id == template_id,
        BudgetTemplate.user_id == current_user.id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template non trouvé"
        )

    db.delete(template)
    db.commit()

    logger.info(f"Template {template_id} supprimé")

    return None


@router.post("/{template_id}/apply")
def apply_template(
    template_id: int,
    data: BudgetTemplateApply,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Applique un template à un mois donné.

    Crée les budgets correspondants pour le mois spécifié.
    Si skip_existing=True (défaut), ignore les tags qui ont déjà un budget.
    """
    # Récupérer le template avec ses items
    template = db.query(BudgetTemplate).options(
        joinedload(BudgetTemplate.items).joinedload(BudgetTemplateItem.tag)
    ).filter(
        BudgetTemplate.id == template_id,
        BudgetTemplate.user_id == current_user.id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template non trouvé"
        )

    # Récupérer les budgets existants pour ce mois
    existing_budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == data.month
    ).all()

    existing_tag_ids = {b.tag_id for b in existing_budgets}

    # Créer les budgets depuis le template
    created_count = 0
    skipped_count = 0

    for item in template.items:
        # Vérifier si le tag existe toujours
        if not item.tag:
            skipped_count += 1
            continue

        # Vérifier si un budget existe déjà pour ce tag
        if item.tag_id in existing_tag_ids:
            if data.skip_existing:
                skipped_count += 1
                continue
            else:
                # Supprimer le budget existant
                db.query(Budget).filter(
                    Budget.user_id == current_user.id,
                    Budget.month == data.month,
                    Budget.tag_id == item.tag_id
                ).delete()

        # Créer le nouveau budget
        budget = Budget(
            user_id=current_user.id,
            tag_id=item.tag_id,
            month=data.month,
            limit_amount=item.limit_amount,
            currency=item.currency
        )
        db.add(budget)
        created_count += 1

    db.commit()

    logger.info(f"Template {template_id} appliqué au mois {data.month}: {created_count} créés, {skipped_count} ignorés")

    return {
        "success": True,
        "message": f"{created_count} budget(s) créé(s), {skipped_count} ignoré(s)",
        "created": created_count,
        "skipped": skipped_count,
        "month": data.month,
    }
