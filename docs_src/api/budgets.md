# Budgets API

Base URL: `/api/v1/budgets`

Budgets allow setting monthly spending limits per category (tag).

## Endpoints

### GET /

Lists all budgets.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| month | string | Filter by month (format: YYYY-MM) |

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
      "name": "Groceries",
      "color": "#22c55e"
    }
  }
]
```

---

### GET /current

Retrieves budgets for the current month with calculated spending.

This is the main endpoint for the dashboard and budget page.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| month | string | Target month (format: YYYY-MM, default: current month) |

**Response (200):**
```json
[
  {
    "id": 1,
    "tag_id": 1,
    "tag_name": "Groceries",
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

!!! note "Spending Calculation"
    `spent_amount` is calculated in real-time from documents of the month with the corresponding tag.

---

### POST /

Creates a new budget.

**Request Body:**
```json
{
  "tag_id": 1,
  "month": "2024-01",
  "limit_amount": 500.00,
  "currency": "EUR"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tag_id | int | Yes | ID of the associated tag |
| month | string | Yes | Month (format: YYYY-MM) |
| limit_amount | number | Yes | Spending limit |
| currency | string | No | Currency (default: EUR) |

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

**Errors:**

| Code | Description |
|------|-------------|
| 400 | Budget already exists for this tag/month |
| 404 | Tag not found |

---

### PUT /{id}

Updates a budget.

**Request Body:**
```json
{
  "limit_amount": 600.00
}
```

| Field | Type | Description |
|-------|------|-------------|
| limit_amount | number | New limit |
| currency | string | New currency |

**Response (200):** Budget updated

---

### DELETE /{id}

Deletes a budget.

**Response (204):** No Content

---

## Visual Indicators

The percentage of usage determines the indicator's color:

| Usage Percentage | Color | Meaning |
|------------------|---------|---------------|
| 0-50%            | Green (`#22c55e`) | Comfortable    |
| 50-75%           | Yellow (`#eab308`) | Watch out      |
| 75-90%           | Orange (`#f97316`) | Close to limit |
| 90%+             | Red (`#ef4444`) | Limit exceeded   |

## Example Usage

### Create monthly budgets

```javascript
// Create a groceries budget
await budgets.create({
  tag_id: 1, // ID of "Groceries" tag
  month: "2024-01",
  limit_amount: 500
});

// Create a transport budget
await budgets.create({
  tag_id: 2, // ID of "Transport" tag
  month: "2024-01",
  limit_amount: 150
});
```

### Display progress

```javascript
const current = await budgets.getCurrent("2024-01");

current.forEach(budget => {
  console.log(`${budget.tag_name}: ${budget.percentage_used}%`);
  if (budget.percentage_used > 100) {
    console.log("⚠️ Budget exceeded!");
  }
});
```
