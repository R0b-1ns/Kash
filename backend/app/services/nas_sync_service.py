"""
Service de synchronisation vers le NAS.

Synchronise les fichiers uploadés vers un NAS distant via rsync.
La synchronisation peut être :
- Manuelle : déclenchée par l'utilisateur
- Automatique : via un job planifié (cron)

Configuration requise :
- NAS_HOST : Adresse IP ou hostname du NAS
- NAS_USER : Utilisateur SSH sur le NAS
- NAS_PATH : Chemin de destination sur le NAS
- Clé SSH configurée pour l'authentification sans mot de passe
"""

import os
import subprocess
import logging
from datetime import datetime
from typing import Optional, List, Tuple

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

    Utilise rsync pour transférer les fichiers de manière incrémentale.
    Seuls les fichiers non synchronisés sont transférés.
    """

    def __init__(self, db: Session):
        """
        Initialise le service de synchronisation.

        Args:
            db: Session de base de données pour mettre à jour le statut
        """
        self.db = db
        self.nas_host = settings.nas_host
        self.nas_user = settings.nas_user
        self.nas_path = settings.nas_path
        self.upload_dir = settings.upload_dir

    def is_configured(self) -> bool:
        """
        Vérifie si la synchronisation NAS est configurée.

        Returns:
            True si tous les paramètres sont définis
        """
        return bool(self.nas_host and self.nas_user and self.nas_path)

    def get_config_status(self) -> dict:
        """
        Retourne le statut de la configuration.

        Returns:
            Dictionnaire avec le statut de chaque paramètre
        """
        return {
            "configured": self.is_configured(),
            "nas_host": bool(self.nas_host),
            "nas_user": bool(self.nas_user),
            "nas_path": bool(self.nas_path),
            "host": self.nas_host if self.nas_host else None,
            "path": self.nas_path if self.nas_path else None,
        }

    def test_connection(self) -> Tuple[bool, str]:
        """
        Teste la connexion SSH vers le NAS.

        Returns:
            Tuple (succès, message)
        """
        if not self.is_configured():
            return False, "Synchronisation NAS non configurée"

        try:
            # Test de connexion SSH simple
            result = subprocess.run(
                [
                    "ssh",
                    "-o", "BatchMode=yes",
                    "-o", "ConnectTimeout=10",
                    f"{self.nas_user}@{self.nas_host}",
                    "echo", "OK"
                ],
                capture_output=True,
                text=True,
                timeout=15
            )

            if result.returncode == 0:
                return True, "Connexion réussie"
            else:
                return False, f"Échec de connexion : {result.stderr}"

        except subprocess.TimeoutExpired:
            return False, "Timeout de connexion (15s)"
        except FileNotFoundError:
            return False, "SSH non disponible sur le système"
        except Exception as e:
            return False, f"Erreur : {str(e)}"

    def sync_file(self, document: Document) -> Tuple[bool, str]:
        """
        Synchronise un fichier spécifique vers le NAS.

        Args:
            document: Le document à synchroniser

        Returns:
            Tuple (succès, message)
        """
        if not self.is_configured():
            return False, "Synchronisation NAS non configurée"

        if not os.path.exists(document.file_path):
            return False, f"Fichier source introuvable : {document.file_path}"

        try:
            # Construire le chemin de destination
            # On conserve le nom unique généré pour éviter les conflits
            filename = os.path.basename(document.file_path)
            dest = f"{self.nas_user}@{self.nas_host}:{self.nas_path}/{filename}"

            # Exécuter rsync
            result = subprocess.run(
                [
                    "rsync",
                    "-avz",                    # Archive, verbose, compression
                    "--progress",              # Afficher la progression
                    "-e", "ssh -o BatchMode=yes -o ConnectTimeout=30",
                    document.file_path,
                    dest
                ],
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes max par fichier
            )

            if result.returncode == 0:
                # Mettre à jour le statut en BDD
                document.synced_to_nas = True
                document.synced_at = datetime.utcnow()
                self.db.commit()

                logger.info(f"Document {document.id} synchronisé vers {dest}")
                return True, f"Synchronisé vers {self.nas_host}"
            else:
                logger.error(f"Échec rsync pour document {document.id}: {result.stderr}")
                return False, f"Erreur rsync : {result.stderr}"

        except subprocess.TimeoutExpired:
            return False, "Timeout de synchronisation (5 min)"
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

        # Récupérer les documents non synchronisés
        pending_docs = self.db.query(Document).filter(
            Document.user_id == user_id,
            Document.synced_to_nas == False
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
            Document.user_id == user_id
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
