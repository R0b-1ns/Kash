# API Synchronisation

Base URL: `/api/v1/sync`

Endpoints pour la synchronisation des fichiers vers le NAS via montage SMB.

## Prérequis

La synchronisation utilise un **montage SMB/CIFS** (pas SSH/rsync).

### 1. Monter le partage SMB sur le Mac

```bash
# Créer le point de montage
sudo mkdir -p /Volumes/NAS

# Monter le partage SMB
mount -t smbfs //utilisateur:motdepasse@IP-NAS/partage /Volumes/NAS

# Ou via Finder : Cmd+K → smb://IP-NAS/partage
```

### 2. Configuration dans `.env`

```bash
# Chemin sur le Mac (montage SMB)
NAS_LOCAL_PATH=/Volumes/NAS/finance

# Chemin dans le container Docker
NAS_MOUNT_PATH=/app/nas_backup
```

### 3. Configuration docker-compose

```yaml
backend:
  volumes:
    - ${NAS_LOCAL_PATH:-./nas_backup}:/app/nas_backup
  environment:
    - NAS_MOUNT_PATH=${NAS_MOUNT_PATH:-}
```

## Endpoints

### GET /status

Récupère les statistiques de synchronisation.

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

| Champ | Description |
|-------|-------------|
| total_documents | Nombre total de documents |
| synced | Documents synchronisés |
| pending | Documents en attente de sync |
| sync_percentage | Pourcentage de synchronisation |
| last_sync | Date de dernière synchronisation |
| nas_configured | Montage NAS accessible |

---

### GET /config

Récupère le statut de la configuration NAS.

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
