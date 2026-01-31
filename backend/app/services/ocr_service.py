"""
Service OCR pour l'extraction de texte des documents.

Ce service fait appel à un microservice OCR externe (ocr-service)
pour extraire le texte des images et PDF.
"""

import os
import logging
from typing import Tuple, Optional
import httpx # Import the HTTP client

from app.core.config import get_settings # To get OCR service URL

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

settings = get_settings()

class OCRResult:
    """
    Résultat de l'extraction OCR.
    """
    def __init__(self, text: str, confidence: float, success: bool, error: Optional[str] = None):
        self.text = text
        self.confidence = confidence
        self.success = success
        self.error = error

class OCRService:
    """
    Client pour le microservice OCR externe.
    """
    def __init__(self):
        self.ocr_service_url = settings.ocr_service_url # Get URL from settings
        if not self.ocr_service_url:
            logger.error("OCR_SERVICE_URL is not configured in settings.")
            raise ValueError("OCR_SERVICE_URL must be configured.")
        logger.info(f"OCRService initialized with URL: {self.ocr_service_url}")

    async def extract_text(self, file_path: str) -> OCRResult:
        """
        Extrait le texte d'un fichier (image ou PDF) en faisant appel
        au microservice OCR externe.

        Args:
            file_path: Chemin absolu vers le fichier à analyser (doit être accessible au microservice)

        Returns:
            OCRResult contenant le texte, la confiance et le statut
        """
        try:
            # Send only the relative path within the uploads directory
            # The microservice will resolve it to its own mounted /app/uploads
            relative_file_path = os.path.basename(file_path)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ocr_service_url}/ocr",
                    json={"file_path": relative_file_path},
                    timeout=30.0 # Increase timeout for OCR processing
                )
                response.raise_for_status() # Raise an exception for HTTP errors
                
                ocr_data = response.json()
                extracted_text_lines = [item['text'] for item in ocr_data.get('extracted_text', [])]
                extracted_text = "\n".join(extracted_text_lines)
                
                # Calculate average confidence if available
                confidences = [item['confidence'] for item in ocr_data.get('extracted_text', []) if 'confidence' in item]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

                return OCRResult(
                    text=extracted_text,
                    confidence=round(avg_confidence, 2),
                    success=True
                )

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error calling OCR service: {e.response.status_code} - {e.response.text}")
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error=f"Erreur HTTP du service OCR: {e.response.status_code}"
            )
        except httpx.RequestError as e:
            logger.error(f"Network error calling OCR service: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error=f"Erreur réseau du service OCR: {e}"
            )
        except Exception as e:
            logger.error(f"Erreur inattendue lors de l'appel du service OCR: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                success=False,
                error=f"Erreur inattendue: {e}"
            )


# Instance singleton du service OCR
_ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    """
    Retourne l'instance singleton du client du service OCR.
    """
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service


async def extract_text_from_file(file_path: str) -> Tuple[str, float, Optional[str]]:
    """
    Fonction utilitaire pour extraire le texte d'un fichier via le microservice OCR.
    """
    service = get_ocr_service()
    result = await service.extract_text(file_path) # Await the async method

    return (
        result.text,
        result.confidence,
        result.error if not result.success else None
    )
