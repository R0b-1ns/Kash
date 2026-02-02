# Architecture Backend

## Structure des dossiers

```
backend/
├── app/
│   ├── main.py              # Point d'entrée FastAPI
│   ├── core/                # Configuration centrale
│   │   ├── config.py        # Variables d'environnement
│   │   ├── database.py      # Connexion PostgreSQL
│   │   └── security.py      # JWT, bcrypt
│   ├── models/              # Modèles SQLAlchemy
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── item.py
│   │   ├── tag.py
│   │   ├── budget.py
│   │   └── currency.py
│   ├── schemas/             # Schémas Pydantic
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── item.py
│   │   ├── tag.py
│   │   ├── budget.py
│   │   └── currency.py
│   ├── api/
│   │   ├── deps.py          # Dépendances (get_db, get_current_user)
│   │   └── routes/          # Endpoints API
│   │       ├── auth.py
│   │       ├── documents.py
│   │       ├── tags.py
│   │       ├── budgets.py
│   │       ├── items.py
│   │       ├── stats.py
│   │       ├── currencies.py
│   │       ├── export.py
│   │       └── sync.py
│   └── services/            # Logique métier
│       ├── ocr_service.py
│       ├── ai_service.py
│       ├── document_processor.py
│       ├── export_service.py
│       ├── nas_sync_service.py
│       └── currency_service.py
├── alembic/                 # Migrations BDD
│   └── versions/
│       └── 001_initial_schema.py
├── Dockerfile
└── requirements.txt
```

## Modèles de données

### User

```python
class User(Base):
    id: int                  # Clé primaire
    email: str               # Email unique
    password_hash: str       # Mot de passe hashé (bcrypt)
    name: str | None         # Nom affiché
    created_at: datetime     # Date de création
```

### Document

```python
class Document(Base):
    id: int
    user_id: int             # Propriétaire

    # Fichier
    file_path: str           # Chemin sur le serveur
    original_name: str       # Nom original
    file_type: str           # MIME type

    # Extraction
    doc_type: str            # receipt, invoice, payslip, other
    date: date
    time: time
    merchant: str
    location: str

    # Finances
    total_amount: Decimal
    currency: str            # Code ISO (EUR, USD...)
    is_income: bool

    # OCR
    ocr_raw_text: str        # Texte brut extrait
    ocr_confidence: Decimal  # Score de confiance (0-100)

    # Sync
    synced_to_nas: bool
    synced_at: datetime

    # Relations
    items: List[Item]
    tags: List[Tag]
```

### Item (Articles)

```python
class Item(Base):
    id: int
    document_id: int

    name: str                # Nom de l'article
    quantity: Decimal        # Quantité
    unit: str                # Unité (kg, L, pièce...)
    unit_price: Decimal      # Prix unitaire
    total_price: Decimal     # Prix total
    category: str            # Catégorie de l'article
```

## Services

### OCRService (Client HTTP)

Client HTTP vers le **microservice OCR** séparé (PaddleOCR dans un container dédié).

```python
class OCRService:
    async def extract_text(self, file_path: str) -> OCRResult:
        """
        Appelle le microservice OCR via HTTP.

        Le microservice est accessible sur http://ocr-service:5001
        et utilise PaddleOCR pour l'extraction.

        Retourne:
            OCRResult avec texte brut et score de confiance
        """
        response = await self._client.post(
            f"{self.service_url}/ocr",
            json={"file_path": file_path}
        )
        return OCRResult(**response.json())
```

Formats supportés :
- Images : JPG, JPEG, PNG, WEBP, BMP
- Documents : PDF (converti en images)

!!! note "Architecture"
    L'OCR est isolé dans un microservice séparé (`ocr_service/`) pour :

    - Isolation des dépendances lourdes (PaddleOCR, OpenCV)
    - Scalabilité indépendante
    - Gestion mémoire séparée

### AIService

Analyse du texte et extraction structurée.

```python
class AIService:
    async def extract_structured_data(self, raw_text: str) -> ExtractionResult:
        """
        Analyse le texte OCR et extrait les données structurées.

        Utilise Ollama/Mistral pour l'analyse.

        Retourne:
            ExtractionResult avec toutes les informations extraites
        """
```

### DocumentProcessor

Pipeline complet de traitement.

```python
class DocumentProcessor:
    async def process(self, document_id: int) -> Document:
        """
        Pipeline complet:
        1. OCR → Extraction texte
        2. IA → Analyse et structuration
        3. BDD → Mise à jour Document + Items
        """
```

## Routes API

### Authentification (`/auth`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/register` | Créer un compte |
| POST | `/login` | Se connecter |
| GET | `/me` | Infos utilisateur |

### Documents (`/documents`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste documents (avec recherche avancée et filtres) |
| POST | `/upload` | Upload fichier |
| GET | `/{id}` | Détail document |
| PUT | `/{id}` | Modifier document |
| DELETE | `/{id}` | Supprimer document |
| POST | `/{id}/reprocess` | Relancer OCR/IA |
| POST | `/{id}/tags/{tag_id}` | Ajouter tag |
| DELETE | `/{id}/tags/{tag_id}` | Retirer tag |

### Tags (`/tags`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste tags |
| POST | `/` | Créer tag |
| GET | `/{id}` | Détail tag |
| PUT | `/{id}` | Modifier tag |
| DELETE | `/{id}` | Supprimer tag |

### Budgets (`/budgets`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste budgets |
| GET | `/current` | Budgets du mois avec dépenses |
| POST | `/` | Créer budget |
| PUT | `/{id}` | Modifier budget |
| DELETE | `/{id}` | Supprimer budget |

### Statistiques (`/stats`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/summary` | Résumé du mois |
| GET | `/by-tag` | Dépenses par tag |
| GET | `/monthly` | Évolution mensuelle |
| GET | `/top-items` | Articles fréquents |

### Export (`/export`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/documents/csv` | Export CSV documents |
| GET | `/monthly/csv` | Export résumé mensuel |

### Synchronisation (`/sync`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/status` | Statut synchronisation |
| GET | `/config` | Config NAS |
| POST | `/test` | Tester connexion |
| POST | `/run` | Lancer sync |
| POST | `/document/{id}` | Sync un document |

## Dépendances

```python
# Injection de la session BDD
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Récupération de l'utilisateur depuis le token JWT
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    # Décode le token
    # Récupère l'utilisateur
    # Retourne ou lève 401
```
