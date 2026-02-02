# Statistics API

Base URL: `/api/v1/stats`

Endpoints for retrieving statistics and dashboard data.

## Endpoints

### GET /summary

Retrieves the financial summary for a month.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| month | string | Target month (format: YYYY-MM, default: current month) |

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

| Field | Description |
|-------|-------------|
| total_expenses | Sum of documents where is_income=false |
| total_income | Sum of documents where is_income=true |
| balance | total_income - total_expenses |
| transaction_count | Total number of documents |

---

### GET /by-tag

Retrieves expenses grouped by tag.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| month | string | Target month (format: YYYY-MM, default: current month) |

**Response (200):**
```json
[
  {
    "tag_id": 1,
    "tag_name": "Groceries",
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
    "tag_name": "Uncategorized",
    "tag_color": "#9ca3af",
    "total_amount": 620.45,
    "transaction_count": 22,
    "percentage": 49.6
  }
]
```

!!! note "Untagged Documents"
    Documents without tags are grouped under "Uncategorized" with `tag_id: null`.

---

### GET /monthly

Retrieves expenses/income evolution over several months.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| months | int | Number of months to retrieve (default: 12, max: 24) |

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

Data is sorted by ascending month.

---

### GET /top-items

Retrieves the most frequently purchased items.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| month | string | Target month (optional, all months if omitted) |
| limit | int | Max number of results (default: 10) |

**Response (200):**
```json
[
  {
    "name": "Golden Apples",
    "total_quantity": 15.5,
    "total_spent": 46.35,
    "purchase_count": 8
  },
  {
    "name": "Traditional Baguette",
    "total_quantity": 24.0,
    "total_spent": 28.80,
    "purchase_count": 24
  },
  {
    "name": "Semi-skimmed Milk",
    "total_quantity": 12.0,
    "total_spent": 13.20,
    "purchase_count": 12
  }
]
```

| Field | Description |
|-------|-------------|
| name | Item name |
| total_quantity | Total quantity purchased |
| total_spent | Total amount spent |
| purchase_count | Number of times purchased |

---

## Example usage for the dashboard

```javascript
// Load all dashboard data in parallel
const [summary, byTag, monthly, topItems, budgets] = await Promise.all([
  stats.getSummary("2024-01"),
  stats.getByTag("2024-01"),
  stats.getMonthly(12),
  stats.getTopItems({ month: "2024-01", limit: 5 }),
  budgets.getCurrent("2024-01")
]);

// Display summary
console.log(`Balance: ${summary.balance}€`);

// Pie chart by tag
byTag.forEach(tag => {
  console.log(`${tag.tag_name}: ${tag.percentage}%`);
});

// Evolution chart
monthly.forEach(month => {
  console.log(`${month.month}: +${month.income}€ / -${month.expenses}€`);
});
```
