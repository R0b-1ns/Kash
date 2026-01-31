"""
Routes pour la synchronisation NAS.

Endpoints:
- GET /sync/status : Statut de la synchronisation
- POST /sync/test : Tester la connexion au NAS
- POST /sync/run : Lancer la synchronisation
- POST /sync/document/{id} : Synchroniser un document spécifique
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

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
    last_sync: str | None
    nas_configured: bool


class SyncConfigStatus(BaseModel):
    """Statut de la configuration NAS."""
    configured: bool
    nas_host: bool
    nas_user: bool
    nas_path: bool
    host: str | None
    path: str | None


class TestConnectionResponse(BaseModel):
    """Résultat du test de connexion."""
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

    Indique si le NAS est correctement configuré.
    """
    sync_service = get_nas_sync_service(db)
    return sync_service.get_config_status()


@router.post("/test", response_model=TestConnectionResponse)
def test_nas_connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Teste la connexion SSH vers le NAS.

    Vérifie que :
    - La configuration est complète
    - La connexion SSH fonctionne
    - Le chemin de destination est accessible
    """
    sync_service = get_nas_sync_service(db)

    if not sync_service.is_configured():
        return TestConnectionResponse(
            success=False,
            message="Synchronisation NAS non configurée. Définissez NAS_HOST, NAS_USER et NAS_PATH dans le fichier .env"
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

    Transfère tous les fichiers non synchronisés vers le NAS.
    Peut prendre du temps selon le nombre de fichiers.

    Returns:
        Résultats de la synchronisation (succès, échecs, erreurs)
    """
    sync_service = get_nas_sync_service(db)

    if not sync_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Synchronisation NAS non configurée"
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

    Args:
        document_id: ID du document à synchroniser

    Returns:
        Succès ou échec avec message
    """
    sync_service = get_nas_sync_service(db)

    if not sync_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Synchronisation NAS non configurée"
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

    success, message = sync_service.sync_file(document)
    return TestConnectionResponse(success=success, message=message)
