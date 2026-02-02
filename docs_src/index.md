# Finance Manager

Personal finance manager with OCR and local AI.

## Features

- **Document Upload**: Photos of receipts, PDF invoices, pay stubs
- **Smart OCR**: Automatic text extraction with PaddleOCR
- **Local AI**: Data categorization and extraction with Ollama/Mistral
- **Interactive Dashboard**: Charts, statistics, budget tracking
- **Customizable Tags**: Flexible categorization system
- **Multi-currency**: Currency support for travels
- **CSV Export**: Easily export your data
- **NAS Synchronization**: Automatic backup to your NAS

## Tech Stack

| Component | Technology |
|-----------|-------------|
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Frontend | React 18, TypeScript, Tailwind CSS |
| OCR | PaddleOCR |
| AI | Ollama with Mistral 7B |
| Containerization | Docker Compose |

## Quick Start

```bash
# Clone the project
git clone <repository>
cd gestionnaireDeFinance

# Configure the environment
cp .env.example .env

# Launch with Docker
docker compose up -d

# Access the application
open http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│                   http://localhost:3000                  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────┐
│                   Backend (FastAPI)                      │
│                   http://localhost:8000                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   OCR   │  │   AI    │  │  Export │  │   Sync  │    │
│  │ Service │  │ Service │  │ Service │  │ Service │    │
│  └────┬────┘  └────┬────┘  └─────────┘  └────┬────┘    │
│       │            │                          │         │
│       ▼            ▼                          ▼         │
│  ┌─────────┐  ┌─────────┐              ┌─────────┐     │
│  │PaddleOCR│  │ Ollama  │              │  rsync  │     │
│  └─────────┘  └─────────┘              └────┬────┘     │
└─────────────────────┬───────────────────────│──────────┘
                      │                       │
              ┌───────▼───────┐        ┌──────▼──────┐
              │  PostgreSQL   │        │     NAS     │
              └───────────────┘        └─────────────┘
```

## Useful Links

- [Installation Guide](getting-started/installation.md)
- [Configuration](getting-started/configuration.md)
- [API Reference](api/auth.md)
- [Swagger Documentation](http://localhost:8000/docs)
