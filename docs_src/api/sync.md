# API Synchronisation

Base URL: `/api/v1/sync`

Endpoints pour la synchronisation des fichiers vers le NAS.

## Prérequis

La synchronisation nécessite une configuration préalable dans le fichier `.env` :

```bash
NAS_HOST=192.168.1.100    # IP ou hostname du NAS
NAS_USER=your-user         # Utilisateur SSH
NAS_PATH=/volume1/factures # Chemin de destination
```

Une clé SSH doit être configurée pour l'authentification sans mot de passe.

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
| nas_configured | Configuration NAS complète |

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
  "host": "192.168.1.100",
  "path": "/volume1/factures"
}
```

!!! warning "Mot de passe masqué"
    Le mot de passe/clé SSH n'est jamais retourné pour des raisons de sécurité.

---

### POST /test

Teste la connexion SSH vers le NAS.

**Response (200):**
```json
{
  "success": true,
  "message": "Connexion réussie"
}
```

**Erreurs possibles:**

```json
{
  "success": false,
  "message": "Synchronisation NAS non configurée. Définissez NAS_HOST, NAS_USER et NAS_PATH dans le fichier .env"
}
```

```json
{
  "success": false,
  "message": "Échec de connexion : Permission denied (publickey)"
}
```

```json
{
  "success": false,
  "message": "Timeout de connexion (15s)"
}
```

---

### POST /run

Lance la synchronisation de tous les documents en attente.

!!! note "Durée"
    Cette opération peut prendre du temps selon le nombre de fichiers à synchroniser.

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
| 400 | NAS non configuré |

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
  "message": "Synchronisé vers 192.168.1.100"
}
```

**Erreurs:**

| Code | Description |
|------|-------------|
| 400 | NAS non configuré |
| 404 | Document non trouvé |

---

## Fonctionnement technique

### rsync

La synchronisation utilise `rsync` via SSH :

```bash
rsync -avz --progress \
  -e "ssh -o BatchMode=yes -o ConnectTimeout=30" \
  /app/uploads/document.jpg \
  user@nas:/volume1/factures/document.jpg
```

Options utilisées :
- `-a` : Mode archive (préserve permissions, dates...)
- `-v` : Verbose
- `-z` : Compression pendant le transfert
- `--progress` : Affiche la progression

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
  console.log("NAS non configuré");
  return;
}

// Tester la connexion
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
