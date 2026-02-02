# Tags API

Base URL: `/api/v1/tags`

Tags allow flexible categorization of documents.

## Endpoints

### GET /

Lists all user tags.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Groceries",
    "color": "#22c55e",
    "icon": "shopping-cart",
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "name": "Transport",
    "color": "#3b82f6",
    "icon": "car",
    "created_at": "2024-01-15T10:31:00Z"
  }
]
```

---

### POST /

Creates a new tag.

**Request Body:**
```json
{
  "name": "Leisure",
  "color": "#f59e0b",
  "icon": "gamepad"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tag name (unique per user) |
| color | string | Yes | Hexadecimal color (#RRGGBB) |
| icon | string | No | Icon name (optional) |

**Response (201):**
```json
{
  "id": 3,
  "name": "Leisure",
  "color": "#f59e0b",
  "icon": "gamepad",
  "created_at": "2024-01-15T11:00:00Z"
}
```

**Errors:**

| Code | Description |
|------|-------------|
| 400 | Tag name already used |
| 422 | Invalid data |

---

### GET /{id}

Retrieves a tag by its ID.

**Response (200):**
```json
{
  "id": 1,
  "name": "Groceries",
  "color": "#22c55e",
  "icon": "shopping-cart",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### PUT /{id}

Updates a tag.

**Request Body:**
```json
{
  "name": "Food",
  "color": "#16a34a"
}
```

All fields are optional.

**Response (200):** Tag updated

---

### DELETE /{id}

Deletes a tag.

!!! warning "Warning"
    Deleting a tag removes it from all associated documents.
    Budgets linked to this tag are also deleted.

**Response (204):** No Content

---

## Suggested Colors

| Category | Color | Hex |
|-----------|---------|-----|
| Groceries | Green | `#22c55e` |
| Transport | Blue | `#3b82f6` |
| Housing | Purple | `#8b5cf6` |
| Leisure | Orange | `#f59e0b` |
| Health | Pink | `#ec4899` |
| Restaurant | Red | `#ef4444` |
| Travel | Cyan | `#06b6d4` |
| Income | Emerald | `#10b981` |

## Suggested Icons

Icons are optional and use names from [Lucide Icons](https://lucide.dev/).

| Category | Icon |
|-----------|-------|
| Groceries | `shopping-cart` |
| Transport | `car` |
| Housing | `home` |
| Leisure | `gamepad` |
| Health | `heart-pulse` |
| Restaurant | `utensils` |
| Travel | `plane` |
| Salary | `banknote` |
