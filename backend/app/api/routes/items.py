"""
Routes pour la gestion des items (articles).

Les items représentent les lignes individuelles d'un ticket ou d'une facture.
Ils permettent d'analyser les dépenses au niveau article.

Endpoints:
- GET /items : Liste des items avec filtres avancés
- POST /documents/{document_id}/items : Ajouter un item à un document
- PUT /items/{id} : Modifier un item
- DELETE /items/{id} : Supprimer un item
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.item import Item
from app.models.tag import DocumentTag
from app.schemas import ItemCreate, ItemUpdate
from app.schemas.converters import item_to_response

router = APIRouter(prefix="/items", tags=["Items"])


@router.get("")
def list_items(
    # Recherche textuelle
    search: Optional[str] = Query(None, description="Recherche par nom d'article"),
    # Filtres sur l'item
    category: Optional[str] = Query(None, description="Filtrer par catégorie"),
    min_price: Optional[Decimal] = Query(None, description="Prix minimum"),
    max_price: Optional[Decimal] = Query(None, description="Prix maximum"),
    # Filtres sur le document parent
    start_date: Optional[date] = Query(None, description="Date de début"),
    end_date: Optional[date] = Query(None, description="Date de fin"),
    merchant: Optional[str] = Query(None, description="Filtrer par marchand"),
    tag_ids: Optional[str] = Query(None, description="IDs des tags séparés par virgule"),
    # Pagination
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    # Auth & DB
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Liste les items de tous les documents de l'utilisateur avec filtres avancés.

    Utile pour analyser les dépenses par article.
    Exemple: "Tous les achats de pain ce mois-ci chez Carrefour"

    Returns:
        Dictionnaire avec items, total et statistiques
    """
    query = db.query(Item).join(Document).filter(Document.user_id == current_user.id)

    # Recherche textuelle par nom
    if search:
        query = query.filter(Item.name.ilike(f"%{search}%"))

    # Filtres sur l'item
    if category:
        query = query.filter(Item.category == category)
    if min_price is not None:
        query = query.filter(
            or_(
                Item.total_price >= min_price,
                Item.unit_price >= min_price
            )
        )
    if max_price is not None:
        query = query.filter(
            or_(
                Item.total_price <= max_price,
                Item.unit_price <= max_price
            )
        )

    # Filtres sur le document parent
    if start_date:
        query = query.filter(Document.date >= start_date)
    if end_date:
        query = query.filter(Document.date <= end_date)
    if merchant:
        query = query.filter(Document.merchant.ilike(f"%{merchant}%"))

    # Filtre par tags (via le document)
    if tag_ids:
        try:
            ids = [int(x.strip()) for x in tag_ids.split(",") if x.strip()]
            if ids:
                query = query.join(DocumentTag, Document.id == DocumentTag.document_id)
                query = query.filter(DocumentTag.tag_id.in_(ids))
                query = query.distinct()
        except ValueError:
            pass

    # Compter le total avant pagination
    total_count = query.count()

    # Calculer les stats (sur les items filtrés)
    stats_query = query.with_entities(
        func.sum(func.coalesce(Item.total_price, Item.unit_price, 0)).label("total_spent"),
        func.sum(Item.quantity).label("total_quantity")
    ).first()

    total_spent = float(stats_query.total_spent or 0)
    total_quantity = float(stats_query.total_quantity or 0)

    # Tri par document puis par ID
    query = query.order_by(Item.document_id.desc(), Item.id)

    items = query.offset(skip).limit(limit).all()

    return {
        "items": [item_to_response(i) for i in items],
        "total": total_count,
        "stats": {
            "total_spent": total_spent,
            "total_quantity": total_quantity
        }
    }


@router.get("/categories", response_model=List[str])
def list_item_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Liste toutes les catégories d'items distinctes de l'utilisateur.

    Utile pour l'autocomplétion dans l'interface.

    Returns:
        Liste des noms de catégories uniques
    """
    result = db.query(Item.category).join(Document).filter(
        Document.user_id == current_user.id,
        Item.category.isnot(None)
    ).distinct().all()

    return [r[0] for r in result if r[0]]


@router.post("/documents/{document_id}", status_code=status.HTTP_201_CREATED)
def create_item(
    document_id: int,
    item_data: ItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Ajoute un item à un document existant.

    Utilisé pour l'ajout manuel d'articles ou la correction
    après extraction automatique.

    Returns:
        L'item créé
    """
    # Vérifier que le document appartient à l'utilisateur
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    item = Item(
        document_id=document_id,
        name=item_data.name,
        quantity=item_data.quantity,
        unit=item_data.unit,
        unit_price=item_data.unit_price,
        total_price=item_data.total_price,
        category=item_data.category
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item_to_response(item)


@router.put("/{item_id}")
def update_item(
    item_id: int,
    item_data: ItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Modifie un item existant.

    Returns:
        L'item modifié
    """
    # Récupérer l'item et vérifier qu'il appartient à l'utilisateur
    item = db.query(Item).join(Document).filter(
        Item.id == item_id,
        Document.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item non trouvé"
        )

    # Mettre à jour les champs fournis
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item_to_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime un item.
    """
    item = db.query(Item).join(Document).filter(
        Item.id == item_id,
        Document.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item non trouvé"
        )

    db.delete(item)
    db.commit()

    return None
