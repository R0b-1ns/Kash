# Installation

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Mac M1/M2** or Linux (ARM64 or AMD64 architecture)
- At least **8 GB RAM** (for Ollama)
- **10 GB disk space** (AI models + data)

## Installation with Docker

### 1. Clone the Project

```bash
git clone <repository-url>
cd gestionnaireDeFinance
```

### 2. Configure the Environment

```bash
# Copy example file
cp .env.example .env

# Edit variables (optional)
nano .env
```

Important variables:

| Variable | Description | Default |
|----------|-------------|--------|
| `SECRET_KEY` | Secret JWT key | Change in production |
| `DATABASE_URL` | PostgreSQL URL | Configured for Docker |
| `OLLAMA_MODEL` | LLM Model | `mistral` |
| `NAS_HOST` | NAS IP | Empty (optional) |

### 3. Launch Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### 4. Initialize Database

```bash
# Run migrations
docker compose exec backend alembic upgrade head
```

### 5. Download AI Model

```bash
# Download Mistral (3.8 GB)
docker compose exec ollama ollama pull mistral
```

!!! note "First Download"
    Model download may take several minutes depending on your connection.

## Verification

### Service Access

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | User Interface |
| Backend | http://localhost:8000 | REST API |
| Swagger | http://localhost:8000/docs | API Documentation |
| Ollama | http://localhost:11434 | LLM API |

### API Test

```bash
# Check if API is responding
curl http://localhost:8000/health

# Expected response
{"status": "healthy"}
```

## Useful Commands

```bash
# Stop services
docker compose down

# Rebuild images
docker compose build --no-cache

# View container status
docker compose ps

# Access backend shell
docker compose exec backend bash

# View service logs
docker compose logs -f backend
```

## Troubleshooting

### PostgreSQL Connection Error

```bash
# Check if postgres is running
docker compose ps postgres

# Recreate container if necessary
docker compose rm -f postgres
docker compose up -d postgres
```

### Ollama Not Responding

```bash
# Check logs
docker compose logs ollama

# Is the model downloaded?
docker compose exec ollama ollama list
```

### Slow OCR on Mac M1

PaddleOCR uses the CPU by default. Performance is acceptable but not optimal. For complex documents, allow a few seconds for processing.
