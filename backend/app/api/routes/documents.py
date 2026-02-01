"""
Routes pour la gestion des documents (factures, tickets, fiches de paie).

Endpoints:
- GET /documents : Liste des documents avec filtres, tri et pagination
- POST /documents/upload : Upload d'un nouveau document (déclenche OCR + IA)
- POST /documents/manual : Créer une entrée manuelle (sans fichier)
- GET /documents/{id} : Détails d'un document
- GET /documents/{id}/file : Télécharger/afficher le fichier original
- PUT /documents/{id} : Modifier un document (correction manuelle)
- DELETE /documents/{id} : Supprimer un document
- POST /documents/{id}/reprocess : Relancer l'extraction OCR + IA
- POST /documents/{id}/duplicate : Dupliquer un document
- POST /documents/{id}/tags : Ajouter des tags à un document
- DELETE /documents/{id}/tags/{tag_id} : Retirer un tag
"""

import os
import uuid
import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, or_
from decimal import Decimal


from app.api.deps import get_db, get_current_user
from app.core.config import get_settings
from app.models.user import User
from app.models.document import Document
from app.models.tag import Tag, DocumentTag
from app.models.item import Item
from app.schemas import DocumentUpdate, DocumentManualCreate
from app.schemas.converters import document_to_response, document_to_list_response
from app.services.document_processor import process_document, reprocess_document, ProcessingError
from app.core.database import SessionLocal
import asyncio
import threading
from queue import Queue
from typing import Optional as Opt

# Configuration du logging
logger = logging.getLogger(__name__)

settings = get_settings()
router = APIRouter(prefix="/documents", tags=["Documents"])

# Extensions de fichiers autorisées
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}


# ============================================
# File d'attente pour le traitement séquentiel
# ============================================

class DocumentProcessingQueue:
    """
    File d'attente pour traiter les documents un par un.

    PaddleOCR ne supporte pas les requêtes concurrentes,
    donc on sérialise le traitement des documents.
    """

    def __init__(self):
        self._queue: Queue = Queue()
        self._worker_thread: Opt[threading.Thread] = None
        self._running = False
        self._lock = threading.Lock()

    def start(self):
        """Démarre le worker thread s'il n'est pas déjà en cours."""
        with self._lock:
            if self._worker_thread is None or not self._worker_thread.is_alive():
                self._running = True
                self._worker_thread = threading.Thread(target=self._worker, daemon=True)
                self._worker_thread.start()
                logger.info("Worker de traitement de documents démarré")

    def add(self, document_id: int):
        """Ajoute un document à la file d'attente."""
        self._queue.put(document_id)
        logger.info(f"Document {document_id} ajouté à la file d'attente (taille: {self._queue.qsize()})")
        self.start()  # S'assurer que le worker tourne

    def _worker(self):
        """Worker qui traite les documents un par un."""
        while self._running:
            try:
                # Attendre un document (timeout pour vérifier _running)
                try:
                    document_id = self._queue.get(timeout=5)
                except:
                    continue

                logger.info(f"Début du traitement séquentiel du document {document_id}")
                self._process_single_document(document_id)
                self._queue.task_done()

            except Exception as e:
                logger.error(f"Erreur dans le worker de traitement: {e}")

    def _process_single_document(self, document_id: int):
        """Traite un seul document (OCR + IA)."""
        db = SessionLocal()
        try:
            # Mettre à jour le statut à "processing"
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                logger.error(f"Document {document_id} non trouvé pour le traitement")
                return

            document.processing_status = "processing"
            db.commit()

            # Lancer le traitement
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(process_document(document_id, db))

                # Succès
                document = db.query(Document).filter(Document.id == document_id).first()
                document.processing_status = "completed"
                document.processing_error = None
                db.commit()
                logger.info(f"Document {document_id} traité avec succès")

            except ProcessingError as e:
                logger.error(f"Erreur lors du traitement du document {document_id}: {e.message}")
                document = db.query(Document).filter(Document.id == document_id).first()
                document.processing_status = "error"
                document.processing_error = f"{e.step}: {e.message}"
                db.commit()

            except Exception as e:
                logger.error(f"Erreur inattendue lors du traitement du document {document_id}: {str(e)}")
                document = db.query(Document).filter(Document.id == document_id).first()
                document.processing_status = "error"
                document.processing_error = str(e)
                db.commit()
            finally:
                loop.close()

        finally:
            db.close()


# Instance globale de la file d'attente
_processing_queue = DocumentProcessingQueue()


def queue_document_for_processing(document_id: int):
    """Ajoute un document à la file d'attente de traitement."""
    _processing_queue.add(document_id)


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
    # Filtres avancés
    search: Optional[str] = Query(None, description="Recherche dans le marchand, le lieu ou le nom du fichier"),
    ocr_search: Optional[str] = Query(None, description="Recherche dans le texte brut de l'OCR"),
    min_amount: Optional[Decimal] = Query(None, description="Montant total minimum"),
    max_amount: Optional[Decimal] = Query(None, description="Montant total maximum"),
    tag_ids: Optional[str] = Query(None, description="IDs de tags séparés par des virgules"),
    min_confidence: Optional[float] = Query(None, description="Score de confiance OCR minimum (0-100)"),
    # Filtres de base
    start_date: Optional[date] = Query(None, description="Date de début (incluse)"),
    end_date: Optional[date] = Query(None, description="Date de fin (incluse)"),
    is_income: Optional[bool] = Query(None, description="True=revenus, False=dépenses"),
    doc_type: Optional[str] = Query(None, description="Type: receipt, invoice, payslip, other"),
    # Tri
    order_by: str = Query("date", description="Champ de tri: date, total_amount, merchant, created_at"),
    order_dir: str = Query("desc", description="Direction: asc ou desc"),
    # Pagination
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(50, ge=1, le=100, description="Nombre max d'éléments à retourner"),
    # Auth & DB
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    Liste les documents de l'utilisateur avec filtres, tri et pagination.
    """
    query = db.query(Document).filter(Document.user_id == current_user.id)

    # Appliquer les filtres
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(
            Document.merchant.ilike(pattern),
            Document.location.ilike(pattern),
            Document.original_name.ilike(pattern)
        ))
    if ocr_search:
        query = query.filter(Document.ocr_raw_text.ilike(f"%{ocr_search}%"))
    if start_date:
        query = query.filter(Document.date >= start_date)
    if end_date:
        query = query.filter(Document.date <= end_date)
    if min_amount is not None:
        query = query.filter(Document.total_amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Document.total_amount <= max_amount)
    if is_income is not None:
        query = query.filter(Document.is_income == is_income)
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    if min_confidence is not None:
        query = query.filter(Document.ocr_confidence >= min_confidence)
    if tag_ids:
        try:
            ids = [int(x) for x in tag_ids.split(",")]
            if ids:
                query = query.join(DocumentTag).filter(DocumentTag.tag_id.in_(ids)).distinct()
        except (ValueError, TypeError):
            # Ignorer si le format est invalide
            pass

    # Charger les tags en une seule requête (évite N+1)
    query = query.options(joinedload(Document.tags))

    # Déterminer le champ de tri
    sort_columns = {
        "date": Document.date,
        "total_amount": Document.total_amount,
        "merchant": Document.merchant,
        "created_at": Document.created_at,
    }
    sort_column = sort_columns.get(order_by, Document.date)

    # Appliquer le tri
    if order_dir.lower() == "asc":
        query = query.order_by(asc(sort_column), asc(Document.id))
    else:
        query = query.order_by(desc(sort_column), desc(Document.id))

    # Pagination
    documents = query.offset(skip).limit(limit).all()

    # Conversion manuelle pour éviter la récursion
    return [document_to_list_response(doc) for doc in documents]


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile = File(..., description="Image ou PDF à analyser"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Upload un nouveau document (image ou PDF).

    Processus asynchrone:
    1. Valide et sauvegarde le fichier
    2. Crée l'entrée en base de données avec status "pending"
    3. Retourne immédiatement (HTTP 202)
    4. Lance le traitement OCR + IA en arrière-plan

    Le frontend peut suivre l'avancement via GET /documents/{id}/status
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

    # Créer le document en base avec status "pending"
    document = Document(
        user_id=current_user.id,
        file_path=file_path,
        original_name=file.filename,
        file_type=file_type,
        processing_status="pending",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    logger.info(f"Document {document.id} créé, ajout à la file d'attente de traitement")

    # Ajouter à la file d'attente (traitement séquentiel)
    queue_document_for_processing(document.id)

    # Retourner immédiatement avec le document en status pending
    return document_to_response(document)


@router.post("/manual", status_code=status.HTTP_201_CREATED)
def create_manual_entry(
    data: DocumentManualCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Crée une entrée financière manuelle (sans fichier).

    Utile pour:
    - Dépenses sans ticket (parking, pourboire...)
    - Paiements en ligne sans facture
    - Virements, remboursements
    """
    # Vérifier que les tags appartiennent à l'utilisateur
    tags = []
    if data.tag_ids:
        tags = db.query(Tag).filter(
            Tag.id.in_(data.tag_ids),
            Tag.user_id == current_user.id
        ).all()

        if len(tags) != len(data.tag_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un ou plusieurs tags sont invalides"
            )

    # Créer le document sans fichier
    document = Document(
        user_id=current_user.id,
        file_path=None,
        original_name=None,
        file_type=None,
        date=data.date,
        merchant=data.merchant,
        total_amount=data.total_amount,
        currency=data.currency,
        is_income=data.is_income,
        doc_type=data.doc_type,
        # Pas d'OCR pour les entrées manuelles
        ocr_raw_text=data.notes,  # On utilise notes comme texte brut
        ocr_confidence=None,
    )

    # Ajouter les tags
    document.tags = tags

    db.add(document)
    db.commit()
    db.refresh(document)

    logger.info(f"Entrée manuelle créée: {document.id} - {data.merchant}")

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


@router.get("/{document_id}/status")
def get_document_status(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Récupère le statut de traitement d'un document.

    Utilisé par le frontend pour le polling pendant l'upload asynchrone.

    Returns:
        - status: "pending" | "processing" | "completed" | "error"
        - error: Message d'erreur si status == "error"
        - document: Données complètes du document si status == "completed"
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

    response = {
        "status": document.processing_status,
        "error": document.processing_error,
    }

    # Inclure les données complètes si le traitement est terminé
    if document.processing_status == "completed":
        response["document"] = document_to_response(document)

    return response


@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère le fichier original d'un document (image ou PDF).

    Retourne le fichier avec le bon Content-Type pour affichage dans le navigateur.
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

    if not document.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce document n'a pas de fichier associé (entrée manuelle)"
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le fichier n'existe plus sur le serveur"
        )

    # Déterminer le media type
    media_type = document.file_type or "application/octet-stream"

    return FileResponse(
        path=document.file_path,
        media_type=media_type,
        filename=document.original_name
    )


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

    # Supprimer le fichier physique (si présent)
    if document.file_path and os.path.exists(document.file_path):
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

    # Vérifier que le document a un fichier (pas une entrée manuelle)
    if not document.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de retraiter une entrée manuelle (pas de fichier)"
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


@router.post("/{document_id}/duplicate", status_code=status.HTTP_201_CREATED)
def duplicate_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Duplique un document (utile pour les entrées manuelles récurrentes).

    Copie tous les champs sauf: id, created_at, updated_at, synced_to_nas, synced_at.
    Le fichier n'est pas copié (la copie devient une entrée manuelle).
    """
    # Récupérer le document original avec ses relations
    original = db.query(Document).options(
        joinedload(Document.tags),
        joinedload(Document.items)
    ).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    # Créer la copie (sans fichier = entrée manuelle)
    # Si l'original n'a pas de date, on utilise aujourd'hui comme fallback
    duplicate_date = original.date if original.date else date.today()

    duplicate = Document(
        user_id=current_user.id,
        file_path=None,  # Pas de copie du fichier
        original_name=None,
        file_type=None,
        doc_type=original.doc_type,
        date=duplicate_date,
        time=original.time,
        merchant=original.merchant,
        location=original.location,
        total_amount=original.total_amount,
        currency=original.currency,
        is_income=original.is_income,
        ocr_raw_text=f"Dupliqué depuis #{original.id}",
        ocr_confidence=None,
        synced_to_nas=False,
        synced_at=None,
    )

    # Copier les tags
    duplicate.tags = list(original.tags)

    # Copier les items
    for item in original.items:
        new_item = Item(
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            total_price=item.total_price,
            category=item.category,
        )
        duplicate.items.append(new_item)

    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)

    logger.info(f"Document {original.id} dupliqué vers {duplicate.id}")

    return document_to_response(duplicate)


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
