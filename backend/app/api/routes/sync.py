"""
Routes pour la synchronisation NAS.

La synchronisation utilise un montage SMB/CIFS.
Les fichiers sont organisés par année/mois/type sur le NAS.

Endpoints:
- GET /sync/status : Statut de la synchronisation
- GET /sync/config : Configuration du montage NAS
- POST /sync/test : Tester l'accès au montage
- POST /sync/run : Lancer la synchronisation
- POST /sync/document/{id} : Synchroniser un document spécifique
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document
from app.services.nas_sync_service import get_nas_sync_service

router = APIRouter(prefix="/sync", tags=["Synchronisation NAS"])


# ============================================
# Schémas de réponse
# ============================================

class SyncStatus(BaseModel):
    """Statut de la synchronisation."""
    total_documents: int
    synced: int
    pending: int
    sync_percentage: float
    last_sync: Optional[str]
    nas_configured: bool


class SyncConfigStatus(BaseModel):
    """Statut de la configuration NAS (montage SMB)."""
    configured: bool
    nas_host: bool  # Compat legacy
    nas_user: bool  # Compat legacy
    nas_path: bool
    host: Optional[str]
    path: Optional[str]
    path_exists: Optional[bool] = None
    path_writable: Optional[bool] = None


class TestConnectionResponse(BaseModel):
    """Résultat du test d'accès au montage."""
    success: bool
    message: str


class SyncRunResponse(BaseModel):
    """Résultat d'une synchronisation."""
    total: int
    synced: int
    failed: int
    errors: list[str]


# ============================================
# Endpoints
# ============================================

@router.get("/status", response_model=SyncStatus)
def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère le statut de synchronisation.

    Retourne :
    - Nombre total de documents
    - Nombre synchronisés
    - Nombre en attente
    - Pourcentage de synchronisation
    - Date de dernière synchronisation
    """
    sync_service = get_nas_sync_service(db)
    return sync_service.get_sync_stats(current_user.id)


@router.get("/config", response_model=SyncConfigStatus)
def get_sync_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère le statut de la configuration NAS.

    Vérifie que le montage SMB est accessible.
    """
    sync_service = get_nas_sync_service(db)
    return sync_service.get_config_status()


@router.post("/test", response_model=TestConnectionResponse)
def test_nas_connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Teste l'accès au montage NAS.

    Vérifie que :
    - Le chemin de montage est configuré (NAS_MOUNT_PATH)
    - Le répertoire existe et est accessible
    - L'écriture est possible
    """
    sync_service = get_nas_sync_service(db)

    if not sync_service.is_configured():
        return TestConnectionResponse(
            success=False,
            message="Montage NAS non configuré. Définissez NAS_MOUNT_PATH et montez le partage SMB."
        )

    success, message = sync_service.test_connection()
    return TestConnectionResponse(success=success, message=message)


@router.post("/run", response_model=SyncRunResponse)
def run_sync(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lance la synchronisation de tous les documents en attente.

    Copie tous les fichiers non synchronisés vers le NAS.
    Les fichiers sont organisés par année/mois/type.

    Returns:
        Résultats de la synchronisation (succès, échecs, erreurs)
    """
    sync_service = get_nas_sync_service(db)

    if not sync_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Montage NAS non configuré ou inaccessible"
        )

    results = sync_service.sync_all_pending(current_user.id)
    return SyncRunResponse(**results)


@router.post("/document/{document_id}", response_model=TestConnectionResponse)
def sync_single_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synchronise un document spécifique vers le NAS.

    Le fichier est copié dans la structure année/mois/type/.

    Args:
        document_id: ID du document à synchroniser

    Returns:
        Succès ou échec avec message (inclut le chemin de destination)
    """
    sync_service = get_nas_sync_service(db)

    if not sync_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Montage NAS non configuré ou inaccessible"
        )

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

    if not document.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce document n'a pas de fichier associé"
        )

    success, message = sync_service.sync_file(document)
    return TestConnectionResponse(success=success, message=message)
