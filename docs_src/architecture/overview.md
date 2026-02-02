# Architecture Overview

## Global Architecture

Finance Manager is a modern web application with a **microservices architecture**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                      React 18 + Vite                            │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │     │
│  │  │Dashboard│ │Documents│ │  Tags   │ │ Budgets │ │Settings │  │     │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │     │
│  │                           │                                     │     │
│  │                     ┌─────▼─────┐                              │     │
│  │                     │  API.ts   │  Axios + JWT                 │     │
│  │                     └───────────┘                              │     │
│  └──────────────────────────┬─────────────────────────────────────┘     │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ REST API (:3000 → :8000)
┌─────────────────────────────▼───────────────────────────────────────────┐
│                              BACKEND                                     │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                      FastAPI (:8000)                            │     │
│  │  ┌─────────────────────────────────────────────────────────┐   │     │
│  │  │                     Routes API                           │   │     │
│  │  │  /auth  /documents  /tags  /budgets  /stats  /sync      │   │     │
│  │  └────────────────────────┬────────────────────────────────┘   │     │
│  │                           │                                     │     │
│  │  ┌────────────────────────▼────────────────────────────────┐   │     │
│  │  │                      Services                            │   │     │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │     │
│  │  │  │OCR Client│ │AI Service│ │  Export  │ │ NAS Sync │   │   │     │
│  │  │  │  (HTTP)  │ │  (HTTP)  │ │   (CSV)  │ │  (SMB)   │   │   │     │
│  │  │  └────┬─────┘ └────┬─────┘ └──────────┘ └────┬─────┘   │   │     │
│  │  └───────┼────────────┼──────────────────────────┼─────────┘   │     │
│  └──────────┼────────────┼──────────────────────────┼─────────────┘     │
└─────────────┼────────────┼──────────────────────────┼───────────────────┘
              │            │                          │
              │ HTTP :5001 │ HTTP :11434              │ Copie fichiers
              ▼            ▼                          ▼
┌─────────────────┐ ┌─────────────────┐    ┌─────────────────────────────┐
│  OCR SERVICE    │ │     OLLAMA      │    │      STOCKAGE               │
│  ┌───────────┐  │ │  ┌───────────┐  │    │  ┌─────────┐ ┌───────────┐ │
│  │ PaddleOCR │  │ │  │  Mistral  │  │    │  │PostgreSQL│ │    NAS    │ │
│  │  (Flask)  │  │ │  │    7B     │  │    │  │   :5432  │ │  (SMB)    │ │
│  └───────────┘  │ │  └───────────┘  │    │  └─────────┘ └───────────┘ │
│     :5001       │ │     :11434      │    │                             │
└─────────────────┘ └─────────────────┘    └─────────────────────────────┘
```

## Docker Services

| Service | Port | Image | Description |
|---------|------|-------|-------------|
| `frontend` | 3000 | Node 20 | React + Vite Application |
| `backend` | 8000 | Python 3.11 | FastAPI API |
| `postgres` | 5432 | postgres:15-alpine | Database |
| `ollama` | 11434 | ollama/ollama | LLM Server (Mistral) |
| `ocr-service` | 5001 | Python 3.11 | OCR Microservice (PaddleOCR) |

## Inter-service Communication

### Backend ↔ OCR Service

The backend communicates with the OCR microservice via HTTP:

```python
# backend/app/services/ocr_service.py
async def extract_text(self, file_path: str) -> OCRResult:
    response = await client.post(
        f"{self.ocr_service_url}/ocr",
        json={"file_path": file_path}
    )
    return OCRResult(**response.json())
```

### Backend ↔ Ollama

The backend communicates with Ollama via its REST API:

```python
# backend/app/services/ai_service.py
response = await client.post(
    f"{self.host}/api/generate",
    json={"model": "mistral", "prompt": prompt}
)
```

### Backend ↔ NAS

Synchronization uses an SMB mount (no SSH/rsync):

```python
# backend/app/services/nas_sync_service.py
# Simple file copy to the SMB mount
shutil.copy2(document.file_path, dest_path)
```

## Data Flow

### Document Upload

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant OCR as OCR Service
    participant AI as Ollama
    participant D as PostgreSQL

    U->>F: Upload file
    F->>B: POST /documents/upload
    B->>D: Create Document
    B->>OCR: POST /ocr (file_path)
    OCR-->>B: {text, confidence}
    B->>D: Save OCR text
    B->>AI: POST /api/generate (prompt + text)
    AI-->>B: Structured JSON
    B->>D: Update Document + create Items
    B-->>F: Complete Document
    F-->>U: Display result
```

### NAS Synchronization

```mermaid
sequenceDiagram
    participant U as User
    participant B as Backend
    participant NAS as SMB Mount

    U->>B: POST /sync/run
    B->>B: Retrieve unsynced documents
    loop For each document
        B->>NAS: shutil.copy2(src, dest)
        Note over NAS: Structure: year/month/type/
        B->>B: synced_to_nas = true
    end
    B-->>U: {synced: N, failed: M}
```

## Data Model

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │   Document   │       │     Item     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │──┐    │ id           │──┐    │ id           │
│ email        │  │    │ user_id      │  │    │ document_id  │
│ password_hash│  └───>│ file_path    │  └───>│ name         │
│ name         │       │ date         │       │ quantity     │
│ created_at   │       │ merchant     │       │ unit_price   │
└──────────────┘       │ total_amount │       │ total_price  │
                       │ currency     │       │ category     │
                       │ is_income    │       └──────────────┘
                       │ ocr_raw_text │
                       │ ocr_confidence│
                       │ synced_to_nas│
                       └──────┬───────┘
                              │
                              │ Many-to-Many
                              ▼
┌──────────────┐       ┌──────────────┐
│     Tag      │<──────│ DocumentTag  │
├──────────────┤       ├──────────────┤
│ id           │       │ document_id  │
│ user_id      │       │ tag_id       │
│ name         │       └──────────────┘
│ color        │
│ icon         │       ┌──────────────┐
└──────────────┘       │    Budget    │
       │               ├──────────────┤
       └──────────────>│ id           │
                       │ user_id      │
                       │ tag_id       │
                       │ month        │
                       │ limit_amount │
                       └──────────────┘
```

## Security

### Authentication

- **JWT** (JSON Web Tokens) with HS256 algorithm
- Tokens valid for 7 days by default
- Stored in localStorage on the frontend

### Authorization

- Each resource is linked to a `user_id`
- Systematic verification in routes
- No access to other users' data

### Data Protection

- Passwords hashed with **bcrypt**
- Input validation with **Pydantic**
- SQL escaping with **SQLAlchemy**

## Configuration

### Environment Variables

```bash
# Security
SECRET_KEY=your-super-secret-key

# Database
DATABASE_URL=postgresql://finance:finance@postgres:5432/finance_db

# Internal Services
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral
OCR_SERVICE_URL=http://ocr-service:5001

# NAS (SMB mount)
NAS_LOCAL_PATH=/Volumes/NAS/finance
NAS_MOUNT_PATH=/app/nas_backup
```
