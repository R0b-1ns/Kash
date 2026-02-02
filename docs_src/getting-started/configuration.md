# Configuration

## Environment Variables

### `.env` file

The `.env` file at the root of the project contains all configurations:

```bash
# ===========================================
# Security
# ===========================================

# Secret key for signing JWT tokens
# IMPORTANT: Change this value in production!
SECRET_KEY=your-super-secret-key-change-this-in-production

# ===========================================
# Database
# ===========================================

# PostgreSQL connection URL
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://finance:finance@postgres:5432/finance_db

# ===========================================
# Ollama (AI)
# ===========================================

# Ollama service URL
OLLAMA_HOST=http://ollama:11434

# Model to use for extraction
# Options: mistral, llama2, codellama, etc.
OLLAMA_MODEL=mistral

# ===========================================
# NAS Synchronization (optional)
# ===========================================

# SMB mount path on the host Mac
NAS_LOCAL_PATH=/Volumes/NAS/finance

# Path in the Docker container (mounted via volume)
NAS_MOUNT_PATH=/app/nas_backup
```

## NAS Configuration

### Prerequisites

1.  **SMB/CIFS share** enabled on your NAS
2.  **Dedicated user** with write permissions on the finance folder

### SMB Mount on macOS

```bash
# Create mount point
sudo mkdir -p /Volumes/NAS

# Mount SMB share
mount -t smbfs //username:password@NAS-IP/share /Volumes/NAS

# Or via Finder: Cmd+K → smb://NAS-IP/share
```

### Docker Configuration

The SMB mount must be accessible by Docker. In `docker compose.yml`:

```yaml
backend:
  volumes:
    - ${NAS_LOCAL_PATH:-./nas_backup}:/app/nas_backup
  environment:
    - NAS_MOUNT_PATH=${NAS_MOUNT_PATH:-}
```

### NAS Folder Structure

Files are organized by **year/month/type**:

```
/Volumes/NAS/finance/
├── 2024/
│   ├── 01/
│   │   ├── invoices/
│   │   │   └── abc123.pdf
│   │   ├── receipts/
│   │   │   └── def456.jpg
│   │   └── salaries/
│   │       └── ghi789.pdf
│   └── 02/
│       └── ...
├── 2025/
│   └── ...
└── 2026/
    └── ...
```

### Automatic Mounting (optional)

To mount automatically on Mac startup, add to `/etc/fstab`:

```
//user:pass@nas-ip/share /Volumes/NAS smbfs 0 0
```

## Budget Configuration

### Creating a Budget

1.  First, create **tags** corresponding to your categories
2.  Go to **Budgets** > **New Budget**
3.  Select the tag and set the monthly limit

### Visual Alerts

| Usage Percentage | Color | Meaning       |
|------------------|-------|---------------|
| 0-50%            | Green | All good      |
| 50-75%           | Yellow | Warning       |
| 75-90%           | Orange | Close to limit |
| 90%+             | Red | Limit exceeded |

## Frontend Configuration

### `frontend/.env` file

```bash
# Backend API URL
VITE_API_URL=http://localhost:8000/api/v1
```

### Production Build

```bash
cd frontend
npm run build
```

Static files are generated in `frontend/dist/`.

## Customization

### Modify default currencies

Edit the migration `backend/alembic/versions/001_initial_schema.py` before the first execution to modify currencies:

```python
currencies = [
    {"code": "EUR", "name": "Euro", "symbol": "€", "rate_to_eur": 1.0},
    {"code": "USD", "name": "US Dollar", "symbol": "$", "rate_to_eur": 0.92},
    # Add your currencies here
]
```

### Modify AI Prompt

The extraction prompt is in `backend/app/services/ai_service.py`. You can adapt it to improve extraction based on your document types.
