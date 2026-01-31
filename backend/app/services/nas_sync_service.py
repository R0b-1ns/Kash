"""
Service de synchronisation vers le NAS.

Synchronise les fichiers uploadés vers un NAS via un montage SMB/CIFS.
Le partage NAS doit être monté localement (dans le container Docker).

Configuration requise :
- NAS_MOUNT_PATH : Chemin local du montage SMB (ex: /app/nas_backup)

Structure de destination :
    {nas_mount_path}/{année}/{mois}/{type}/{fichier}
    Exemple: /app/nas_backup/2024/01/factures/abc123.pdf
"""

import os
import shutil
import logging
from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.document import Document

logger = logging.getLogger(__name__)
settings = get_settings()


class NASSyncError(Exception):
    """Exception levée en cas d'erreur de synchronisation."""

    def __init__(self, message: str, details: Optional[str] = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class NASSyncService:
    """
    Service de synchronisation des fichiers vers le NAS.

    Utilise une simple copie de fichiers vers un partage SMB monté.
    Les fichiers sont organisés par année/mois/type.
    """

    def __init__(self, db: Session):
        """
        Initialise le service de synchronisation.

        Args:
            db: Session de base de données pour mettre à jour le statut
        """
        self.db = db
        self.nas_mount_path = settings.nas_mount_path
        self.upload_dir = settings.upload_dir

    def is_configured(self) -> bool:
        """
        Vérifie si la synchronisation NAS est configurée.

        Returns:
            True si le chemin de montage est défini et accessible
        """
        if not self.nas_mount_path:
            return False
        return os.path.isdir(self.nas_mount_path)

    def get_config_status(self) -> dict:
        """
        Retourne le statut de la configuration.

        Returns:
            Dictionnaire avec le statut de chaque paramètre
        """
        path_exists = os.path.isdir(self.nas_mount_path) if self.nas_mount_path else False
        path_writable = os.access(self.nas_mount_path, os.W_OK) if path_exists else False

        return {
            "configured": self.is_configured(),
            "nas_host": bool(self.nas_mount_path),  # Compat avec l'ancien format
            "nas_user": True,  # Plus besoin avec SMB
            "nas_path": bool(self.nas_mount_path),
            "host": "SMB Mount",
            "path": self.nas_mount_path if self.nas_mount_path else None,
            "path_exists": path_exists,
            "path_writable": path_writable,
        }

    def test_connection(self) -> Tuple[bool, str]:
        """
        Teste l'accès au montage NAS.

        Returns:
            Tuple (succès, message)
        """
        if not self.nas_mount_path:
            return False, "NAS_MOUNT_PATH non configuré"

        if not os.path.isdir(self.nas_mount_path):
            return False, f"Le chemin {self.nas_mount_path} n'existe pas ou n'est pas monté"

        if not os.access(self.nas_mount_path, os.W_OK):
            return False, f"Le chemin {self.nas_mount_path} n'est pas accessible en écriture"

        # Test d'écriture
        try:
            test_file = os.path.join(self.nas_mount_path, ".sync_test")
            with open(test_file, "w") as f:
                f.write("test")
            os.remove(test_file)
            return True, "Montage NAS accessible en lecture/écriture"
        except Exception as e:
            return False, f"Erreur d'écriture : {str(e)}"

    def _get_doc_type_folder(self, doc_type: Optional[str]) -> str:
        """
        Retourne le nom du dossier pour un type de document.

        Args:
            doc_type: Type de document (receipt, invoice, payslip, other)

        Returns:
            Nom du dossier en français
        """
        type_mapping = {
            "receipt": "tickets",
            "invoice": "factures",
            "payslip": "salaires",
            "other": "autres",
        }
        return type_mapping.get(doc_type, "autres")

    def _get_destination_path(self, document: Document) -> str:
        """
        Construit le chemin de destination organisé par année/mois/type.

        Structure: {nas_mount_path}/{année}/{mois}/{type}/{fichier}
        Exemple: /app/nas_backup/2024/01/factures/abc123.pdf

        Args:
            document: Le document à synchroniser

        Returns:
            Chemin complet de destination
        """
        # Utiliser la date du document, ou created_at comme fallback
        doc_date = document.date
        if doc_date is None:
            doc_date = document.created_at.date() if document.created_at else datetime.utcnow().date()

        year = str(doc_date.year)
        month = str(doc_date.month).zfill(2)  # 01, 02, ..., 12
        doc_type_folder = self._get_doc_type_folder(document.doc_type)
        filename = os.path.basename(document.file_path)

        return os.path.join(self.nas_mount_path, year, month, doc_type_folder, filename)

    def sync_file(self, document: Document) -> Tuple[bool, str]:
        """
        Synchronise un fichier spécifique vers le NAS.

        Les fichiers sont organisés par année/mois/type :
        {nas_mount_path}/{année}/{mois}/{type}/{fichier}

        Args:
            document: Le document à synchroniser

        Returns:
            Tuple (succès, message)
        """
        if not self.is_configured():
            return False, "Synchronisation NAS non configurée"

        if not document.file_path or not os.path.exists(document.file_path):
            return False, f"Fichier source introuvable : {document.file_path}"

        try:
            # Construire le chemin de destination
            dest_path = self._get_destination_path(document)
            dest_dir = os.path.dirname(dest_path)

            # Créer les répertoires si nécessaire
            os.makedirs(dest_dir, exist_ok=True)

            # Copier le fichier
            shutil.copy2(document.file_path, dest_path)

            # Vérifier que la copie a réussi
            if not os.path.exists(dest_path):
                return False, "La copie a échoué (fichier non trouvé après copie)"

            # Mettre à jour le statut en BDD
            document.synced_to_nas = True
            document.synced_at = datetime.utcnow()
            self.db.commit()

            logger.info(f"Document {document.id} synchronisé vers {dest_path}")
            return True, f"Synchronisé vers {dest_path}"

        except PermissionError:
            return False, "Permission refusée sur le NAS"
        except OSError as e:
            logger.error(f"Erreur OS sync document {document.id}: {str(e)}")
            return False, f"Erreur système : {str(e)}"
        except Exception as e:
            logger.error(f"Erreur sync document {document.id}: {str(e)}")
            return False, f"Erreur : {str(e)}"

    def sync_all_pending(self, user_id: int) -> dict:
        """
        Synchronise tous les documents non synchronisés d'un utilisateur.

        Args:
            user_id: ID de l'utilisateur

        Returns:
            Dictionnaire avec les résultats :
            {
                "total": nombre total,
                "synced": nombre synchronisés,
                "failed": nombre échoués,
                "errors": liste des erreurs
            }
        """
        if not self.is_configured():
            return {
                "total": 0,
                "synced": 0,
                "failed": 0,
                "errors": ["Synchronisation NAS non configurée"]
            }

        # Récupérer les documents non synchronisés (avec un fichier)
        pending_docs = self.db.query(Document).filter(
            Document.user_id == user_id,
            Document.synced_to_nas == False,
            Document.file_path.isnot(None)
        ).all()

        results = {
            "total": len(pending_docs),
            "synced": 0,
            "failed": 0,
            "errors": []
        }

        for doc in pending_docs:
            success, message = self.sync_file(doc)
            if success:
                results["synced"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(f"Document {doc.id}: {message}")

        return results

    def get_sync_stats(self, user_id: int) -> dict:
        """
        Retourne les statistiques de synchronisation pour un utilisateur.

        Args:
            user_id: ID de l'utilisateur

        Returns:
            Dictionnaire avec les statistiques
        """
        total = self.db.query(Document).filter(
            Document.user_id == user_id,
            Document.file_path.isnot(None)
        ).count()

        synced = self.db.query(Document).filter(
            Document.user_id == user_id,
            Document.synced_to_nas == True
        ).count()

        pending = total - synced

        # Dernier sync
        last_synced = self.db.query(Document).filter(
            Document.user_id == user_id,
            Document.synced_to_nas == True
        ).order_by(Document.synced_at.desc()).first()

        return {
            "total_documents": total,
            "synced": synced,
            "pending": pending,
            "sync_percentage": round(synced / total * 100, 1) if total > 0 else 0,
            "last_sync": last_synced.synced_at.isoformat() if last_synced and last_synced.synced_at else None,
            "nas_configured": self.is_configured()
        }


def get_nas_sync_service(db: Session) -> NASSyncService:
    """Factory pour créer le service de synchronisation NAS."""
    return NASSyncService(db)
