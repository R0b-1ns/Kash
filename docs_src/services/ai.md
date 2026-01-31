# Service IA

Le service IA utilise **Ollama** avec le modèle **Mistral** pour analyser le texte OCR et extraire des données structurées.

## Fichier source

`backend/app/services/ai_service.py`

## Fonctionnalités

- Analyse du texte brut extrait par OCR
- Extraction structurée des informations
- Catégorisation automatique du type de document
- Identification des articles individuels

## Classes

### ExtractionResult

Résultat de l'extraction IA.

```python
@dataclass
class ExtractionResult:
    doc_type: str           # receipt, invoice, payslip, other
    date: date | None
    time: time | None
    merchant: str | None
    location: str | None
    items: list[ExtractedItem]
    total_amount: Decimal | None
    currency: str
    is_income: bool
    confidence: float
```

### ExtractedItem

Article extrait d'un document.

```python
@dataclass
class ExtractedItem:
    name: str
    quantity: Decimal
    unit: str | None
    unit_price: Decimal | None
    total_price: Decimal | None
    category: str | None
```

### AIService

Service principal d'analyse.

```python
class AIService:
    def __init__(self):
        """Initialise le client Ollama."""
        self.client = httpx.AsyncClient(
            base_url=settings.ollama_host,
            timeout=120.0
        )
        self.model = settings.ollama_model

    async def extract_structured_data(self, raw_text: str) -> ExtractionResult:
        """
        Analyse le texte OCR et extrait les données.

        Args:
            raw_text: Texte brut issu de l'OCR

        Returns:
            ExtractionResult avec toutes les données extraites
        """
```

## Prompt d'extraction

Le prompt utilisé pour l'extraction :

```
Tu es un assistant spécialisé dans l'analyse de documents financiers.
Analyse le texte suivant extrait par OCR d'un document et retourne les informations au format JSON.

Le JSON doit contenir :
- doc_type: "receipt" | "invoice" | "payslip" | "other"
- date: "YYYY-MM-DD" ou null
- time: "HH:MM:SS" ou null
- merchant: nom du commerce/entreprise ou null
- location: adresse/ville ou null
- items: liste d'articles [{ name, quantity, unit, unit_price, total_price, category }]
- total_amount: montant total ou null
- currency: code devise (EUR, USD...) défaut EUR
- is_income: true si c'est un revenu (salaire, remboursement...), false sinon

Texte à analyser :
{raw_text}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.
```

## Utilisation

```python
from app.services.ai_service import get_ai_service

# Obtenir une instance du service
ai = get_ai_service()

# Analyser du texte OCR
result = await ai.extract_structured_data("""
CARREFOUR
Paris 15e
15/01/2024 14:30

Pommes Golden 1.5kg    4.49
Baguette x2            2.40
Lait 1L                1.10

TOTAL                  7.99
CB ****1234
""")

print(f"Marchand: {result.merchant}")  # Carrefour
print(f"Total: {result.total_amount}")  # 7.99
print(f"Articles: {len(result.items)}")  # 3
```

## Configuration

### Variables d'environnement

```bash
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral
```

### Modèles supportés

| Modèle | Taille | Performance | Notes |
|--------|--------|-------------|-------|
| mistral | 4.1 GB | Excellent | Recommandé |
| llama2 | 3.8 GB | Bon | Alternative |
| phi | 1.6 GB | Correct | Léger |

## Gestion des erreurs

```python
try:
    result = await ai.extract_structured_data(text)
except httpx.ConnectError:
    # Ollama non accessible
except httpx.TimeoutException:
    # Timeout (>2 min)
except json.JSONDecodeError:
    # Réponse non-JSON du modèle
```

## Fallback

En cas d'échec de l'IA, le service retourne un résultat minimal :

```python
ExtractionResult(
    doc_type="other",
    items=[],
    currency="EUR",
    is_income=False,
    confidence=0.0
)
```

Le document est quand même créé avec le texte OCR brut, permettant une correction manuelle ultérieure.

## Performances

| Type de document | Temps moyen | Précision |
|------------------|-------------|-----------|
| Ticket simple | 3-5s | 90%+ |
| Facture complexe | 5-10s | 85%+ |
| Fiche de paie | 8-15s | 80%+ |

## Amélioration des résultats

### Prétraitement du texte

```python
def preprocess_ocr_text(text: str) -> str:
    """Nettoie le texte OCR avant analyse."""
    # Supprimer les lignes vides multiples
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Corriger les espaces multiples
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()
```

### Post-traitement

Après extraction, des validations sont appliquées :

- Dates impossibles corrigées (ex: 32/01 → null)
- Montants négatifs signalés
- Devises non reconnues → EUR par défaut
