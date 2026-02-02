# API Documents

Base URL: `/api/v1/documents`

Tous les endpoints nécessitent une authentification (header `Authorization: Bearer <token>`).

## Endpoints

### GET /

Liste les documents de l'utilisateur connecté.

**Query Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| search | string | Recherche textuelle (marchand, lieu, nom du fichier) |
| ocr_search | string | Recherche textuelle dans le contenu OCR |
| min_amount | float | Montant total minimum |
| max_amount | float | Montant total maximum |
| tag_ids | string | IDs de tags séparés par des virgules |
| min_confidence | float | Score de confiance OCR minimum (0-100) |
| skip | int | Offset pour pagination (défaut: 0) |
| limit | int | Nombre max de résultats (défaut: 100) |
| start_date | date | Filtrer à partir de cette date |
| end_date | date | Filtrer jusqu'à cette date |
| is_income | bool | Filtrer revenus/dépenses |
| doc_type | string | Filtrer par type (receipt, invoice...) |

**Response (200):**
```json
[
  {
    "id": 1,
    "original_name": "ticket-carrefour.jpg",
    "doc_type": "receipt",
    "date": "2024-01-15",
    "merchant": "Carrefour",
    "total_amount": 45.67,
    "currency": "EUR",
    "is_income": false,
    "created_at": "2024-01-15T10:30:00Z",
    "tags": [
      {"id": 1, "name": "Courses", "color": "#22c55e"}
    ]
  }
]
```

---

### POST /upload

Upload un nouveau document (image ou PDF).

**Content-Type:** `multipart/form-data`

**Form Data:**

| Champ | Type | Description |
|-------|------|-------------|
| file | File | Fichier à uploader (obligatoire) |

**Formats acceptés:** JPG, JPEG, PNG, WEBP, BMP, PDF

**Taille max:** 50 Mo

**Response (201):**
```json
{
  "id": 1,
  "file_path": "/app/uploads/2024-01-15_abc123_ticket.jpg",
  "original_name": "ticket-carrefour.jpg",
  "file_type": "image/jpeg",
  "doc_type": "receipt",
  "date": "2024-01-15",
  "time": "14:30:00",
  "merchant": "Carrefour",
  "location": "Paris 15e",
  "total_amount": 45.67,
  "currency": "EUR",
  "is_income": false,
  "ocr_raw_text": "CARREFOUR\n...",
  "ocr_confidence": 92.5,
  "synced_to_nas": false,
  "tags": [],
  "items": [
    {
      "id": 1,
      "name": "Pommes Golden",
      "quantity": 1.5,
      "unit": "kg",
      "unit_price": 2.99,
      "total_price": 4.49,
      "category": "Fruits"
    }
  ]
}
```

!!! note "Traitement automatique"
    L'upload déclenche automatiquement :
    1. OCR (extraction du texte)
    2. IA (analyse et extraction des données)
    3. Création des items (articles)

---

### GET /{id}

Récupère le détail d'un document.

**Response (200):**
```json
{
  "id": 1,
  "file_path": "/app/uploads/2024-01-15_abc123_ticket.jpg",
  "original_name": "ticket-carrefour.jpg",
  "doc_type": "receipt",
  "date": "2024-01-15",
  "merchant": "Carrefour",
  "total_amount": 45.67,
  "currency": "EUR",
  "is_income": false,
  "ocr_raw_text": "CARREFOUR\nParis 15e...",
  "tags": [...],
  "items": [...]
}
```

**Erreurs:**

| Code | Description |
|------|-------------|
| 404 | Document non trouvé |

---

### PUT /{id}

Met à jour un document.

**Request Body:**
```json
{
  "doc_type": "invoice",
  "date": "2024-01-15",
  "merchant": "EDF",
  "total_amount": 120.50,
  "currency": "EUR",
  "is_income": false
}
```

Tous les champs sont optionnels.

**Response (200):** Document mis à jour

---

### DELETE /{id}

Supprime un document et ses items associés.

**Response (204):** No Content

---

### POST /{id}/reprocess

Relance l'extraction OCR/IA sur un document existant.

Utile si l'extraction initiale a échoué ou pour réanalyser après mise à jour du modèle IA.

**Response (200):** Document avec nouvelles données extraites

---

### POST /{id}/tags/{tag_id}

Ajoute un tag à un document.

**Response (200):** Document avec le tag ajouté

**Erreurs:**

| Code | Description |
|------|-------------|
| 404 | Document ou tag non trouvé |
| 400 | Tag déjà associé |

---

### DELETE /{id}/tags/{tag_id}

Retire un tag d'un document.

**Response (200):** Document sans le tag

---

## Exemple d'upload avec cURL

```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/ticket.jpg"
```

## Exemple d'upload avec JavaScript

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/v1/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const document = await response.json();
```
