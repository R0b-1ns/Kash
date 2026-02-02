# NAS Sync Service (SMB)

The NAS synchronization service transfers files to a NAS via an **SMB/CIFS mount**.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              nas_sync_service.py                       │  │
│  │                                                        │  │
│  │  def sync_file(document):                             │  │
│  │      dest = get_destination_path(document)            │  │
│  │      os.makedirs(dest_dir, exist_ok=True)             │  │
│  │      shutil.copy2(src, dest)  # Simple copy!          │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ Local file copy
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SMB MOUNT                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  /app/nas_backup (in container)                         │  │
│  │       │                                                │  │
│  │       └── mounted from /Volumes/NAS/finance (Mac)     │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  NAS Ugreen │                          │
│                    │    (SMB)    │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Source File

`backend/app/services/nas_sync_service.py`

## Advantages over SSH/rsync

| Criterion | SSH/rsync (old) | SMB (new) |
|-----------|-------------------|---------------|
| Configuration | Complex (SSH keys) | Simple (mount) |
| Authentication | SSH key | Native SMB credentials |
| Performance | Good | Good |
| NAS Compatibility | Variable | Universal |
| Python Code | subprocess + rsync | shutil.copy2 |

## Configuration

### 1. Mount the SMB share on Mac

```bash
# Create mount point
sudo mkdir -p /Volumes/NAS

# Mount SMB share
mount -t smbfs //username:password@NAS-IP/share /Volumes/NAS

# Or via Finder: Cmd+K → smb://NAS-IP/share
```

### 2. Environment Variables (.env)

```bash
# Path on Mac (SMB mount)
NAS_LOCAL_PATH=/Volumes/NAS/finance

# Path in Docker container
NAS_MOUNT_PATH=/app/nas_backup
```

### 3. docker compose.yml

```yaml
backend:
  volumes:
    - ${NAS_LOCAL_PATH:-./nas_backup}:/app/nas_backup
  environment:
    - NAS_MOUNT_PATH=${NAS_MOUNT_PATH:-}
```

## File Structure on NAS

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
│   ├── 02/
│   │   └── ...
│   └── ...
├── 2025/
│   └── ...
└── 2026/
    └── 01/
        ├── invoices/
        └── receipts/
```

### Document Type Mapping

| Type (DB) | NAS Folder |
|-----------|------------|
| receipt | receipts |
| invoice | invoices |
| payslip | salaries |
| other | others |

## Classes

### NASSyncService

```python
class NASSyncService:
    def is_configured(self) -> bool:
        """Checks if the NAS mount is accessible."""

    def get_config_status(self) -> dict:
        """Returns the configuration status."""

    def test_connection(self) -> tuple[bool, str]:
        """Tests write access to the mount."""

    def sync_file(self, document: Document) -> tuple[bool, str]:
        """Synchronizes a specific file."""

    def sync_all_pending(self, user_id: int) -> dict:
        """Synchronizes all pending files."""

    def get_sync_stats(self, user_id: int) -> dict:
        """Returns synchronization statistics."""
```

### Internal Methods

```python
def _get_doc_type_folder(self, doc_type: str) -> str:
    """Converts document type to folder name."""
    type_mapping = {
        "receipt": "receipts",
        "invoice": "invoices",
        "payslip": "salaries",
        "other": "others",
    }
    return type_mapping.get(doc_type, "others")

def _get_destination_path(self, document: Document) -> str:
    """Builds the path: {nas}/{year}/{month}/{type}/{file}"""
    doc_date = document.date or document.created_at.date()
    year = str(doc_date.year)
    month = str(doc_date.month).zfill(2)
    type_folder = self._get_doc_type_folder(document.doc_type)
    filename = os.path.basename(document.file_path)
    return os.path.join(self.nas_mount_path, year, month, type_folder, filename)
```

## Usage

```python
from app.services.nas_sync_service import get_nas_sync_service

# Create the service
sync_service = get_nas_sync_service(db)

# Check configuration
if not sync_service.is_configured():
    print("NAS mount not accessible")
    return

# Test access
success, message = sync_service.test_connection()
if not success:
    print(f"Error: {message}")
    return

# Synchronize a document
document = db.query(Document).get(1)
success, message = sync_service.sync_file(document)

# Synchronize all pending documents
results = sync_service.sync_all_pending(user_id=1)
print(f"Synced: {results['synced']}")
print(f"Failures: {results['failed']}")
```

## API Endpoints

### GET /sync/status

Synchronization statistics.

```json
{
  "total_documents": 150,
  "synced": 142,
  "pending": 8,
  "sync_percentage": 94.7,
  "last_sync": "2024-01-15T14:30:00",
  "nas_configured": true
}
```

### GET /sync/config

NAS configuration status.

```json
{
  "configured": true,
  "nas_host": true,
  "nas_user": true,
  "nas_path": true,
  "host": "SMB Mount",
  "path": "/app/nas_backup",
  "path_exists": true,
  "path_writable": true
}
```

### POST /test

Tests mount access.

```json
{
  "success": true,
  "message": "NAS mount accessible for read/write"
}
```

### POST /run

Starts synchronization of all pending documents.

```json
{
  "total": 8,
  "synced": 7,
  "failed": 1,
  "errors": ["Document 42: Permission denied"]
}
```

### POST /document/{document_id}

Synchronizes a specific document.

```json
{
  "success": true,
  "message": "Synchronized to /app/nas_backup/2024/01/invoices/abc.pdf"
}
```

## Error Handling

| Error | Cause | Solution |
|--------|-------|----------|
| NAS not configured | NAS_MOUNT_PATH empty | Define variable in .env |
| Path non-existent | Mount not performed | Mount SMB share on Mac |
| Permission denied | Insufficient rights | Check SMB permissions |
| Disk space | NAS full | Free up space |

## Database Update

After successful synchronization:

```python
document.synced_to_nas = True
document.synced_at = datetime.utcnow()
db.commit()
```

## Best Practices

### Automatic Mounting (macOS)

To mount automatically on startup, add to `/etc/fstab`:

```
//user:pass@nas-ip/share /Volumes/NAS smbfs 0 0
```

Or use the "Automator" app for a login script.

### Security

- Create a dedicated SMB user on the NAS
- Limit permissions to the finance folder only
- Do not expose the NAS to the Internet

### Reliability

- Check if the mount is active before starting Docker
- Monitor NAS disk space
- Back up the NAS regularly
