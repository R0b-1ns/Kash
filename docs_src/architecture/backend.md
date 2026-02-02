# Backend Architecture

## Folder Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI Entry Point
│   ├── core/                # Central Configuration
│   │   ├── config.py        # Environment Variables
│   │   ├── database.py      # PostgreSQL Connection
│   │   └── security.py      # JWT, bcrypt
│   ├── models/              # SQLAlchemy Models
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── item.py
│   │   ├── tag.py
│   │   ├── budget.py
│   │   └── currency.py
│   ├── schemas/             # Pydantic Schemas
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── item.py
│   │   ├── tag.py
│   │   ├── budget.py
│   │   └── currency.py
│   ├── api/
│   │   ├── deps.py          # Dependencies (get_db, get_current_user)
│   │   └── routes/          # API Endpoints
│   │       ├── auth.py
│   │       ├── documents.py
│   │       ├── tags.py
│   │       ├── budgets.py
│   │       ├── items.py
│   │       ├── stats.py
│   │       ├── currencies.py
│   │       ├── export.py
│   │       └── sync.py
│   └── services/            # Business Logic
│       ├── ocr_service.py
│       ├── ai_service.py
│       ├── document_processor.py
│       ├── export_service.py
│       ├── nas_sync_service.py
│       ├── currency_service.py
│       └── pdf_service.py     # New PDF Generation Service
├── alembic/                 # DB Migrations
│   └── versions/
│       └── 001_initial_schema.py
├── Dockerfile
└── requirements.txt
```

## Data Models

### User

```python
class User(Base):
    id: int                  # Primary Key
    email: str               # Unique Email
    password_hash: str       # Hashed Password (bcrypt)
    name: str | None         # Display Name
    created_at: datetime     # Creation Date
```

### Document

```python
class Document(Base):
    id: int
    user_id: int             # Owner

    # File
    file_path: str           # Path on server
    original_name: str       # Original filename
    file_type: str           # MIME type

    # Extraction
    doc_type: str            # receipt, invoice, payslip, other
    date: date
    time: time
    merchant: str
    location: str

    # Finance
    total_amount: Decimal
    currency: str            # ISO Code (EUR, USD...)
    is_income: bool

    # OCR
    ocr_raw_text: str        # Raw extracted text
    ocr_confidence: Decimal  # Confidence score (0-100)

    # Sync
    synced_to_nas: bool
    synced_at: datetime

    # Relationships
    items: List[Item]
    tags: List[Tag]
```

### Item (Articles)

```python
class Item(Base):
    id: int
    document_id: int

    name: str                # Item Name
    quantity: Decimal        # Quantity
    unit: str                # Unit (kg, L, piece...)
    unit_price: Decimal      # Unit Price
    total_price: Decimal     # Total Price
    category: str            # Item Category
```

## Services

### OCRService (HTTP Client)

HTTP Client to the **separate OCR microservice** (PaddleOCR in a dedicated container).

```python
class OCRService:
    async def extract_text(self, file_path: str) -> OCRResult:
        """
        Calls the OCR microservice via HTTP.

        The microservice is accessible at http://ocr-service:5001
        and uses PaddleOCR for extraction.

        Returns:
            OCRResult with raw text and confidence score
        """
        response = await self._client.post(
            f"{self.service_url}/ocr",
            json={"file_path": file_path}
        )
        return OCRResult(**response.json())
```

Supported formats:
- Images: JPG, JPEG, PNG, WEBP, BMP
- Documents: PDF (converted to images)

!!! note "Architecture"
    OCR is isolated in a separate microservice (`ocr_service/`) for:

    - Isolation of heavy dependencies (PaddleOCR, OpenCV)
    - Independent scalability
    - Separate memory management

### AIService

Text analysis and structured extraction.

```python
class AIService:
    async def extract_structured_data(self, raw_text: str) -> ExtractionResult:
        """
        Analyzes OCR text and extracts structured data.

        Uses Ollama/Mistral for analysis.

        Returns:
            ExtractionResult with all extracted information
        """
```

### DocumentProcessor

Complete processing pipeline.

```python
class DocumentProcessor:
    async def process(self, document_id: int) -> Document:
        """
        Complete pipeline:
        1. OCR → Text Extraction
        2. AI → Analysis and Structuring
        3. DB → Document + Items Update
        """
```

### PDFReportService

PDF report generation service with charts.

This service uses `ReportLab` for PDF document creation and `Matplotlib` for integrating charts.

```python
class PDFReportService:
    def __init__(self, db: Session, user_id: int):
        # ...
    
    def generate_monthly_report(self, year: int, month: int) -> bytes:
        # ...
    
    def generate_annual_report(self, year: int) -> bytes:
        # ...
    
    def export_chart(self, chart_type: str, params: dict) -> bytes:
        # ...
```

## API Routes

### Authentication (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/register` | Create account |
| POST   | `/login` | Log in |
| GET    | `/me` | User info |

### Documents (`/documents`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/` | List documents (with advanced search and filters) |
| POST   | `/upload` | Upload file |
| GET    | `/{id}` | Document details |
| PUT    | `/{id}` | Modify document |
| DELETE | `/{id}` | Delete document |
| POST   | `/{id}/reprocess` | Re-run OCR/AI |
| POST   | `/{id}/tags/{tag_id}` | Add tag |
| DELETE | `/{id}/tags/{tag_id}` | Remove tag |

### Tags (`/tags`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/` | List tags |
| POST   | `/` | Create tag |
| GET    | `/{id}` | Tag details |
| PUT    | `/{id}` | Modify tag |
| DELETE | `/{id}` | Delete tag |

### Budgets (`/budgets`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/` | List budgets |
| GET    | `/current` | Monthly budgets with spending |
| POST   | `/` | Create budget |
| PUT    | `/{id}` | Modify budget |
| DELETE | `/{id}` | Delete budget |

### Statistics (`/stats`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/summary` | Monthly summary |
| GET    | `/by-tag` | Spending by tag |
| GET    | `/monthly` | Monthly evolution |
| GET    | `/top-items` | Frequent items |

### Export (`/export`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/documents/csv` | Export documents CSV |
| GET    | `/monthly/csv` | Export monthly summary CSV |
| GET    | `/monthly/pdf` | Export monthly PDF report |
| GET    | `/annual/pdf` | Export annual PDF report |
| GET    | `/chart/{chart_type}` | Export chart PNG |

### Synchronization (`/sync`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/status` | Sync status |
| GET    | `/config` | NAS config |
| POST   | `/test` | Test connection |
| POST   | `/run` | Run sync |
| POST   | `/document/{id}` | Sync a document |

## Dependencies

```python
# DB Session Injection
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Retrieve user from JWT token
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    # Decode token
    # Retrieve user
    # Return or raise 401
```
