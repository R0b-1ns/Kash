"""
Routes pour la gestion des documents (factures, tickets, fiches de paie).

Endpoints:
- GET /documents : Liste des documents avec filtres et pagination
- POST /documents/upload : Upload d'un nouveau document (déclenche OCR + IA)
- GET /documents/{id} : Détails d'un document
- PUT /documents/{id} : Modifier un document (correction manuelle)
- DELETE /documents/{id} : Supprimer un document
- POST /documents/{id}/reprocess : Relancer l'extraction OCR + IA
- POST /documents/{id}/tags : Ajouter des tags à un document
- DELETE /documents/{id}/tags/{tag_id} : Retirer un tag
"""

import os
import uuid
import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.api.deps import get_db, get_current_user
from app.core.config import get_settings
from app.models.user import User
from app.models.document import Document
from app.models.tag import Tag, DocumentTag
from app.models.item import Item
from app.schemas import DocumentUpdate
from app.schemas.converters import document_to_response, document_to_list_response
from app.services.document_processor import process_document, reprocess_document, ProcessingError

# Configuration du logging
logger = logging.getLogger(__name__)

settings = get_settings()
router = APIRouter(prefix="/documents", tags=["Documents"])

# Extensions de fichiers autorisées
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}


def validate_file(file: UploadFile) -> str:
    """
    Valide le fichier uploadé.

    Args:
        file: Le fichier uploadé

    Returns:
        L'extension du fichier (ex: ".pdf")

    Raises:
        HTTPException 400: Fichier invalide
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom de fichier manquant"
        )

    # Vérifier l'extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type de fichier non supporté. Extensions autorisées: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    return ext


@router.get("")
def list_documents(
    # Filtres
    start_date: Optional[date] = Query(None, description="Date de début (incluse)"),
    end_date: Optional[date] = Query(None, description="Date de fin (incluse)"),
    tag_id: Optional[int] = Query(None, description="Filtrer par tag"),
    is_income: Optional[bool] = Query(None, description="True=revenus, False=dépenses"),
    doc_type: Optional[str] = Query(None, description="Type: receipt, invoice, payslip, other"),
    # Pagination
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(50, ge=1, le=100, description="Nombre max d'éléments à retourner"),
    # Auth & DB
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Liste les documents de l'utilisateur avec filtres et pagination.
    """
    query = db.query(Document).filter(Document.user_id == current_user.id)

    # Appliquer les filtres
    if start_date:
        query = query.filter(Document.date >= start_date)
    if end_date:
        query = query.filter(Document.date <= end_date)
    if is_income is not None:
        query = query.filter(Document.is_income == is_income)
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    if tag_id:
        query = query.join(DocumentTag).filter(DocumentTag.tag_id == tag_id)

    # Charger les tags en une seule requête (évite N+1)
    query = query.options(joinedload(Document.tags))

    # Trier par date décroissante puis par ID
    query = query.order_by(desc(Document.date), desc(Document.id))

    # Pagination
    documents = query.offset(skip).limit(limit).all()

    # Conversion manuelle pour éviter la récursion
    return [document_to_list_response(doc) for doc in documents]


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(..., description="Image ou PDF à analyser"),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Upload un nouveau document (image ou PDF).

    Processus:
    1. Valide et sauvegarde le fichier
    2. Crée l'entrée en base de données
    3. Déclenche l'OCR et l'analyse IA pour extraire les données
    """
    # Valider le fichier
    ext = validate_file(file)

    # Générer un nom de fichier unique
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.upload_dir, unique_filename)

    # Sauvegarder le fichier
    try:
        os.makedirs(settings.upload_dir, exist_ok=True)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la sauvegarde du fichier: {str(e)}"
        )

    # Déterminer le type MIME
    file_type = file.content_type or "application/octet-stream"

    # Créer le document en base
    document = Document(
        user_id=current_user.id,
        file_path=file_path,
        original_name=file.filename,
        file_type=file_type,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    # Lancer le traitement OCR + IA
    try:
        document = await process_document(document.id, db)
        logger.info(f"Document {document.id} traité avec succès")
    except ProcessingError as e:
        logger.warning(f"Erreur lors du traitement du document {document.id}: {e.message}")
    except Exception as e:
        logger.error(f"Erreur inattendue lors du traitement du document {document.id}: {str(e)}")

    # Recharger le document avec ses relations
    db.refresh(document)

    # Conversion manuelle
    return document_to_response(document)


@router.get("/{document_id}")
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Récupère les détails complets d'un document.
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

    # Conversion manuelle
    return document_to_response(document)


@router.put("/{document_id}")
def update_document(
    document_id: int,
    doc_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Modifie un document existant.
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    # Mettre à jour les champs fournis (sauf tag_ids)
    update_data = doc_data.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in update_data.items():
        setattr(document, field, value)

    # Gérer les tags si fournis
    if doc_data.tag_ids is not None:
        # Vérifier que les tags appartiennent à l'utilisateur
        tags = db.query(Tag).filter(
            Tag.id.in_(doc_data.tag_ids),
            Tag.user_id == current_user.id
        ).all()

        if len(tags) != len(doc_data.tag_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un ou plusieurs tags sont invalides"
            )

        # Remplacer les tags
        document.tags = tags

    db.commit()
    db.refresh(document)

    # Conversion manuelle
    return document_to_response(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprime un document et son fichier associé.
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    # Supprimer le fichier physique
    if os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except OSError:
            pass

    # Supprimer le document
    db.delete(document)
    db.commit()

    return None


@router.post("/{document_id}/reprocess")
async def reprocess_document_endpoint(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Relance l'extraction OCR + IA sur un document existant.
    """
    # Vérifier que le document existe et appartient à l'utilisateur
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    # Vérifier que le fichier existe toujours
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier source n'existe plus sur le serveur"
        )

    # Lancer le retraitement
    try:
        document = await reprocess_document(document_id, db)
        logger.info(f"Document {document_id} retraité avec succès")
    except ProcessingError as e:
        logger.error(f"Erreur lors du retraitement du document {document_id}: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du retraitement: {e.message}"
        )
    except Exception as e:
        logger.error(f"Erreur inattendue lors du retraitement du document {document_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur inattendue: {str(e)}"
        )

    # Recharger le document avec ses relations
    db.refresh(document)

    # Conversion manuelle
    return document_to_response(document)


@router.post("/{document_id}/tags/{tag_id}")
def add_tag_to_document(
    document_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Ajoute un tag à un document.
    """
    # Vérifier le document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    # Vérifier le tag
    tag = db.query(Tag).filter(
        Tag.id == tag_id,
        Tag.user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag non trouvé"
        )

    # Ajouter le tag s'il n'est pas déjà présent
    if tag not in document.tags:
        document.tags.append(tag)
        db.commit()
        db.refresh(document)

    # Conversion manuelle
    return document_to_response(document)


@router.delete("/{document_id}/tags/{tag_id}")
def remove_tag_from_document(
    document_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Retire un tag d'un document.
    """
    document = db.query(Document).options(
        joinedload(Document.tags)
    ).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    # Trouver et retirer le tag
    tag_to_remove = None
    for tag in document.tags:
        if tag.id == tag_id:
            tag_to_remove = tag
            break

    if tag_to_remove:
        document.tags.remove(tag_to_remove)
        db.commit()
        db.refresh(document)

    # Conversion manuelle
    return document_to_response(document)
