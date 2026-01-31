# API Statistiques

Base URL: `/api/v1/stats`

Endpoints pour récupérer les statistiques et données du dashboard.

## Endpoints

### GET /summary

Récupère le résumé financier d'un mois.

**Query Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| month | string | Mois cible (format: YYYY-MM, défaut: mois actuel) |

**Response (200):**
```json
{
  "month": "2024-01",
  "total_expenses": 1250.75,
  "total_income": 3500.00,
  "balance": 2249.25,
  "transaction_count": 42
}
```

| Champ | Description |
|-------|-------------|
| total_expenses | Somme des documents où is_income=false |
| total_income | Somme des documents où is_income=true |
| balance | total_income - total_expenses |
| transaction_count | Nombre total de documents |

---

### GET /by-tag

Récupère les dépenses groupées par tag.

**Query Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| month | string | Mois cible (format: YYYY-MM, défaut: mois actuel) |

**Response (200):**
```json
[
  {
    "tag_id": 1,
    "tag_name": "Courses",
    "tag_color": "#22c55e",
    "total_amount": 450.30,
    "transaction_count": 12,
    "percentage": 36.0
  },
  {
    "tag_id": 2,
    "tag_name": "Transport",
    "tag_color": "#3b82f6",
    "total_amount": 180.00,
    "transaction_count": 8,
    "percentage": 14.4
  },
  {
    "tag_id": null,
    "tag_name": "Non catégorisé",
    "tag_color": "#9ca3af",
    "total_amount": 620.45,
    "transaction_count": 22,
    "percentage": 49.6
  }
]
```

!!! note "Documents sans tag"
    Les documents sans tag sont regroupés sous "Non catégorisé" avec `tag_id: null`.

---

### GET /monthly

Récupère l'évolution des dépenses/revenus sur plusieurs mois.

**Query Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| months | int | Nombre de mois à récupérer (défaut: 12, max: 24) |

**Response (200):**
```json
[
  {
    "month": "2023-02",
    "expenses": 1100.50,
    "income": 3200.00
  },
  {
    "month": "2023-03",
    "expenses": 1350.25,
    "income": 3200.00
  },
  {
    "month": "2024-01",
    "expenses": 1250.75,
    "income": 3500.00
  }
]
```

Les données sont triées par mois croissant.

---

### GET /top-items

Récupère les articles les plus fréquemment achetés.

**Query Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| month | string | Mois cible (optionnel, tous les mois si omis) |
| limit | int | Nombre max de résultats (défaut: 10) |

**Response (200):**
```json
[
  {
    "name": "Pommes Golden",
    "total_quantity": 15.5,
    "total_spent": 46.35,
    "purchase_count": 8
  },
  {
    "name": "Baguette tradition",
    "total_quantity": 24.0,
    "total_spent": 28.80,
    "purchase_count": 24
  },
  {
    "name": "Lait demi-écrémé",
    "total_quantity": 12.0,
    "total_spent": 13.20,
    "purchase_count": 12
  }
]
```

| Champ | Description |
|-------|-------------|
| name | Nom de l'article |
| total_quantity | Quantité totale achetée |
| total_spent | Montant total dépensé |
| purchase_count | Nombre de fois acheté |

---

## Exemple d'utilisation pour le dashboard

```javascript
// Charger toutes les données du dashboard en parallèle
const [summary, byTag, monthly, topItems, budgets] = await Promise.all([
  stats.getSummary("2024-01"),
  stats.getByTag("2024-01"),
  stats.getMonthly(12),
  stats.getTopItems({ month: "2024-01", limit: 5 }),
  budgets.getCurrent("2024-01")
]);

// Afficher le résumé
console.log(`Solde: ${summary.balance}€`);

// Graphique camembert par tag
byTag.forEach(tag => {
  console.log(`${tag.tag_name}: ${tag.percentage}%`);
});

// Graphique d'évolution
monthly.forEach(month => {
  console.log(`${month.month}: +${month.income}€ / -${month.expenses}€`);
});
```
