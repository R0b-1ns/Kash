# Documents API

Base URL: `/api/v1/documents`

All endpoints require authentication (header `Authorization: Bearer <token>`).

## Endpoints

### GET /

Lists documents for the logged-in user.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Text search (merchant, location, filename) |
| ocr_search | string | Text search in raw OCR content |
| min_amount | float | Minimum total amount |
| max_amount | float | Maximum total amount |
| tag_ids | string | Comma-separated tag IDs |
| min_confidence | float | Minimum OCR confidence score (0-100) |
| skip | int | Offset for pagination (default: 0) |
| limit | int | Max number of items to return (default: 100) |
| start_date | date | Filter from this date |
| end_date | date | Filter up to this date |
| is_income | bool | Filter income/expenses |
| doc_type | string | Filter by type (receipt, invoice...) |

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
      {"id": 1, "name": "Groceries", "color": "#22c55e"}
    ]
  }
]
```

---

### POST /upload

Uploads a new document (image or PDF).

**Content-Type:** `multipart/form-data`

**Form Data:**

| Field | Type | Description |
|-------|------|-------------|
| file | File | File to upload (required) |

**Accepted Formats:** JPG, JPEG, PNG, WEBP, BMP, PDF

**Max size:** 50 MB

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
      "name": "Golden Apples",
      "quantity": 1.5,
      "unit": "kg",
      "unit_price": 2.99,
      "total_price": 4.49,
      "category": "Fruits"
    }
  ]
}
```

!!! note "Automatic Processing"
    Upload automatically triggers:
    1. OCR (text extraction)
    2. AI (data analysis and extraction)
    3. Item creation (articles)

---

### GET /{id}

Retrieves details of a document.

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

**Errors:**

| Code | Description |
|------|-------------|
| 404 | Document not found |

---

### PUT /{id}

Updates a document.

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

All fields are optional.

**Response (200):** Document updated

---

### DELETE /{id}

Deletes a document and its associated items.

**Response (204):** No Content

---

### POST /{id}/reprocess

Re-runs OCR/AI extraction on an existing document.

Useful if initial extraction failed or to re-analyze after AI model update.

**Response (200):** Document with new extracted data

---

### POST /{id}/tags/{tag_id}

Adds a tag to a document.

**Response (200):** Document with tag added

**Errors:**

| Code | Description |
|------|-------------|
| 404 | Document or tag not found |
| 400 | Tag already associated |

---

### DELETE /{id}/tags/{tag_id}

Removes a tag from a document.

**Response (200):** Document without the tag

---

## Example upload with cURL

```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/ticket.jpg"
```

## Example upload with JavaScript

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
