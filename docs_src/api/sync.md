# Synchronization API

Base URL: `/api/v1/sync`

Endpoints for synchronizing files to NAS via SMB mount.

## Prerequisites

Synchronization uses an **SMB/CIFS mount** (not SSH/rsync).

### 1. Mount the SMB share on Mac

```bash
# Create mount point
sudo mkdir -p /Volumes/NAS

# Mount SMB share
mount -t smbfs //username:password@NAS-IP/share /Volumes/NAS

# Or via Finder: Cmd+K → smb://NAS-IP/share
```

### 2. Configuration in `.env`

```bash
# Path on Mac (SMB mount)
NAS_LOCAL_PATH=/Volumes/NAS/finance

# Path in Docker container
NAS_MOUNT_PATH=/app/nas_backup
```

### 3. Docker compose configuration

```yaml
backend:
  volumes:
    - ${NAS_LOCAL_PATH:-./nas_backup}:/app/nas_backup
  environment:
    - NAS_MOUNT_PATH=${NAS_MOUNT_PATH:-}
```

## Endpoints

### GET /status

Retrieves synchronization statistics.

**Response (200):**
```json
{
  "total_documents": 150,
  "synced": 142,
  "pending": 8,
  "sync_percentage": 94.7,
  "last_sync": "2024-01-15T14:30:00Z",
  "nas_configured": true
}
```

| Field | Description |
|-------|-------------|
| total_documents | Total number of documents |
| synced | Synchronized documents |
| pending | Documents awaiting sync |
| sync_percentage | Synchronization percentage |
| last_sync | Date of last synchronization |
| nas_configured | NAS mount accessible |

---

### GET /config

Retrieves NAS configuration status.

**Response (200):**
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

| Field | Description |
|-------|-------------|
| configured | Complete and functional configuration |
| nas_host | Legacy compatibility (always true if configured) |
| nas_user | Legacy compatibility (always true if configured) |
| nas_path | Mount path defined |
| host | "SMB Mount" (type indication) |
| path | Mount path in the container |
| path_exists | Directory exists |
| path_writable | Write permissions OK |

---

### POST /test

Tests NAS mount access.

**Response (200):**
```json
{
  "success": true,
  "message": "NAS mount accessible for read/write"
}
```

**Possible Errors:**

```json
{
  "success": false,
  "message": "NAS mount not configured. Define NAS_MOUNT_PATH and mount the SMB share."
}
```

```json
{
  "success": false,
  "message": "Mount path does not exist: /app/nas_backup"
}
```

```json
{
  "success": false,
  "message": "Mount is not writable"
}
```

---

### POST /run

Starts synchronization of all pending documents.

**Response (200):**
```json
{
  "total": 8,
  "synced": 7,
  "failed": 1,
  "errors": [
    "Document 42: Source file not found"
  ]
}
```

| Field | Description |
|-------|-------------|
| total | Number of documents to synchronize |
| synced | Successfully synchronized documents |
| failed | Failed documents |
| errors | List of detailed errors |

**Errors:**

| Code | Description |
|------|-------------|
| 400 | NAS mount not configured or inaccessible |

---

### POST /document/{document_id}

Synchronizes a specific document.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| document_id | int | Document ID |

**Response (200):**
```json
{
  "success": true,
  "message": "Synchronized to /app/nas_backup/2024/01/invoices/abc.pdf"
}
```

**Errors:**

| Code | Description |
|------|-------------|
| 400 | NAS mount not configured or document without file |
| 404 | Document not found |

---

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

---

## Technical Operation

### Copy via shutil

Synchronization uses simple Python file copying:

```python
import shutil
import os

# Create destination directory
os.makedirs(dest_dir, exist_ok=True)

# Copy file (preserves metadata)
shutil.copy2(source_path, dest_path)
```

Advantages over rsync/SSH:

| Criterion | SSH/rsync | SMB (shutil) |
|-----------|-----------|--------------|
| Configuration | Complex (SSH keys) | Simple (mount) |
| Authentication | SSH key | Native SMB credentials |
| Python Code | subprocess + rsync | shutil.copy2 |
| NAS Compatibility | Variable | Universal |

### Database Marking

After successful synchronization, the document is updated:

```sql
UPDATE documents SET
  synced_to_nas = TRUE,
  synced_at = NOW()
WHERE id = ?;
```

---

## Example Usage

```javascript
// Check configuration
const config = await sync.getConfig();
if (!config.configured) {
  console.log("NAS mount not accessible");
  return;
}

// Test access
const test = await sync.testConnection();
if (!test.success) {
  console.error("Failure:", test.message);
  return;
}

// Check status
const status = await sync.getStatus();
console.log(`${status.pending} documents pending`);

// Start synchronization
if (status.pending > 0) {
  const result = await sync.runSync();
  console.log(`${result.synced} synced, ${result.failed} failures`);
}
```

---

## Troubleshooting

| Problem | Cause | Solution |
|----------|-------|----------|
| NAS not configured | NAS_MOUNT_PATH empty | Define variable in .env |
| Path non-existent | Mount not performed | Mount SMB share on Mac |
| Permission denied | Insufficient rights | Check SMB permissions |
| Disk space | NAS full | Free up space |
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

| Champ | Description |
|-------|-------------|
| configured | Configuration complète et fonctionnelle |
| nas_host | Compatibilité legacy (toujours true si configuré) |
| nas_user | Compatibilité legacy (toujours true si configuré) |
| nas_path | Chemin de montage défini |
| host | "SMB Mount" (indication du type) |
| path | Chemin du montage dans le container |
| path_exists | Le répertoire existe |
| path_writable | Permissions d'écriture OK |

---

### POST /test

Teste l'accès au montage NAS.

**Response (200):**
```json
{
  "success": true,
  "message": "Montage NAS accessible en lecture/écriture"
}
```

**Erreurs possibles:**

```json
{
  "success": false,
  "message": "Montage NAS non configuré. Définissez NAS_MOUNT_PATH et montez le partage SMB."
}
```

```json
{
  "success": false,
  "message": "Le chemin de montage n'existe pas: /app/nas_backup"
}
```

```json
{
  "success": false,
  "message": "Le montage n'est pas accessible en écriture"
}
```

---

### POST /run

Lance la synchronisation de tous les documents en attente.

**Response (200):**
```json
{
  "total": 8,
  "synced": 7,
  "failed": 1,
  "errors": [
    "Document 42: Fichier source introuvable"
  ]
}
```

| Champ | Description |
|-------|-------------|
| total | Nombre de documents à synchroniser |
| synced | Documents synchronisés avec succès |
| failed | Documents en échec |
| errors | Liste des erreurs détaillées |

**Erreurs:**

| Code | Description |
|------|-------------|
| 400 | Montage NAS non configuré ou inaccessible |

---

### POST /document/{document_id}

Synchronise un document spécifique.

**Path Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| document_id | int | ID du document |

**Response (200):**
```json
{
  "success": true,
  "message": "Synchronisé vers /app/nas_backup/2024/01/factures/abc.pdf"
}
```

**Erreurs:**

| Code | Description |
|------|-------------|
| 400 | Montage NAS non configuré ou document sans fichier |
| 404 | Document non trouvé |

---

## Structure des fichiers sur le NAS

Les fichiers sont organisés par **année/mois/type** :

```
/Volumes/NAS/finance/
├── 2024/
│   ├── 01/
│   │   ├── factures/
│   │   │   └── abc123.pdf
│   │   ├── tickets/
│   │   │   └── def456.jpg
│   │   └── salaires/
│   │       └── ghi789.pdf
│   ├── 02/
│   │   └── ...
│   └── ...
├── 2025/
│   └── ...
└── 2026/
    └── 01/
        ├── factures/
        └── tickets/
```

### Mapping des types de documents

| Type (BDD) | Dossier NAS |
|------------|-------------|
| receipt | tickets |
| invoice | factures |
| payslip | salaires |
| other | autres |

---

## Fonctionnement technique

### Copie via shutil

La synchronisation utilise une simple copie de fichiers Python :

```python
import shutil
import os

# Créer le répertoire de destination
os.makedirs(dest_dir, exist_ok=True)

# Copier le fichier (préserve les métadonnées)
shutil.copy2(source_path, dest_path)
```

Avantages par rapport à rsync/SSH :

| Critère | SSH/rsync | SMB (shutil) |
|---------|-----------|--------------|
| Configuration | Complexe (clés SSH) | Simple (montage) |
| Authentification | Clé SSH | Identifiants SMB natifs |
| Code Python | subprocess + rsync | shutil.copy2 |
| Compatibilité NAS | Variable | Universelle |

### Marquage en base

Après synchronisation réussie, le document est mis à jour :

```sql
UPDATE documents SET
  synced_to_nas = TRUE,
  synced_at = NOW()
WHERE id = ?;
```

---

## Exemple d'utilisation

```javascript
// Vérifier la configuration
const config = await sync.getConfig();
if (!config.configured) {
  console.log("Montage NAS non accessible");
  return;
}

// Tester l'accès
const test = await sync.testConnection();
if (!test.success) {
  console.error("Échec:", test.message);
  return;
}

// Voir le statut
const status = await sync.getStatus();
console.log(`${status.pending} documents en attente`);

// Lancer la synchronisation
if (status.pending > 0) {
  const result = await sync.runSync();
  console.log(`${result.synced} synchronisés, ${result.failed} échecs`);
}
```

---

## Dépannage

| Problème | Cause | Solution |
|----------|-------|----------|
| NAS non configuré | NAS_MOUNT_PATH vide | Définir la variable dans .env |
| Chemin inexistant | Montage non fait | Monter le partage SMB sur le Mac |
| Permission refusée | Droits insuffisants | Vérifier les permissions SMB |
| Espace disque | NAS plein | Libérer de l'espace |
