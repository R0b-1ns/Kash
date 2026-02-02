# Service NAS Sync (SMB)

Le service de synchronisation NAS transfère les fichiers vers un NAS via un **montage SMB/CIFS**.

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
│  │      shutil.copy2(src, dest)  # Simple copie!         │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ Copie fichier local
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MONTAGE SMB                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  /app/nas_backup (dans le container)                   │  │
│  │       │                                                │  │
│  │       └── monté depuis /Volumes/NAS/finance (Mac)     │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  NAS Ugreen │                          │
│                    │    (SMB)    │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Fichier source

`backend/app/services/nas_sync_service.py`

## Avantages par rapport à SSH/rsync

| Critère | SSH/rsync (ancien) | SMB (nouveau) |
|---------|-------------------|---------------|
| Configuration | Complexe (clés SSH) | Simple (montage) |
| Authentification | Clé SSH | Identifiants SMB natifs |
| Performance | Bonne | Bonne |
| Compatibilité NAS | Variable | Universelle |
| Code Python | subprocess + rsync | shutil.copy2 |

## Configuration

### 1. Monter le partage SMB sur le Mac

```bash
# Créer le point de montage
sudo mkdir -p /Volumes/NAS

# Monter le partage SMB
mount -t smbfs //utilisateur:motdepasse@IP-NAS/partage /Volumes/NAS

# Ou via Finder : Cmd+K → smb://IP-NAS/partage
```

### 2. Variables d'environnement (.env)

```bash
# Chemin sur le Mac (montage SMB)
NAS_LOCAL_PATH=/Volumes/NAS/finance

# Chemin dans le container Docker
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

## Classes

### NASSyncService

```python
class NASSyncService:
    def is_configured(self) -> bool:
        """Vérifie si le montage NAS est accessible."""

    def get_config_status(self) -> dict:
        """Retourne le statut de la configuration."""

    def test_connection(self) -> tuple[bool, str]:
        """Teste l'accès en écriture au montage."""

    def sync_file(self, document: Document) -> tuple[bool, str]:
        """Synchronise un fichier spécifique."""

    def sync_all_pending(self, user_id: int) -> dict:
        """Synchronise tous les fichiers en attente."""

    def get_sync_stats(self, user_id: int) -> dict:
        """Retourne les statistiques de synchronisation."""
```

### Méthodes internes

```python
def _get_doc_type_folder(self, doc_type: str) -> str:
    """Convertit le type de document en nom de dossier."""
    type_mapping = {
        "receipt": "tickets",
        "invoice": "factures",
        "payslip": "salaires",
        "other": "autres",
    }
    return type_mapping.get(doc_type, "autres")

def _get_destination_path(self, document: Document) -> str:
    """Construit le chemin: {nas}/{année}/{mois}/{type}/{fichier}"""
    doc_date = document.date or document.created_at.date()
    year = str(doc_date.year)
    month = str(doc_date.month).zfill(2)
    type_folder = self._get_doc_type_folder(document.doc_type)
    filename = os.path.basename(document.file_path)
    return os.path.join(self.nas_mount_path, year, month, type_folder, filename)
```

## Utilisation

```python
from app.services.nas_sync_service import get_nas_sync_service

# Créer le service
sync_service = get_nas_sync_service(db)

# Vérifier la configuration
if not sync_service.is_configured():
    print("Montage NAS non accessible")
    return

# Tester l'accès
success, message = sync_service.test_connection()
if not success:
    print(f"Erreur: {message}")
    return

# Synchroniser un document
document = db.query(Document).get(1)
success, message = sync_service.sync_file(document)

# Synchroniser tous les documents en attente
results = sync_service.sync_all_pending(user_id=1)
print(f"Synchronisés: {results['synced']}")
print(f"Échecs: {results['failed']}")
```

## API Endpoints

### GET /sync/status

Statistiques de synchronisation.

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

Statut de la configuration.

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

### POST /sync/test

Tester l'accès au montage.

```json
{
  "success": true,
  "message": "Montage NAS accessible en lecture/écriture"
}
```

### POST /sync/run

Lancer la synchronisation de tous les documents en attente.

```json
{
  "total": 8,
  "synced": 7,
  "failed": 1,
  "errors": ["Document 42: Permission refusée"]
}
```

### POST /sync/document/{id}

Synchroniser un document spécifique.

```json
{
  "success": true,
  "message": "Synchronisé vers /app/nas_backup/2024/01/factures/abc.pdf"
}
```

## Gestion des erreurs

| Erreur | Cause | Solution |
|--------|-------|----------|
| NAS non configuré | NAS_MOUNT_PATH vide | Définir la variable dans .env |
| Chemin inexistant | Montage non fait | Monter le partage SMB sur le Mac |
| Permission refusée | Droits insuffisants | Vérifier les permissions SMB |
| Espace disque | NAS plein | Libérer de l'espace |

## Mise à jour en base

Après synchronisation réussie :

```python
document.synced_to_nas = True
document.synced_at = datetime.utcnow()
db.commit()
```

## Bonnes pratiques

### Montage automatique (macOS)

Pour monter automatiquement au démarrage, ajouter dans `/etc/fstab` :

```
//user:pass@nas-ip/share /Volumes/NAS smbfs 0 0
```

Ou utiliser l'app "Automator" pour un script au login.

### Sécurité

- Créer un utilisateur SMB dédié sur le NAS
- Limiter les permissions au dossier finance uniquement
- Ne pas exposer le NAS sur Internet

### Fiabilité

- Vérifier que le montage est actif avant de lancer Docker
- Monitorer l'espace disque NAS
- Sauvegarder régulièrement le NAS
