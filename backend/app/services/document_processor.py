"""
Orchestrateur de traitement des documents.

Ce module coordonne le pipeline complet d'extraction:
1. OCR: Extraction du texte brut de l'image/PDF
2. IA: Analyse du texte pour extraire les données structurées
3. Persistance: Mise à jour du document et création des items en BDD

Utilisation:
    from app.services.document_processor import process_document
    await process_document(document_id, db)
"""

import logging
from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.item import Item
from app.models.tag import Tag
from app.services.ocr_service import get_ocr_service, OCRResult
from app.services.ai_service import get_ai_service, ExtractionResult

# Configuration du logging
logger = logging.getLogger(__name__)


class ProcessingError(Exception):
    """
    Exception levée lors d'une erreur de traitement.

    Attributes:
        message: Description de l'erreur
        step: Étape où l'erreur s'est produite (ocr, ai, save)
        recoverable: Indique si l'opération peut être réessayée
    """

    def __init__(self, message: str, step: str, recoverable: bool = True):
        super().__init__(message)
        self.message = message
        self.step = step
        self.recoverable = recoverable


class DocumentProcessor:
    """
    Orchestrateur du traitement des documents.

    Coordonne les services OCR et IA pour extraire les données
    d'un document et les persister en base de données.
    """

    def __init__(self):
        """Initialise le processeur avec les services OCR et IA."""
        self._ocr_service = None
        self._ai_service = None

    @property
    def ocr_service(self):
        """Accès paresseux au service OCR."""
        if self._ocr_service is None:
            self._ocr_service = get_ocr_service()
        return self._ocr_service

    @property
    def ai_service(self):
        """Accès paresseux au service IA."""
        if self._ai_service is None:
            self._ai_service = get_ai_service()
        return self._ai_service

    async def process(self, document_id: int, db: Session) -> Document:
        """
        Traite un document complet: OCR -> IA -> Sauvegarde.

        Args:
            document_id: ID du document à traiter
            db: Session SQLAlchemy

        Returns:
            Le document mis à jour avec les données extraites

        Raises:
            ProcessingError: Si une erreur survient pendant le traitement

        Example:
            >>> processor = DocumentProcessor()
            >>> document = await processor.process(123, db)
            >>> print(f"Marchand: {document.merchant}")
        """
        logger.info(f"Début du traitement du document {document_id}")

        # 1. Récupérer le document
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ProcessingError(
                f"Document {document_id} non trouvé",
                step="init",
                recoverable=False
            )

        # 2. Lancer l'OCR
        logger.info(f"OCR du fichier: {document.file_path}")
        ocr_result = await self.ocr_service.extract_text(document.file_path)

        if not ocr_result.success:
            logger.error(f"Échec OCR: {ocr_result.error}")
            # Sauvegarder l'erreur mais continuer
            document.ocr_raw_text = f"[ERREUR OCR] {ocr_result.error}"
            document.ocr_confidence = Decimal("0.00")
            db.commit()
            raise ProcessingError(
                ocr_result.error or "Erreur OCR inconnue",
                step="ocr",
                recoverable=True
            )

        # Sauvegarder le texte OCR brut et la confiance
        document.ocr_raw_text = ocr_result.text
        document.ocr_confidence = Decimal(str(round(ocr_result.confidence, 2)))
        db.commit()

        logger.info(f"OCR réussi - Confiance: {ocr_result.confidence}%")

        # 3. Récupérer les tags disponibles de l'utilisateur
        user_tags = db.query(Tag).filter(Tag.user_id == document.user_id).all()
        available_tag_names = [tag.name for tag in user_tags]
        logger.info(f"Tags disponibles pour suggestion: {available_tag_names}")

        # 4. Extraction IA des données structurées
        logger.info("Extraction IA des données structurées...")
        ai_result = await self.ai_service.extract_data(ocr_result.text, available_tag_names)

        if not ai_result.success:
            logger.error(f"Échec extraction IA: {ai_result.error}")
            raise ProcessingError(
                ai_result.error or "Erreur IA inconnue",
                step="ai",
                recoverable=True
            )

        # 5. Mettre à jour le document avec les données extraites
        self._update_document(document, ai_result)

        # 5b. Fallback: si aucune date n'a été extraite, utiliser created_at
        if document.date is None and document.created_at:
            document.date = document.created_at.date()
            logger.info(f"Aucune date extraite, utilisation de created_at: {document.date}")

        db.commit()

        # 6. Créer les items associés
        self._create_items(document, ai_result, db)
        db.commit()

        # 7. Associer les tags suggérés par l'IA
        self._assign_suggested_tags(document, ai_result, user_tags, db)
        db.commit()

        # Rafraîchir pour avoir les relations
        db.refresh(document)

        logger.info(f"Traitement terminé pour le document {document_id}")
        return document

    def _update_document(self, document: Document, ai_result: ExtractionResult):
        """
        Met à jour le document avec les données extraites par l'IA.

        Args:
            document: Le document à mettre à jour
            ai_result: Les données extraites
        """
        # Type de document
        if ai_result.doc_type:
            valid_types = {"receipt", "invoice", "payslip", "other"}
            if ai_result.doc_type.lower() in valid_types:
                document.doc_type = ai_result.doc_type.lower()

        # Date
        if ai_result.date:
            parsed_date = self._parse_date(ai_result.date)
            if parsed_date:
                document.date = parsed_date

        # Heure
        if ai_result.time:
            parsed_time = self._parse_time(ai_result.time)
            if parsed_time:
                document.time = parsed_time

        # Marchand
        if ai_result.merchant:
            document.merchant = ai_result.merchant[:255]  # Limite de la colonne

        # Lieu
        if ai_result.location:
            document.location = ai_result.location[:255]

        # Montant total
        if ai_result.total_amount is not None:
            document.total_amount = Decimal(str(ai_result.total_amount))

        # Devise
        if ai_result.currency:
            document.currency = ai_result.currency[:3].upper()

        # Type de transaction (revenu/dépense)
        document.is_income = ai_result.is_income

    def _create_items(self, document: Document, ai_result: ExtractionResult, db: Session):
        """
        Crée les items (articles) associés au document.

        Supprime d'abord les items existants pour permettre le retraitement.

        Args:
            document: Le document parent
            ai_result: Les données extraites contenant les items
            db: Session SQLAlchemy
        """
        # Supprimer les items existants (pour le retraitement)
        db.query(Item).filter(Item.document_id == document.id).delete()

        if not ai_result.items:
            logger.debug("Aucun item à créer")
            return

        for extracted_item in ai_result.items:
            item = Item(
                document_id=document.id,
                name=extracted_item.name[:255] if extracted_item.name else "Article inconnu",
                quantity=Decimal(str(extracted_item.quantity or 1)),
                unit_price=Decimal(str(extracted_item.unit_price)) if extracted_item.unit_price else None,
                total_price=Decimal(str(extracted_item.total_price)) if extracted_item.total_price else None
            )
            db.add(item)

        logger.info(f"Créé {len(ai_result.items)} items pour le document {document.id}")

    def _assign_suggested_tags(self, document: Document, ai_result: ExtractionResult, user_tags: list, db: Session):
        """
        Associe les tags suggérés par l'IA au document.

        Args:
            document: Le document à tagger
            ai_result: Les données extraites contenant les tags suggérés
            user_tags: Liste des objets Tag de l'utilisateur
            db: Session SQLAlchemy
        """
        if not ai_result.suggested_tags:
            logger.debug("Aucun tag suggéré par l'IA")
            return

        # Créer un mapping nom -> Tag pour recherche rapide (insensible à la casse)
        tag_map = {tag.name.lower(): tag for tag in user_tags}

        tags_to_add = []
        for suggested_name in ai_result.suggested_tags:
            tag = tag_map.get(suggested_name.lower())
            if tag:
                tags_to_add.append(tag)
            else:
                logger.debug(f"Tag suggéré '{suggested_name}' non trouvé dans les tags utilisateur")

        if tags_to_add:
            # Ajouter les tags au document (évite les doublons)
            for tag in tags_to_add:
                if tag not in document.tags:
                    document.tags.append(tag)
            logger.info(f"Associé {len(tags_to_add)} tags au document {document.id}: {[t.name for t in tags_to_add]}")

    def _parse_date(self, date_str: str) -> Optional[date]:
        """
        Parse une date depuis différents formats.

        Formats supportés:
        - YYYY-MM-DD (standard)
        - DD/MM/YYYY (français)
        - DD-MM-YYYY
        - DD.MM.YYYY

        Args:
            date_str: La date en chaîne de caractères

        Returns:
            L'objet date ou None si le parsing échoue
        """
        if not date_str:
            return None

        formats = [
            "%Y-%m-%d",  # 2024-01-15
            "%d/%m/%Y",  # 15/01/2024
            "%d-%m-%Y",  # 15-01-2024
            "%d.%m.%Y",  # 15.01.2024
            "%Y/%m/%d",  # 2024/01/15
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue

        logger.warning(f"Format de date non reconnu: {date_str}")
        return None

    def _parse_time(self, time_str: str) -> Optional[time]:
        """
        Parse une heure depuis différents formats.

        Formats supportés:
        - HH:MM
        - HH:MM:SS
        - HHhMM

        Args:
            time_str: L'heure en chaîne de caractères

        Returns:
            L'objet time ou None si le parsing échoue
        """
        if not time_str:
            return None

        formats = [
            "%H:%M",     # 14:30
            "%H:%M:%S",  # 14:30:00
            "%Hh%M",     # 14h30
        ]

        for fmt in formats:
            try:
                return datetime.strptime(time_str.strip(), fmt).time()
            except ValueError:
                continue

        logger.warning(f"Format d'heure non reconnu: {time_str}")
        return None


# Instance singleton du processeur
_processor: Optional[DocumentProcessor] = None


def get_document_processor() -> DocumentProcessor:
    """
    Retourne l'instance singleton du processeur de documents.

    Returns:
        L'instance unique de DocumentProcessor
    """
    global _processor
    if _processor is None:
        _processor = DocumentProcessor()
    return _processor


async def process_document(document_id: int, db: Session) -> Document:
    """
    Fonction utilitaire pour traiter un document.

    Pipeline complet:
    1. Récupération du document en BDD
    2. Extraction OCR du texte
    3. Analyse IA pour extraire les données structurées
    4. Mise à jour du document en BDD
    5. Création des items (articles)

    Args:
        document_id: ID du document à traiter
        db: Session SQLAlchemy

    Returns:
        Le document mis à jour avec toutes les données extraites

    Raises:
        ProcessingError: Si une erreur critique survient

    Example:
        >>> from app.services.document_processor import process_document
        >>> document = await process_document(123, db)
        >>> print(f"Type: {document.doc_type}")
        >>> print(f"Total: {document.total_amount} {document.currency}")
    """
    processor = get_document_processor()
    return await processor.process(document_id, db)


async def reprocess_document(document_id: int, db: Session) -> Document:
    """
    Relance le traitement complet d'un document.

    Identique à process_document mais avec un logging explicite
    indiquant qu'il s'agit d'un retraitement.

    Args:
        document_id: ID du document à retraiter
        db: Session SQLAlchemy

    Returns:
        Le document mis à jour

    Raises:
        ProcessingError: Si une erreur critique survient
    """
    logger.info(f"Retraitement demandé pour le document {document_id}")
    return await process_document(document_id, db)
