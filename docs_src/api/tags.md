# API Tags

Base URL: `/api/v1/tags`

Les tags permettent de catégoriser les documents de manière flexible.

## Endpoints

### GET /

Liste tous les tags de l'utilisateur.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Courses",
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

Crée un nouveau tag.

**Request Body:**
```json
{
  "name": "Loisirs",
  "color": "#f59e0b",
  "icon": "gamepad"
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| name | string | Oui | Nom du tag (unique par utilisateur) |
| color | string | Oui | Couleur hexadécimale (#RRGGBB) |
| icon | string | Non | Nom de l'icône (optionnel) |

**Response (201):**
```json
{
  "id": 3,
  "name": "Loisirs",
  "color": "#f59e0b",
  "icon": "gamepad",
  "created_at": "2024-01-15T11:00:00Z"
}
```

**Erreurs:**

| Code | Description |
|------|-------------|
| 400 | Nom de tag déjà utilisé |
| 422 | Données invalides |

---

### GET /{id}

Récupère un tag par son ID.

**Response (200):**
```json
{
  "id": 1,
  "name": "Courses",
  "color": "#22c55e",
  "icon": "shopping-cart",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### PUT /{id}

Met à jour un tag.

**Request Body:**
```json
{
  "name": "Alimentation",
  "color": "#16a34a"
}
```

Tous les champs sont optionnels.

**Response (200):** Tag mis à jour

---

### DELETE /{id}

Supprime un tag.

!!! warning "Attention"
    La suppression d'un tag le retire de tous les documents associés.
    Les budgets liés à ce tag sont également supprimés.

**Response (204):** No Content

---

## Couleurs suggérées

| Catégorie | Couleur | Hex |
|-----------|---------|-----|
| Courses | Vert | `#22c55e` |
| Transport | Bleu | `#3b82f6` |
| Logement | Violet | `#8b5cf6` |
| Loisirs | Orange | `#f59e0b` |
| Santé | Rose | `#ec4899` |
| Restaurant | Rouge | `#ef4444` |
| Voyage | Cyan | `#06b6d4` |
| Revenus | Émeraude | `#10b981` |

## Icônes suggérées

Les icônes sont optionnelles et utilisent les noms de [Lucide Icons](https://lucide.dev/).

| Catégorie | Icône |
|-----------|-------|
| Courses | `shopping-cart` |
| Transport | `car` |
| Logement | `home` |
| Loisirs | `gamepad` |
| Santé | `heart-pulse` |
| Restaurant | `utensils` |
| Voyage | `plane` |
| Salaire | `banknote` |
