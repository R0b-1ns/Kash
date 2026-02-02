# Export and Report Services

This module gathers backend services for exporting data in different formats (CSV, PDF) and generating reports with charts.

## Source Files

- `backend/app/services/export_service.py`
- `backend/app/services/pdf_service.py`

## Features

- Export documents as CSV
- Export monthly summary as CSV
- Generate monthly PDF reports with charts
- Generate annual PDF reports with charts
- Export individual charts as PNG
- Filtering by dates, tags (for CSV)
- Option to include item details (for CSV)

## ExportService Class

```python
class ExportService:
    def __init__(self, db: Session, user_id: int):
        """
        Initializes the export service.

        Args:
            db: Database session
            user_id: User ID (filters data)
        """

    def export_documents_csv(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        tag_ids: list[int] | None = None,
        include_items: bool = False
    ) -> str:
        """
        Exports documents as CSV.

        Returns:
            CSV content as a string
        """

    def export_monthly_summary_csv(
        self,
        year: int,
        month: int
    ) -> str:
        """
        Exports the monthly summary as CSV.

        Returns:
            CSV content with totals and breakdown
        """
```

## PDFReportService Class

The `PDFReportService` is responsible for generating detailed PDF reports and exporting individual charts in PNG format. It uses `ReportLab` for PDF layout and `Matplotlib` to create data visualizations.

```python
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg') # Using non-GUI backend
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Image, Table, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

class PDFReportService:
    def __init__(self, db: Session, user_id: int):
        """
        Initializes the PDF report service.

        Args:
            db: Database session
            user_id: User ID (filters data)
        """

    def generate_monthly_report(self, year: int, month: int) -> bytes:
        """
        Generates a complete monthly financial report in PDF with charts.

        Returns:
            PDF file content as bytes.
        """

    def generate_annual_report(self, year: int) -> bytes:
        """
        Generates a complete annual financial report in PDF with charts.

        Returns:
            PDF file content as bytes.
        """

    def export_chart(self, chart_type: str, params: dict) -> bytes:
        """
        Exports an individual chart (pie, bar, line, donut, area) as PNG.

        Args:
            chart_type: Type of chart to generate.
            params: Chart-specific parameters (e.g., 'month').

        Returns:
            PNG file content as bytes.
        """
```

## Usage

```python
from app.services.export_service import get_export_service
from app.services.pdf_service import get_pdf_service

# Create services
export_service = get_export_service(db, user_id=1)
pdf_service = get_pdf_service(db, user_id=1)

# Export documents CSV
csv_content = export_service.export_documents_csv(
    start_date=date(2024, 1, 1),
    end_date=date(2024, 1, 31),
    tag_ids=[1, 2],
    include_items=True
)

# Save CSV file
with open("export.csv", "w", encoding="utf-8-sig") as f:
    f.write(csv_content)

# Generate monthly PDF report
pdf_content = pdf_service.generate_monthly_report(2024, 1)

# Save PDF file
with open("monthly_report.pdf", "wb") as f:
    f.write(pdf_content)

# Export chart PNG
png_content = pdf_service.export_chart("donut", {"month": "2024-01"})

# Save PNG file
with open("donut_chart.png", "wb") as f:
    f.write(png_content)
```

## Output Formats

### Export documents (without items)

```csv
ID;Date;Time;Merchant;Location;Type;Amount;Currency;Transaction Type;Tags;Original File
1;2024-01-15;14:30:00;Carrefour;Paris;receipt;45.67;EUR;Expense;Groceries;ticket.jpg
```

| Column | Description |
|---------|-------------|
| ID | Unique identifier |
| Date | Document date (YYYY-MM-DD) |
| Time | Time if available (HH:MM:SS) |
| Merchant | Business name |
| Location | Address/city |
| Type | Document type |
| Amount | Total amount |
| Currency | Currency code (EUR, USD...) |
| Transaction Type | Income or Expense |
| Tags | Comma-separated tags |
| Original File | Name of the uploaded file |

### Export documents (with items)

```csv
Document ID;Date;Merchant;Item;Quantity;Unit;Unit Price;Total Price;Item Category;Document Tags
1;2024-01-15;Carrefour;Golden Apples;1.50;kg;2.99;4.49;Fruits;Groceries
1;2024-01-15;Carrefour;Baguette;2.00;;1.20;2.40;Bakery;Groceries
```

### Monthly CSV Export

```csv
Monthly Summary;2024-01

Metric;Value
Total Expenses;1250.75 EUR
Total Income;3500.00 EUR
Balance;2249.25 EUR
Number of Transactions;42

Expenses by Category
Tag;Amount;Percentage
Groceries;450.30 EUR;36.0%
Transport;180.00 EUR;14.4%
```

### PDF Reports

PDF reports (monthly and annual) provide a structured layout with a financial summary, tables, and dynamically generated charts.

### PNG Charts

PNG chart exports provide high-resolution images of data visualizations.

## CSV Configuration

```python
# Separator: semicolon (Excel FR)
writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
```

## Encoding

Files are generated in UTF-8 with BOM for Excel compatibility:

```python
# In the API route
return StreamingResponse(
    iter([csv_content]),
    media_type="text/csv; charset=utf-8",
    headers={
        "Content-Disposition": f'attachment; filename="{filename}"',
    }
)
```

## Performance

| Number of Documents | Generation Time |
|---------------------|---------------------|
| 100 | < 1s |
| 1000 | 2-3s |
| 10000 | 10-15s |

For large exports, generation is streamed to avoid memory issues.
