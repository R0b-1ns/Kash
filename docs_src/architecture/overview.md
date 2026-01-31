# Vue d'ensemble de l'architecture

## Architecture globale

Finance Manager est une application web moderne avec une **architecture microservices** :

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

## Services Docker

| Service | Port | Image | Description |
|---------|------|-------|-------------|
| `frontend` | 3000 | Node 20 | Application React + Vite |
| `backend` | 8000 | Python 3.11 | API FastAPI |
| `postgres` | 5432 | postgres:15-alpine | Base de données |
| `ollama` | 11434 | ollama/ollama | Serveur LLM (Mistral) |
| `ocr-service` | 5001 | Python 3.11 | Microservice OCR (PaddleOCR) |

## Communication entre services

### Backend ↔ OCR Service

Le backend communique avec le microservice OCR via HTTP :

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

Le backend communique avec Ollama via son API REST :

```python
# backend/app/services/ai_service.py
response = await client.post(
    f"{self.host}/api/generate",
    json={"model": "mistral", "prompt": prompt}
)
```

### Backend ↔ NAS

La synchronisation utilise un montage SMB (pas de SSH/rsync) :

```python
# backend/app/services/nas_sync_service.py
# Simple copie de fichiers vers le montage SMB
shutil.copy2(document.file_path, dest_path)
```

## Flux de données

### Upload d'un document

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend
    participant OCR as OCR Service
    participant AI as Ollama
    participant D as PostgreSQL

    U->>F: Upload fichier
    F->>B: POST /documents/upload
    B->>D: Créer Document
    B->>OCR: POST /ocr (file_path)
    OCR-->>B: {text, confidence}
    B->>D: Sauvegarder texte OCR
    B->>AI: POST /api/generate (prompt + texte)
    AI-->>B: JSON structuré
    B->>D: Mettre à jour Document + créer Items
    B-->>F: Document complet
    F-->>U: Afficher résultat
```

### Synchronisation NAS

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant B as Backend
    participant NAS as Montage SMB

    U->>B: POST /sync/run
    B->>B: Récupérer documents non sync
    loop Pour chaque document
        B->>NAS: shutil.copy2(src, dest)
        Note over NAS: Structure: année/mois/type/
        B->>B: synced_to_nas = true
    end
    B-->>U: {synced: N, failed: M}
```

## Modèle de données

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
                              │ M:N
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

## Sécurité

### Authentification

- **JWT** (JSON Web Tokens) avec algorithme HS256
- Tokens valides 7 jours par défaut
- Stockage dans localStorage côté frontend

### Autorisation

- Chaque ressource est liée à un `user_id`
- Vérification systématique dans les routes
- Pas d'accès aux données d'autres utilisateurs

### Protection des données

- Mots de passe hashés avec **bcrypt**
- Validation des entrées avec **Pydantic**
- Échappement SQL avec **SQLAlchemy**

## Configuration

### Variables d'environnement

```bash
# Sécurité
SECRET_KEY=your-super-secret-key

# Base de données
DATABASE_URL=postgresql://finance:finance@postgres:5432/finance_db

# Services internes
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral
OCR_SERVICE_URL=http://ocr-service:5001

# NAS (montage SMB)
NAS_LOCAL_PATH=/Volumes/NAS/finance
NAS_MOUNT_PATH=/app/nas_backup
```
