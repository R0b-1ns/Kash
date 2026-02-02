# Kash

**Personal finance manager with OCR and local AI.**

Kash centralizes your invoices, receipts, and pay stubs. It automatically extracts data using OCR and AI, then generates dashboards and monthly summaries.

## Features

- **Document Upload**: Photos of receipts, PDF invoices, pay stubs
- **Automatic Extraction**: OCR (PaddleOCR) + AI (Mistral 7B via Ollama)
- **Extracted Data**: Date, merchant, items, amounts, currency
- **Dashboard**: Graphs, monthly evolution, category breakdown
- **Budgets**: Monthly limits per tag with visual alerts
- **Tags**: Personalized organization (no fixed categories)
- **Multi-currency**: EUR, USD, GBP, CHF... with conversion
- **Export**: CSV of documents and monthly summaries
- **PDF Reports**: Monthly and annual reports with charts.
- **NAS Sync**: Automatic backup to Network Attached Storage (SMB)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   PostgreSQL    │
│  React + Vite   │     │    FastAPI      │     │                 │
│     :3000       │     │     :8000       │     │     :5432       │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │    OCR    │ │  Ollama   │ │    NAS    │
             │ PaddleOCR │ │  Mistral  │ │   (SMB)   │
             │   :5001   │ │  :11434   │ │           │
             └───────────┘ └───────────┘ └───────────┘
```

## Tech Stack

| Component | Technology |
|-----------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL 15 |
| OCR | PaddleOCR (microservice) |
| AI | Ollama + Mistral 7B |
| Charts | Recharts |
| Auth | JWT |
| Containers | Docker Compose |

## Installation

### Prerequisites

- A standard PC is sufficient to run the application.
- A graphics card (GPU) is recommended for hardware acceleration of AI models (Ollama).
- Docker Desktop.
- Minimum 8 GB RAM.

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-user/kash.git
cd kash

# Configure the environment
cp .env.example .env
# Edit .env with your settings

# Start the application
docker compose up -d

# Apply migrations
docker compose exec backend alembic upgrade head
```

The application is accessible at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### NAS Configuration (optional)

```bash
# Mount the SMB share on Mac
mount -t smbfs //user:pass@nas-ip/share /Volumes/NAS

# Configure in .env
NAS_LOCAL_PATH=/Volumes/NAS/finance
NAS_MOUNT_PATH=/app/nas_backup
```

## Usage

### 1. Create an account

Go to http://localhost:3000 and create your account.

### 2. Configure your tags

Create tags to organize your documents (e.g., Groceries, Restaurant, Transport...).n
### 3. Upload documents

Drag and drop your receipts and invoices. Extraction is automatic:
- OCR extracts text
- AI analyzes and structures data
- Items are detailed individually

### 4. Track your finances

The dashboard displays:
- Monthly balance (income - expenses)
- Monthly evolution
- Category breakdown
- Budget progress
- Most frequently purchased items

## Documentation

Technical documentation is available in `docs_src/`:

| Section | Description |
|---------|-------------|
| [Architecture](docs_src/architecture/overview.md) | System overview |
| [API](docs_src/api/) | Endpoints documentation |
| [Services](docs_src/services/) | OCR, AI, Export, NAS Sync |
| [Configuration](docs_src/getting-started/configuration.md) | Environment variables |

## Useful Commands

```bash
# Real-time logs
docker compose logs -f backend

# Rebuild after modifications
docker compose up -d --build

# Stop the application
docker compose down

# Reset the database
docker compose down -v
docker compose up -d
docker compose exec backend alembic upgrade head
```

## Project Structure

```
kash/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # Endpoints FastAPI
│   │   ├── core/            # Config, security, DB
│   │   ├── models/          # SQLAlchemy Models
│   │   ├── schemas/         # Pydantic Schemas
│   │   └── services/        # OCR, AI, Export, Sync, PDF
│   └── alembic/             # Migrations
├── frontend/
│   ├── src/
│   │   ├── components/      # React Components
│   │   ├── pages/           # App Pages
│   │   ├── hooks/           # Custom Hooks
│   │   └── services/        # API Client
│   └── package.json
├── ocr_service/             # OCR Microservice
├── docs_src/                # Documentation
├── docker compose.yml
└── .env.example
```

## Planned Improvements

- Integration of notifications for budget alerts via:
  - Email
  - Discord
  - Telegram

## Licence

Personal project - All rights reserved.
