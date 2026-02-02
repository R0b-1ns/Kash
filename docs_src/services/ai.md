# AI Service

The AI service uses **Ollama** with the **Mistral** model to analyze OCR text and extract structured data.

## Source File

`backend/app/services/ai_service.py`

## Features

- Analysis of raw text extracted by OCR
- Structured information extraction
- Automatic document type categorization
- Identification of individual items

## Classes

### ExtractionResult

AI extraction result.

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

Item extracted from a document.

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

Main analysis service.

```python
class AIService:
    def __init__(self):
        """Initializes the Ollama client."""
        self.client = httpx.AsyncClient(
            base_url=settings.ollama_host,
            timeout=120.0
        )
        self.model = settings.ollama_model

    async def extract_structured_data(self, raw_text: str) -> ExtractionResult:
        """
        Analyzes OCR text and extracts data.

        Args:
            raw_text: Raw text from OCR

        Returns:
            ExtractionResult with all extracted data
        """
```

## Extraction Prompt

The prompt used for extraction:

```
You are an assistant specialized in financial document analysis.
Analyze the following text extracted by OCR from a document and return the information in JSON format.

The JSON must contain:
- doc_type: "receipt" | "invoice" | "payslip" | "other"
- date: "YYYY-MM-DD" or null
- time: "HH:MM:SS" or null
- merchant: name of the business/company or null
- location: address/city or null
- items: list of items [{ name, quantity, unit, unit_price, total_price, category }]
- total_amount: total amount or null
- currency: currency code (EUR, USD...) default EUR
- is_income: true if it's income (salary, refund...), false otherwise

Text to analyze:
{raw_text}

Respond ONLY with the JSON, without text before or after.
```

## Usage

```python
from app.services.ai_service import get_ai_service

# Get a service instance
ai = get_ai_service()

# Analyze OCR text
result = await ai.extract_structured_data("""
CARREFOUR
Paris 15e
15/01/2024 14:30

Golden Apples 1.5kg    4.49
Baguette x2            2.40
Milk 1L                1.10

TOTAL                  7.99
CB ****1234
""")

print(f"Merchant: {result.merchant}")  # Carrefour
print(f"Total: {result.total_amount}")  # 7.99
print(f"Items: {len(result.items)}")  # 3
```

## Configuration

### Environment Variables

```bash
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral
```

### Supported Models

| Model | Size | Performance | Notes |
|--------|--------|-------------|-------|
| mistral | 4.1 GB | Excellent | Recommended |
| llama2 | 3.8 GB | Good | Alternative |
| phi | 1.6 GB | Correct | Lightweight |

## Error Handling

```python
try:
    result = await ai.extract_structured_data(text)
except httpx.ConnectError:
    # Ollama not accessible
except httpx.TimeoutException:
    # Timeout (>2 min)
except json.JSONDecodeError:
    # Non-JSON response from model
```

## Fallback

If AI fails, the service returns a minimal result:

```python
ExtractionResult(
    doc_type="other",
    items=[],
    currency="EUR",
    is_income=False,
    confidence=0.0
)
```

The document is still created with the raw OCR text, allowing for later manual correction.

## Performance

| Document Type | Average Time | Accuracy |
|------------------|-------------|-----------|
| Simple Receipt | 3-5s | 90%+ |
| Complex Invoice | 5-10s | 85%+ |
| Pay Stub | 8-15s | 80%+ |

## Improving Results

### Text Preprocessing

```python
def preprocess_ocr_text(text: str) -> str:
    """Cleans OCR text before analysis."""
    # Remove multiple empty lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Correct multiple spaces
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()
```

### Post-processing

After extraction, validations are applied:

- Impossible dates corrected (e.g., 32/01 → null)
- Negative amounts flagged
- Unrecognized currencies → EUR by default
