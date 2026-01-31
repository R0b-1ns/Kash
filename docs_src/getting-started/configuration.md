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

# Adresse IP ou hostname du NAS
NAS_HOST=192.168.1.100

# Utilisateur SSH sur le NAS
NAS_USER=your-nas-user

# Chemin de destination sur le NAS
NAS_PATH=/volume1/factures

# Intervalle de sync automatique (minutes)
SYNC_INTERVAL_MINUTES=30
```

## Configuration du NAS

### Prérequis

1. **SSH activé** sur votre NAS
2. **Clé SSH** configurée pour l'authentification sans mot de passe
3. **rsync** installé sur le NAS

### Configuration SSH

```bash
# Générer une clé SSH (si pas déjà fait)
ssh-keygen -t ed25519 -C "finance-manager"

# Copier la clé sur le NAS
ssh-copy-id your-user@192.168.1.100

# Tester la connexion
ssh your-user@192.168.1.100 "echo OK"
```

### Structure des dossiers NAS

Les fichiers sont synchronisés avec leur nom unique généré :

```
/volume1/factures/
├── 2024-01-15_abc123_ticket-supermarche.jpg
├── 2024-01-20_def456_facture-electricite.pdf
└── ...
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
