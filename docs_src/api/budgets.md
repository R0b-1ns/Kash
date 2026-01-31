# API Budgets

Base URL: `/api/v1/budgets`

Les budgets permettent de définir des limites de dépenses mensuelles par catégorie (tag).

## Endpoints

### GET /

Liste tous les budgets.

**Query Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| month | string | Filtrer par mois (format: YYYY-MM) |

**Response (200):**
```json
[
  {
    "id": 1,
    "tag_id": 1,
    "month": "2024-01",
    "limit_amount": 500.00,
    "currency": "EUR",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "tag": {
      "id": 1,
      "name": "Courses",
      "color": "#22c55e"
    }
  }
]
```

---

### GET /current

Récupère les budgets du mois avec les dépenses calculées.

C'est l'endpoint principal pour le dashboard et la page budgets.

**Query Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| month | string | Mois cible (format: YYYY-MM, défaut: mois actuel) |

**Response (200):**
```json
[
  {
    "id": 1,
    "tag_id": 1,
    "tag_name": "Courses",
    "tag_color": "#22c55e",
    "month": "2024-01",
    "limit_amount": 500.00,
    "currency": "EUR",
    "spent_amount": 325.50,
    "remaining_amount": 174.50,
    "percentage_used": 65.1
  },
  {
    "id": 2,
    "tag_id": 2,
    "tag_name": "Transport",
    "tag_color": "#3b82f6",
    "month": "2024-01",
    "limit_amount": 150.00,
    "currency": "EUR",
    "spent_amount": 180.00,
    "remaining_amount": -30.00,
    "percentage_used": 120.0
  }
]
```

!!! note "Calcul des dépenses"
    `spent_amount` est calculé en temps réel à partir des documents du mois ayant le tag correspondant.

---

### POST /

Crée un nouveau budget.

**Request Body:**
```json
{
  "tag_id": 1,
  "month": "2024-01",
  "limit_amount": 500.00,
  "currency": "EUR"
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| tag_id | int | Oui | ID du tag associé |
| month | string | Oui | Mois (format: YYYY-MM) |
| limit_amount | number | Oui | Limite de dépenses |
| currency | string | Non | Devise (défaut: EUR) |

**Response (201):**
```json
{
  "id": 1,
  "tag_id": 1,
  "month": "2024-01",
  "limit_amount": 500.00,
  "currency": "EUR",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Erreurs:**

| Code | Description |
|------|-------------|
| 400 | Budget déjà existant pour ce tag/mois |
| 404 | Tag non trouvé |

---

### PUT /{id}

Met à jour un budget.

**Request Body:**
```json
{
  "limit_amount": 600.00
}
```

| Champ | Type | Description |
|-------|------|-------------|
| limit_amount | number | Nouvelle limite |
| currency | string | Nouvelle devise |

**Response (200):** Budget mis à jour

---

### DELETE /{id}

Supprime un budget.

**Response (204):** No Content

---

## Indicateurs visuels

Le pourcentage d'utilisation détermine la couleur de l'indicateur :

| Pourcentage | Couleur | Signification |
|-------------|---------|---------------|
| 0-50% | Vert (`#22c55e`) | Confortable |
| 50-75% | Jaune (`#eab308`) | À surveiller |
| 75-90% | Orange (`#f97316`) | Attention |
| 90%+ | Rouge (`#ef4444`) | Limite proche/dépassée |

## Exemple d'utilisation

### Créer des budgets pour le mois

```javascript
// Créer un budget courses
await budgets.create({
  tag_id: 1, // ID du tag "Courses"
  month: "2024-01",
  limit_amount: 500
});

// Créer un budget transport
await budgets.create({
  tag_id: 2, // ID du tag "Transport"
  month: "2024-01",
  limit_amount: 150
});
```

### Afficher la progression

```javascript
const current = await budgets.getCurrent("2024-01");

current.forEach(budget => {
  console.log(`${budget.tag_name}: ${budget.percentage_used}%`);
  if (budget.percentage_used > 100) {
    console.log("⚠️ Budget dépassé !");
  }
});
```
