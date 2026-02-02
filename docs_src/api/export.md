# Export API

Base URL: `/api/v1/export`

Endpoints for exporting data in CSV format.

## Endpoints

### GET /documents/csv

Exports documents in CSV format.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| start_date | date | Start date (format: YYYY-MM-DD) |
| end_date | date | End date (format: YYYY-MM-DD) |
| tag_ids | int[] | Filter by tags (can be repeated) |
| include_items | bool | Include item details (default: false) |

**Response (200):**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="documents_*.csv"`

### Format without items (default)

One line per document:

```csv
ID;Date;Time;Merchant;Location;Type;Amount;Currency;Transaction Type;Tags;Original File
1;2024-01-15;14:30:00;Carrefour;Paris 15e;receipt;45.67;EUR;Expense;Groceries;ticket-carrefour.jpg
2;2024-01-16;09:15:00;RATP;Paris;receipt;16.90;EUR;Expense;Transport;navigo.pdf
```

### Format with items

One line per item:

```csv
Document ID;Date;Merchant;Item;Quantity;Unit;Unit Price;Total Price;Item Category;Document Tags
1;2024-01-15;Carrefour;Golden Apples;1.50;kg;2.99;4.49;Fruits;Groceries
1;2024-01-15;Carrefour;Baguette;2.00;;1.20;2.40;Bakery;Groceries
1;2024-01-15;Carrefour;Milk;1.00;L;1.10;1.10;Dairy;Groceries
```

---

### GET /monthly/csv

Exports the monthly summary in CSV format.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | int | Yes | Year (2000-2100) |
| month | int | Yes | Month (1-12) |

**Response (200):**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="summary_YYYY-MM.csv"`

**Format:**

```csv
Monthly Summary;2024-01

Metric;Value
Total Expenses;1250.75 EUR
Total Income;3500.00 EUR
Balance;2249.25 EUR
Number of transactions;42

Expenses by Category
Tag;Amount;Percentage
Groceries;450.30 EUR;36.0%
Transport;180.00 EUR;14.4%
Housing;400.00 EUR;32.0%
Leisure;220.45 EUR;17.6%
```

---

### GET /monthly/pdf

Generates and exports the monthly PDF report with charts.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | int | Yes | Report year (2000-2100) |
| month | int | Yes | Report month (1-12) |

**Response (200):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="report_*.pdf"`

!!! note "Report Content"
    The monthly PDF report includes a financial summary, category breakdown charts (donut), monthly evolution, top expenses and merchants, as well as budget tracking.

---

### GET /annual/pdf

Generates and exports the annual summary PDF report.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | int | Yes | Report year (2000-2100) |

**Response (200):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="annual_report_*.pdf"`

!!! note "Report Content"
    The annual PDF report contains a summary of the year, monthly evolution (line chart), a month-by-month comparison table, annual category breakdown, and top 10 expenses/merchants of the year.

---

### GET /chart/{chart_type}

Exports an individual chart in PNG format.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chart_type | string | Yes | Chart type: `pie`, `bar`, `line`, `donut`, `area` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | No | Month to filter for the chart (YYYY-MM format) |

**Response (200):**
- Content-Type: `image/png`
- Content-Disposition: `attachment; filename="chart_*.png"`

---

## Usage Examples

### Export with cURL

```bash
# Basic export
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/documents/csv" \
     -o documents.csv

# Export with filters
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/documents/csv?start_date=2024-01-01&end_date=2024-01-31&tag_ids=1&tag_ids=2" \
     -o january.csv

# Export with item details
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/documents/csv?include_items=true" \
     -o documents_details.csv

# Export monthly summary CSV
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/monthly/csv?year=2024&month=1" \
     -o january_summary.csv

# Export monthly PDF report
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/monthly/pdf?year=2024&month=1" \
     -o january_report.pdf

# Export annual PDF report
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/annual/pdf?year=2024" \
     -o annual_report_2024.pdf

# Export donut chart PNG for a month
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/chart/donut?month=2024-01" \
     -o january_donut_chart.png
```

### Export with JavaScript

```javascript
// Download documents export
await exportApi.documentsCSV({
  start_date: "2024-01-01",
  end_date: "2024-01-31",
  tag_ids: [1, 2],
  include_items: true
});
// The file is downloaded automatically

// Download monthly summary CSV
await exportApi.monthlyCSV(2024, 1);

// Download monthly PDF report
await exportApi.monthlyPDF(2024, 1);

// Download annual PDF report
await exportApi.annualPDF(2024);

// Download a chart PNG
await exportApi.exportChart('donut', '2024-01');
```

---

## Notes

!!! info "Separator"
    The separator used is the semicolon (`;`) for better compatibility with Excel (French version).

!!! info "Encoding"
    Files are UTF-8 encoded with BOM to ensure correct display of accented characters in Excel.
