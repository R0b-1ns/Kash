"""
Service OCR pour l'extraction de texte des documents.

Ce service utilise PaddleOCR pour extraire le texte des images et PDF.
Il gère la conversion des PDF en images et retourne le texte brut
avec un score de confiance.

Formats supportés:
- Images: JPG, JPEG, PNG, GIF, WEBP
- Documents: PDF (converti en images page par page)
"""

import os
import logging
from typing import Tuple, Optional
from dataclasses import dataclass

from paddleocr import PaddleOCR
from pdf2image import convert_from_path

# Configuration du logging
logger = logging.getLogger(__name__)

# Extensions supportées
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
PDF_EXTENSIONS = {".pdf"}


@dataclass
class OCRResult:
    """
    Résultat de l'extraction OCR.

    Attributes:
        text: Le texte extrait du document
        confidence: Score de confiance moyen (0-100)
        success: Indique si l'extraction a réussi
        error: Message d'erreur en cas d'échec
    """
    text: str
    confidence: float
    success: bool
    error: Optional[str] = None


class OCRService:
    """
    Service d'extraction de texte par OCR.

    Utilise PaddleOCR pour l'extraction de texte multilingue
    avec détection automatique de l'orientation.
    """

    def __init__(self):
        """
        Initialise le service OCR avec PaddleOCR.

        Configuration:
        - use_angle_cls: Active la détection d'orientation du texte
        - lang: Français par défaut (supporte aussi l'anglais)
        - show_log: Désactive les logs verbeux de PaddleOCR
        """
        self._ocr = None

    @property
    def ocr(self) -> PaddleOCR:
        """
        Initialisation paresseuse de PaddleOCR.

        Le modèle est chargé à la première utilisation pour éviter
        de ralentir le démarrage de l'application.
        """
        if self._ocr is None:
            logger.info("Initialisation de PaddleOCR...")
            self._ocr = PaddleOCR(
                use_angle_cls=True,
                lang='fr',
                show_log=False,
                use_gpu=False  # GPU désactivé pour la compatibilité
            )
            logger.info("PaddleOCR initialisé avec succès")
        return self._ocr

    def extract_text(self, file_path: str) -> OCRResult:
        """
        Extrait le texte d'un fichier (image ou PDF).

        Cette méthode détecte automatiquement le type de fichier
        et utilise la méthode appropriée pour l'extraction.

        Args:
            file_path: Chemin absolu vers le fichier à analyser

        Returns:
            OCRResult contenant le texte, la confiance et le statut

        Example:
            >>> service = OCRService()
            >>> result = service.extract_text("/path/to/receipt.jpg")
            >>> if result.success:
            ...     print(f"Texte: {result.text}")
            ...     print(f"Confiance: {result.confidence}%")
        """
        # Vérifier que le fichier existe
        if not os.path.exists(file_path):
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error=f"Fichier non trouvé: {file_path}"
            )

        # Déterminer le type de fichier
        ext = os.path.splitext(file_path)[1].lower()

        try:
            if ext in IMAGE_EXTENSIONS:
                return self._extract_from_image(file_path)
            elif ext in PDF_EXTENSIONS:
                return self._extract_from_pdf(file_path)
            else:
                return OCRResult(
                    text="",
                    confidence=0.0,
                    success=False,
                    error=f"Format de fichier non supporté: {ext}"
                )
        except Exception as e:
            logger.error(f"Erreur OCR pour {file_path}: {str(e)}")
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error=f"Erreur lors de l'extraction OCR: {str(e)}"
            )

    def _extract_from_image(self, image_path: str) -> OCRResult:
        """
        Extrait le texte d'une image.

        Args:
            image_path: Chemin vers l'image

        Returns:
            OCRResult avec le texte extrait
        """
        logger.info(f"Extraction OCR de l'image: {image_path}")

        # Lancer l'OCR
        result = self.ocr.ocr(image_path, cls=True)

        # Parser les résultats
        return self._parse_ocr_result(result)

    def _extract_from_pdf(self, pdf_path: str) -> OCRResult:
        """
        Extrait le texte d'un fichier PDF.

        Le PDF est converti en images (une par page) puis chaque
        image est analysée par OCR. Les textes sont concaténés.

        Args:
            pdf_path: Chemin vers le fichier PDF

        Returns:
            OCRResult avec le texte de toutes les pages
        """
        logger.info(f"Extraction OCR du PDF: {pdf_path}")

        # Convertir le PDF en images
        try:
            images = convert_from_path(pdf_path, dpi=200)
        except Exception as e:
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error=f"Erreur de conversion PDF: {str(e)}"
            )

        if not images:
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error="Le PDF ne contient aucune page"
            )

        # Extraire le texte de chaque page
        all_texts = []
        all_confidences = []

        for i, image in enumerate(images):
            logger.debug(f"Traitement de la page {i + 1}/{len(images)}")

            # Convertir l'image PIL en tableau numpy pour PaddleOCR
            import numpy as np
            image_array = np.array(image)

            # Lancer l'OCR sur l'image
            result = self.ocr.ocr(image_array, cls=True)
            page_result = self._parse_ocr_result(result)

            if page_result.success and page_result.text:
                all_texts.append(f"--- Page {i + 1} ---\n{page_result.text}")
                all_confidences.append(page_result.confidence)

        # Combiner les résultats
        if not all_texts:
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error="Aucun texte extrait du PDF"
            )

        combined_text = "\n\n".join(all_texts)
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

        return OCRResult(
            text=combined_text,
            confidence=avg_confidence,
            success=True
        )

    def _parse_ocr_result(self, result) -> OCRResult:
        """
        Parse les résultats bruts de PaddleOCR.

        PaddleOCR retourne une liste de pages, chaque page contenant
        une liste de détections [[[x1,y1], [x2,y2], ...], (text, confidence)].

        Args:
            result: Résultat brut de PaddleOCR

        Returns:
            OCRResult avec texte formaté et confiance moyenne
        """
        if not result or not result[0]:
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error="Aucun texte détecté dans l'image"
            )

        lines = []
        confidences = []

        # Parcourir les détections (result[0] = première page)
        for detection in result[0]:
            if detection and len(detection) >= 2:
                text_info = detection[1]  # (text, confidence)
                if isinstance(text_info, tuple) and len(text_info) >= 2:
                    text = text_info[0]
                    confidence = text_info[1]
                    lines.append(text)
                    confidences.append(confidence * 100)  # Convertir en pourcentage

        if not lines:
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error="Aucun texte valide extrait"
            )

        # Joindre les lignes et calculer la confiance moyenne
        full_text = "\n".join(lines)
        avg_confidence = sum(confidences) / len(confidences)

        return OCRResult(
            text=full_text,
            confidence=round(avg_confidence, 2),
            success=True
        )


# Instance singleton du service OCR
_ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    """
    Retourne l'instance singleton du service OCR.

    Returns:
        L'instance unique d'OCRService
    """
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service


async def extract_text_from_file(file_path: str) -> Tuple[str, float, Optional[str]]:
    """
    Fonction utilitaire pour extraire le texte d'un fichier.

    Cette fonction est asynchrone mais l'OCR est synchrone.
    Elle permet une intégration plus facile avec FastAPI.

    Args:
        file_path: Chemin vers le fichier

    Returns:
        Tuple (texte, confiance, erreur ou None)

    Example:
        >>> text, confidence, error = await extract_text_from_file("/path/to/file.jpg")
        >>> if error:
        ...     print(f"Erreur: {error}")
        >>> else:
        ...     print(f"Texte extrait avec {confidence}% de confiance")
    """
    service = get_ocr_service()
    result = service.extract_text(file_path)

    return (
        result.text,
        result.confidence,
        result.error if not result.success else None
    )
