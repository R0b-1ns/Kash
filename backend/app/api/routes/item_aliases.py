"""
Routes pour la gestion des alias d'articles.

Permet de regrouper des articles similaires sous un nom canonique
pour améliorer les statistiques et la lisibilité.

Endpoints:
- GET /item-aliases : Liste des alias groupés par nom canonique
- GET /item-aliases/suggestions : Suggestions de regroupement automatique
- POST /item-aliases : Créer un alias
- POST /item-aliases/bulk : Créer plusieurs alias (regroupement)
- PUT /item-aliases/{id} : Modifier un alias
- PUT /item-aliases/group : Renommer un groupe entier
- DELETE /item-aliases/{id} : Supprimer un alias
- DELETE /item-aliases/group/{canonical_name} : Supprimer un groupe
"""

from typing import List, Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.item import Item
from app.models.item_alias import ItemAlias
from app.models.document import Document
from app.schemas import ItemAliasCreate, ItemAliasUpdate, ItemAliasBulkCreate, ItemAliasGroupUpdate
from app.schemas.converters import item_alias_to_response

router = APIRouter(prefix="/item-aliases", tags=["Item Aliases"])


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calcule la distance de Levenshtein entre deux chaînes."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


@router.get("")
def list_item_aliases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Liste tous les alias de l'utilisateur, groupés par nom canonique.

    Returns:
        Liste de groupes avec leur nom canonique et les alias associés
    """
    aliases = db.query(ItemAlias).filter(
        ItemAlias.user_id == current_user.id
    ).order_by(ItemAlias.canonical_name, ItemAlias.alias_name).all()

    # Grouper par nom canonique
    groups = defaultdict(list)
    for alias in aliases:
        groups[alias.canonical_name].append({
            "id": alias.id,
            "alias_name": alias.alias_name,
            "created_at": alias.created_at,
        })

    return [
        {
            "canonical_name": canonical,
            "aliases": alias_list,
            "alias_count": len(alias_list),
        }
        for canonical, alias_list in sorted(groups.items())
    ]


@router.get("/suggestions")
def get_alias_suggestions(
    min_occurrences: int = Query(2, ge=1, description="Nombre min d'occurrences pour suggérer"),
    max_distance: int = Query(3, ge=1, le=10, description="Distance de Levenshtein max"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Suggère des regroupements d'articles basés sur la similarité des noms.

    Utilise la distance de Levenshtein pour trouver des noms similaires.

    Returns:
        Liste de suggestions de regroupement
    """
    # Récupérer tous les noms d'articles distincts de l'utilisateur
    item_names = db.query(
        Item.name,
        func.count(Item.id).label('count')
    ).join(Document).filter(
        Document.user_id == current_user.id
    ).group_by(Item.name).having(
        func.count(Item.id) >= 1
    ).all()

    # Récupérer les alias existants pour les exclure
    existing_aliases = set(
        a.alias_name.lower() for a in db.query(ItemAlias.alias_name).filter(
            ItemAlias.user_id == current_user.id
        ).all()
    )

    # Normaliser les noms (lowercase) et compter
    name_counts = {}
    for name, count in item_names:
        normalized = name.lower().strip()
        if normalized not in existing_aliases:
            if normalized in name_counts:
                name_counts[normalized]['count'] += count
                name_counts[normalized]['variants'].append(name)
            else:
                name_counts[normalized] = {'count': count, 'variants': [name]}

    # Trouver les groupes similaires
    suggestions = []
    processed = set()

    names = list(name_counts.keys())
    for i, name1 in enumerate(names):
        if name1 in processed:
            continue

        similar_group = [name1]
        for j, name2 in enumerate(names[i + 1:], i + 1):
            if name2 in processed:
                continue

            distance = levenshtein_distance(name1, name2)
            if distance <= max_distance:
                similar_group.append(name2)
                processed.add(name2)

        if len(similar_group) > 1:
            processed.add(name1)

            # Trouver le nom le plus fréquent comme suggestion de nom canonique
            all_variants = []
            total_count = 0
            for name in similar_group:
                all_variants.extend(name_counts[name]['variants'])
                total_count += name_counts[name]['count']

            # Le variant le plus fréquent devient la suggestion canonique
            variant_counts = defaultdict(int)
            for name in similar_group:
                for variant in name_counts[name]['variants']:
                    variant_counts[variant] += name_counts[name]['count']

            suggested_canonical = max(variant_counts.keys(), key=lambda x: variant_counts[x])

            suggestions.append({
                "suggested_canonical": suggested_canonical,
                "variants": list(set(all_variants)),
                "total_occurrences": total_count,
            })

    # Trier par nombre d'occurrences décroissant
    suggestions.sort(key=lambda x: x['total_occurrences'], reverse=True)

    return suggestions


@router.get("/items-list")
def list_distinct_items(
    search: Optional[str] = Query(None, description="Recherche par nom"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Liste tous les noms d'articles distincts avec leur nombre d'occurrences.

    Utile pour l'interface de regroupement manuel.
    """
    query = db.query(
        Item.name,
        func.count(Item.id).label('count'),
        func.sum(Item.total_price).label('total_spent')
    ).join(Document).filter(
        Document.user_id == current_user.id
    )

    if search:
        query = query.filter(Item.name.ilike(f"%{search}%"))

    items = query.group_by(Item.name).order_by(
        func.count(Item.id).desc()
    ).limit(limit).all()

    # Vérifier si chaque item a déjà un alias
    existing_aliases = {
        a.alias_name: a.canonical_name
        for a in db.query(ItemAlias).filter(
            ItemAlias.user_id == current_user.id
        ).all()
    }

    return [
        {
            "name": name,
            "occurrence_count": count,
            "total_spent": float(total_spent) if total_spent else 0,
            "has_alias": name in existing_aliases,
            "canonical_name": existing_aliases.get(name),
        }
        for name, count, total_spent in items
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_item_alias(
    alias_data: ItemAliasCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Crée un alias pour un article.

    Returns:
        L'alias créé
    """
    # Vérifier si cet alias existe déjà
    existing = db.query(ItemAlias).filter(
        ItemAlias.user_id == current_user.id,
        ItemAlias.alias_name == alias_data.alias_name
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"L'article '{alias_data.alias_name}' a déjà un alias vers '{existing.canonical_name}'"
        )

    alias = ItemAlias(
        user_id=current_user.id,
        canonical_name=alias_data.canonical_name,
        alias_name=alias_data.alias_name,
    )

    db.add(alias)
    db.commit()
    db.refresh(alias)

    return item_alias_to_response(alias)


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def create_item_aliases_bulk(
    bulk_data: ItemAliasBulkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Crée plusieurs alias d'un coup pour regrouper des articles.

    Returns:
        Résumé de la création
    """
    created = 0
    skipped = 0
    errors = []

    for alias_name in bulk_data.alias_names:
        # Vérifier si cet alias existe déjà
        existing = db.query(ItemAlias).filter(
            ItemAlias.user_id == current_user.id,
            ItemAlias.alias_name == alias_name
        ).first()

        if existing:
            skipped += 1
            errors.append(f"'{alias_name}' -> déjà alias de '{existing.canonical_name}'")
            continue

        alias = ItemAlias(
            user_id=current_user.id,
            canonical_name=bulk_data.canonical_name,
            alias_name=alias_name,
        )
        db.add(alias)
        created += 1

    db.commit()

    return {
        "success": True,
        "canonical_name": bulk_data.canonical_name,
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }


@router.put("/group")
def rename_alias_group(
    group_data: ItemAliasGroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Renomme un groupe entier (change le nom canonique de tous les alias du groupe).

    Returns:
        Résumé de la modification
    """
    updated = db.query(ItemAlias).filter(
        ItemAlias.user_id == current_user.id,
        ItemAlias.canonical_name == group_data.old_canonical_name
    ).update({ItemAlias.canonical_name: group_data.new_canonical_name})

    if updated == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucun groupe trouvé avec le nom '{group_data.old_canonical_name}'"
        )

    db.commit()

    return {
        "success": True,
        "old_canonical_name": group_data.old_canonical_name,
        "new_canonical_name": group_data.new_canonical_name,
        "updated_count": updated,
    }


@router.put("/{alias_id}")
def update_item_alias(
    alias_id: int,
    alias_data: ItemAliasUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Modifie un alias (change le nom canonique).

    Returns:
        L'alias modifié
    """
    alias = db.query(ItemAlias).filter(
        ItemAlias.id == alias_id,
        ItemAlias.user_id == current_user.id
    ).first()

    if not alias:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alias non trouvé"
        )

    if alias_data.canonical_name:
        alias.canonical_name = alias_data.canonical_name

    db.commit()
    db.refresh(alias)

    return item_alias_to_response(alias)


@router.delete("/group/{canonical_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alias_group(
    canonical_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime tous les alias d'un groupe (supprime le regroupement).
    """
    deleted = db.query(ItemAlias).filter(
        ItemAlias.user_id == current_user.id,
        ItemAlias.canonical_name == canonical_name
    ).delete()

    if deleted == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucun groupe trouvé avec le nom '{canonical_name}'"
        )

    db.commit()

    return None


@router.delete("/{alias_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item_alias(
    alias_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime un alias (dégroupe un article).
    """
    alias = db.query(ItemAlias).filter(
        ItemAlias.id == alias_id,
        ItemAlias.user_id == current_user.id
    ).first()

    if not alias:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alias non trouvé"
        )

    db.delete(alias)
    db.commit()

    return None
