# Configuration

## Variables d'environnement

### Fichier `.env`

Le fichier `.env` à la racine du projet contient toutes les configurations :

```bash
# ===========================================
# Sécurité
# ===========================================

# Clé secrète pour signer les tokens JWT
# IMPORTANT: Changez cette valeur en production !
SECRET_KEY=your-super-secret-key-change-this-in-production

# ===========================================
# Base de données
# ===========================================

# URL de connexion PostgreSQL
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://finance:finance@postgres:5432/finance_db

# ===========================================
# Ollama (IA)
# ===========================================

# URL du service Ollama
OLLAMA_HOST=http://ollama:11434

# Modèle à utiliser pour l'extraction
# Options: mistral, llama2, codellama, etc.
OLLAMA_MODEL=mistral

# ===========================================
# Synchronisation NAS (optionnel)
# ===========================================

# Chemin du montage SMB sur le Mac hôte
NAS_LOCAL_PATH=/Volumes/NAS/finance

# Chemin dans le container Docker (monté via volume)
NAS_MOUNT_PATH=/app/nas_backup
```

## Configuration du NAS

### Prérequis

1. **Partage SMB/CIFS** activé sur votre NAS
2. **Utilisateur dédié** avec droits d'écriture sur le dossier finance

### Montage SMB sur macOS

```bash
# Créer le point de montage
sudo mkdir -p /Volumes/NAS

# Monter le partage SMB
mount -t smbfs //utilisateur:motdepasse@IP-NAS/partage /Volumes/NAS

# Ou via Finder : Cmd+K → smb://IP-NAS/partage
```

### Configuration Docker

Le montage SMB doit être accessible par Docker. Dans `docker-compose.yml` :

```yaml
backend:
  volumes:
    - ${NAS_LOCAL_PATH:-./nas_backup}:/app/nas_backup
  environment:
    - NAS_MOUNT_PATH=${NAS_MOUNT_PATH:-}
```

### Structure des dossiers NAS

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
│   └── 02/
│       └── ...
├── 2025/
│   └── ...
└── 2026/
    └── ...
```

### Montage automatique (optionnel)

Pour monter automatiquement au démarrage du Mac, ajoutez dans `/etc/fstab` :

```
//user:pass@nas-ip/share /Volumes/NAS smbfs 0 0
```

## Configuration des budgets

### Création d'un budget

1. Créez d'abord les **tags** correspondant à vos catégories
2. Allez dans **Budgets** > **Nouveau budget**
3. Sélectionnez le tag et définissez la limite mensuelle

### Alertes visuelles

| Pourcentage utilisé | Couleur | Signification |
|---------------------|---------|---------------|
| 0-50% | Vert | Tout va bien |
| 50-75% | Jaune | Attention |
| 75-90% | Orange | Proche de la limite |
| 90%+ | Rouge | Limite dépassée |

## Configuration frontend

### Fichier `frontend/.env`

```bash
# URL de l'API backend
VITE_API_URL=http://localhost:8000/api/v1
```

### Build de production

```bash
cd frontend
npm run build
```

Les fichiers statiques sont générés dans `frontend/dist/`.

## Personnalisation

### Modifier les devises par défaut

Éditez la migration `backend/alembic/versions/001_initial_schema.py` avant la première exécution pour modifier les devises :

```python
currencies = [
    {"code": "EUR", "name": "Euro", "symbol": "€", "rate_to_eur": 1.0},
    {"code": "USD", "name": "Dollar US", "symbol": "$", "rate_to_eur": 0.92},
    # Ajoutez vos devises ici
]
```

### Modifier le prompt IA

Le prompt d'extraction est dans `backend/app/services/ai_service.py`. Vous pouvez l'adapter pour améliorer l'extraction selon vos types de documents.
