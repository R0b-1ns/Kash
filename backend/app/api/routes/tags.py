"""
Routes pour la gestion des tags.

Les tags permettent de catégoriser les documents de manière personnalisée.
Chaque utilisateur a ses propres tags.

Endpoints:
- GET /tags : Liste des tags de l'utilisateur
- POST /tags : Créer un nouveau tag
- GET /tags/{id} : Détails d'un tag
- PUT /tags/{id} : Modifier un tag
- DELETE /tags/{id} : Supprimer un tag
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.tag import Tag
from app.schemas import TagCreate, TagUpdate, TagResponse

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("", response_model=List[TagResponse])
def list_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Liste tous les tags de l'utilisateur connecté.

    Returns:
        Liste des tags triés par nom
    """
    tags = db.query(Tag).filter(Tag.user_id == current_user.id).order_by(Tag.name).all()
    return tags


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag_data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crée un nouveau tag.

    - Le nom doit être unique pour cet utilisateur

    Returns:
        Le tag créé
    """
    # Vérifier l'unicité du nom pour cet utilisateur
    existing = db.query(Tag).filter(
        Tag.user_id == current_user.id,
        Tag.name == tag_data.name
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Un tag nommé '{tag_data.name}' existe déjà"
        )

    tag = Tag(
        user_id=current_user.id,
        name=tag_data.name,
        color=tag_data.color,
        icon=tag_data.icon
    )

    db.add(tag)
    db.commit()
    db.refresh(tag)

    return tag


@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère les détails d'un tag.

    Returns:
        Le tag demandé

    Raises:
        404: Tag non trouvé ou n'appartient pas à l'utilisateur
    """
    tag = db.query(Tag).filter(
        Tag.id == tag_id,
        Tag.user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag non trouvé"
        )

    return tag


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: int,
    tag_data: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Modifie un tag existant.

    Seuls les champs fournis sont mis à jour.

    Returns:
        Le tag modifié
    """
    tag = db.query(Tag).filter(
        Tag.id == tag_id,
        Tag.user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag non trouvé"
        )

    # Vérifier l'unicité du nouveau nom si changé
    if tag_data.name and tag_data.name != tag.name:
        existing = db.query(Tag).filter(
            Tag.user_id == current_user.id,
            Tag.name == tag_data.name
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Un tag nommé '{tag_data.name}' existe déjà"
            )

    # Mettre à jour les champs fournis
    update_data = tag_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tag, field, value)

    db.commit()
    db.refresh(tag)

    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime un tag.

    Note: Les associations avec les documents sont automatiquement supprimées.
    Les documents eux-mêmes ne sont pas affectés.
    """
    tag = db.query(Tag).filter(
        Tag.id == tag_id,
        Tag.user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag non trouvé"
        )

    db.delete(tag)
    db.commit()

    return None
