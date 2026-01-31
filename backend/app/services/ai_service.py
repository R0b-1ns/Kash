"""
Service IA pour l'extraction de données structurées.

Ce service utilise Ollama avec le modèle Mistral pour analyser
le texte extrait par OCR et retourner des données structurées
(type de document, date, marchand, articles, etc.).

Configuration:
- OLLAMA_HOST: URL du serveur Ollama (défaut: http://ollama:11434)
- OLLAMA_MODEL: Modèle à utiliser (défaut: mistral)
"""

import json
import logging
import re
from typing import Optional, List
from dataclasses import dataclass, field
from decimal import Decimal

import httpx

from app.core.config import get_settings

# Configuration du logging
logger = logging.getLogger(__name__)

# Timeout pour les appels à Ollama (les LLM peuvent être lents)
OLLAMA_TIMEOUT = 120.0  # 2 minutes


@dataclass
class ExtractedItem:
    """
    Un article extrait du document.

    Attributes:
        name: Nom de l'article
        quantity: Quantité (défaut: 1)
        unit_price: Prix unitaire
        total_price: Prix total de la ligne
    """
    name: str
    quantity: float = 1.0
    unit_price: Optional[float] = None
    total_price: Optional[float] = None


@dataclass
class ExtractionResult:
    """
    Résultat de l'extraction IA.

    Contient toutes les données structurées extraites du texte OCR.

    Attributes:
        doc_type: Type de document (receipt, invoice, payslip, other)
        date: Date au format YYYY-MM-DD
        time: Heure au format HH:MM
        merchant: Nom du marchand/entreprise
        location: Adresse/lieu
        items: Liste des articles
        total_amount: Montant total
        currency: Code devise (EUR, USD, etc.)
        is_income: True si c'est un revenu, False si c'est une dépense
        suggested_tags: Liste des noms de tags suggérés par l'IA
        success: Indique si l'extraction a réussi
        error: Message d'erreur en cas d'échec
        raw_response: Réponse brute du LLM (pour debug)
    """
    doc_type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    merchant: Optional[str] = None
    location: Optional[str] = None
    items: List[ExtractedItem] = field(default_factory=list)
    total_amount: Optional[float] = None
    currency: str = "EUR"
    is_income: bool = False
    suggested_tags: List[str] = field(default_factory=list)
    success: bool = False
    error: Optional[str] = None
    raw_response: Optional[str] = None


# Prompt système pour l'extraction de données
EXTRACTION_PROMPT_BASE = """Tu es un assistant spécialisé dans l'extraction de données de factures et tickets de caisse.

Analyse le texte suivant extrait par OCR d'un document financier et retourne UNIQUEMENT un objet JSON valide.

RÈGLES STRICTES:
- Retourne UNIQUEMENT le JSON, sans texte avant ou après
- PAS de commentaires (// ou /* */) dans le JSON
- PAS d'explications, PAS de texte additionnel
- Si une information n'est pas trouvée, utilise null
- Pour les montants, utilise le montant TTC (total avec taxes)
- Pour les quantités non spécifiées, utilise 1
- La devise par défaut est EUR si non spécifiée
- Un ticket de caisse ou une facture est généralement une dépense (is_income: false)
- Une fiche de paie est un revenu (is_income: true)
- Inclus TOUS les articles trouvés dans le document
- Pour suggested_tags, choisis parmi les tags disponibles ceux qui correspondent le mieux au document

Format JSON attendu (SANS commentaires):
{
    "doc_type": "receipt|invoice|payslip|other",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "merchant": "nom du marchand ou de l'entreprise",
    "location": "adresse complète si disponible",
    "items": [
        {
            "name": "nom de l'article",
            "quantity": 1,
            "unit_price": 0.00,
            "total_price": 0.00
        }
    ],
    "total_amount": 0.00,
    "currency": "EUR",
    "is_income": false,
    "suggested_tags": ["tag1", "tag2"]
}
"""


def build_extraction_prompt(ocr_text: str, available_tags: List[str] = None) -> str:
    """
    Construit le prompt complet avec les tags disponibles.
    """
    prompt = EXTRACTION_PROMPT_BASE

    if available_tags and len(available_tags) > 0:
        prompt += f"\nTags disponibles (choisis parmi ceux-ci uniquement): {', '.join(available_tags)}\n"
    else:
        prompt += "\nAucun tag disponible, laisse suggested_tags vide [].\n"

    prompt += f"\nTexte OCR à analyser:\n{ocr_text}"
    return prompt


class AIService:
    """
    Service d'extraction de données par IA.

    Utilise Ollama pour analyser le texte OCR et extraire
    des données structurées.
    """

    def __init__(self, host: Optional[str] = None, model: Optional[str] = None):
        """
        Initialise le service IA.

        Args:
            host: URL du serveur Ollama (défaut: depuis config)
            model: Nom du modèle à utiliser (défaut: depuis config)
        """
        settings = get_settings()
        self.host = host or settings.ollama_host
        self.model = model or settings.ollama_model
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """
        Retourne le client HTTP (avec initialisation paresseuse).

        Returns:
            Instance de httpx.AsyncClient configurée
        """
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=OLLAMA_TIMEOUT)
        return self._client

    async def close(self):
        """Ferme le client HTTP proprement."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def check_connection(self) -> bool:
        """
        Vérifie que Ollama est accessible.

        Returns:
            True si Ollama répond, False sinon
        """
        try:
            client = await self._get_client()
            response = await client.get(f"{self.host}/api/tags")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama non accessible: {e}")
            return False

    async def extract_data(self, ocr_text: str, available_tags: List[str] = None) -> ExtractionResult:
        """
        Extrait les données structurées du texte OCR.

        Envoie le texte au LLM avec un prompt spécialisé et parse
        la réponse JSON pour extraire les données.

        Args:
            ocr_text: Texte brut extrait par OCR
            available_tags: Liste des noms de tags disponibles pour suggestion

        Returns:
            ExtractionResult contenant les données extraites

        Example:
            >>> service = AIService()
            >>> result = await service.extract_data("CARREFOUR\\n01/01/2024\\nPain 1.20€", ["Courses", "Restaurant"])
            >>> print(f"Marchand: {result.merchant}")
            >>> print(f"Tags suggérés: {result.suggested_tags}")
        """
        if not ocr_text or not ocr_text.strip():
            return ExtractionResult(
                success=False,
                error="Texte OCR vide ou invalide"
            )

        # Construire le prompt complet avec les tags disponibles
        full_prompt = build_extraction_prompt(ocr_text, available_tags)

        try:
            # Appeler Ollama
            response_text = await self._call_ollama(full_prompt)

            if not response_text:
                return ExtractionResult(
                    success=False,
                    error="Réponse vide d'Ollama"
                )

            # Parser la réponse JSON
            return self._parse_response(response_text)

        except httpx.ConnectError:
            return ExtractionResult(
                success=False,
                error=f"Impossible de se connecter à Ollama ({self.host})"
            )
        except httpx.TimeoutException:
            return ExtractionResult(
                success=False,
                error="Timeout lors de l'appel à Ollama"
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'extraction IA: {str(e)}")
            return ExtractionResult(
                success=False,
                error=f"Erreur inattendue: {str(e)}"
            )

    async def _call_ollama(self, prompt: str) -> str:
        """
        Appelle l'API Ollama pour générer une réponse.

        Args:
            prompt: Le prompt complet à envoyer

        Returns:
            La réponse générée par le modèle
        """
        client = await self._get_client()

        # Payload pour l'API generate d'Ollama
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,  # Basse température pour plus de cohérence
                "num_predict": 2000,  # Limite de tokens générés
            }
        }

        logger.info(f"Appel Ollama ({self.model}) pour extraction...")

        response = await client.post(
            f"{self.host}/api/generate",
            json=payload
        )
        response.raise_for_status()

        data = response.json()
        raw_response = data.get("response", "")

        # Log de debug pour voir la réponse brute
        logger.debug(f"Réponse brute Ollama:\n{raw_response}")

        return raw_response

    def _parse_response(self, response_text: str) -> ExtractionResult:
        """
        Parse la réponse JSON du LLM.

        Gère les cas où le JSON est entouré de texte ou de
        blocs de code markdown.

        Args:
            response_text: Réponse brute du LLM

        Returns:
            ExtractionResult avec les données parsées
        """
        # Sauvegarder la réponse brute pour debug
        raw_response = response_text

        # Nettoyer la réponse (enlever les blocs de code markdown)
        cleaned = response_text.strip()

        # Chercher le JSON dans la réponse
        json_str = self._extract_json(cleaned)

        if not json_str:
            return ExtractionResult(
                success=False,
                error="Impossible d'extraire le JSON de la réponse",
                raw_response=raw_response
            )

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"JSON invalide. Erreur: {str(e)}")
            logger.error(f"JSON extrait:\n{json_str}")
            logger.error(f"Réponse brute complète:\n{raw_response}")
            return ExtractionResult(
                success=False,
                error=f"JSON invalide: {str(e)}",
                raw_response=raw_response
            )

        # Construire le résultat
        result = ExtractionResult(
            success=True,
            raw_response=raw_response
        )

        # Extraire les champs
        result.doc_type = self._safe_get(data, "doc_type", str)
        result.date = self._safe_get(data, "date", str)
        result.time = self._safe_get(data, "time", str)
        result.merchant = self._safe_get(data, "merchant", str)
        result.location = self._safe_get(data, "location", str)
        result.total_amount = self._safe_get(data, "total_amount", (int, float))
        result.currency = self._safe_get(data, "currency", str) or "EUR"
        result.is_income = self._safe_get(data, "is_income", bool) or False

        # Extraire les items
        items_data = data.get("items", [])
        if isinstance(items_data, list):
            for item_data in items_data:
                if isinstance(item_data, dict):
                    item = ExtractedItem(
                        name=self._safe_get(item_data, "name", str) or "Article inconnu",
                        quantity=self._safe_get(item_data, "quantity", (int, float)) or 1.0,
                        unit_price=self._safe_get(item_data, "unit_price", (int, float)),
                        total_price=self._safe_get(item_data, "total_price", (int, float))
                    )
                    result.items.append(item)

        # Extraire les tags suggérés
        suggested_tags = data.get("suggested_tags", [])
        if isinstance(suggested_tags, list):
            result.suggested_tags = [tag for tag in suggested_tags if isinstance(tag, str)]

        return result

    def _remove_comments(self, json_str: str) -> str:
        """
        Supprime les commentaires JavaScript d'un JSON.

        Args:
            json_str: JSON potentiellement avec commentaires

        Returns:
            JSON nettoyé sans commentaires
        """
        # Supprimer les commentaires // ... jusqu'à la fin de ligne
        json_str = re.sub(r'//[^\n]*', '', json_str)
        # Supprimer les commentaires /* ... */
        json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
        # Supprimer les virgules trailing avant ] ou }
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
        return json_str

    def _extract_json(self, text: str) -> Optional[str]:
        """
        Extrait le JSON d'une réponse potentiellement bruitée.

        Gère les cas:
        - JSON pur
        - JSON dans un bloc ```json ... ```
        - JSON mélangé avec du texte
        - JSON avec commentaires JavaScript

        Args:
            text: Texte contenant potentiellement du JSON

        Returns:
            La chaîne JSON ou None si non trouvée
        """
        # Cas 1: Bloc de code markdown
        code_block_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
        if code_block_match:
            json_str = code_block_match.group(1).strip()
            return self._remove_comments(json_str)

        # Cas 2: Trouver les accolades ouvrantes et fermantes
        start_idx = text.find('{')
        if start_idx == -1:
            return None

        # Trouver l'accolade fermante correspondante
        depth = 0
        end_idx = start_idx
        for i, char in enumerate(text[start_idx:], start_idx):
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    end_idx = i
                    break

        if depth != 0:
            return None

        json_str = text[start_idx:end_idx + 1]
        return self._remove_comments(json_str)

    def _safe_get(self, data: dict, key: str, expected_type) -> Optional:
        """
        Récupère une valeur du dictionnaire avec validation de type.

        Args:
            data: Dictionnaire source
            key: Clé à récupérer
            expected_type: Type ou tuple de types attendus

        Returns:
            La valeur si elle existe et est du bon type, None sinon
        """
        value = data.get(key)
        if value is None:
            return None
        if isinstance(expected_type, tuple):
            if isinstance(value, expected_type):
                return value
        else:
            if isinstance(value, expected_type):
                return value
        return None


# Instance singleton du service IA
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """
    Retourne l'instance singleton du service IA.

    Returns:
        L'instance unique d'AIService
    """
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service


async def extract_structured_data(ocr_text: str) -> ExtractionResult:
    """
    Fonction utilitaire pour extraire les données structurées.

    Args:
        ocr_text: Texte extrait par OCR

    Returns:
        ExtractionResult avec les données structurées

    Example:
        >>> result = await extract_structured_data("Mon texte OCR...")
        >>> if result.success:
        ...     print(f"Marchand: {result.merchant}")
    """
    service = get_ai_service()
    return await service.extract_data(ocr_text)
