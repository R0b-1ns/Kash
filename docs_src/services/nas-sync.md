# Service NAS Sync

Le service de synchronisation NAS transfère les fichiers vers un NAS distant via rsync.

## Fichier source

`backend/app/services/nas_sync_service.py`

## Fonctionnalités

- Test de connexion SSH
- Synchronisation fichier par fichier
- Synchronisation batch
- Suivi du statut en base de données

## Configuration requise

### Variables d'environnement

```bash
# Adresse IP ou hostname du NAS
NAS_HOST=192.168.1.100

# Utilisateur SSH
NAS_USER=admin

# Chemin de destination
NAS_PATH=/volume1/factures
```

### Prérequis NAS

1. **SSH activé** sur le NAS
2. **rsync installé** (généralement inclus)
3. **Clé SSH configurée** pour authentification sans mot de passe

### Configuration de la clé SSH

```bash
# Générer une clé (si nécessaire)
ssh-keygen -t ed25519 -C "finance-manager"

# Copier sur le NAS
ssh-copy-id admin@192.168.1.100

# Tester
ssh admin@192.168.1.100 "echo OK"
```

## Classes

### NASSyncError

Exception personnalisée pour les erreurs de synchronisation.

```python
class NASSyncError(Exception):
    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
```

### NASSyncService

Service principal de synchronisation.

```python
class NASSyncService:
    def is_configured(self) -> bool:
        """Vérifie si le NAS est configuré."""

    def get_config_status(self) -> dict:
        """Retourne le statut de la configuration."""

    def test_connection(self) -> tuple[bool, str]:
        """Teste la connexion SSH."""

    def sync_file(self, document: Document) -> tuple[bool, str]:
        """Synchronise un fichier spécifique."""

    def sync_all_pending(self, user_id: int) -> dict:
        """Synchronise tous les fichiers en attente."""

    def get_sync_stats(self, user_id: int) -> dict:
        """Retourne les statistiques de synchronisation."""
```

## Utilisation

```python
from app.services.nas_sync_service import get_nas_sync_service

# Créer le service
sync_service = get_nas_sync_service(db)

# Vérifier la configuration
if not sync_service.is_configured():
    print("NAS non configuré")
    return

# Tester la connexion
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

## Commande rsync

La synchronisation utilise rsync avec les options suivantes :

```bash
rsync -avz --progress \
  -e "ssh -o BatchMode=yes -o ConnectTimeout=30" \
  /app/uploads/document.jpg \
  user@nas:/volume1/factures/document.jpg
```

| Option | Description |
|--------|-------------|
| -a | Mode archive (préserve métadonnées) |
| -v | Mode verbose |
| -z | Compression pendant le transfert |
| --progress | Affiche la progression |
| BatchMode=yes | Pas de prompt interactif |
| ConnectTimeout=30 | Timeout de connexion 30s |

## Mise à jour en base

Après synchronisation réussie :

```python
document.synced_to_nas = True
document.synced_at = datetime.utcnow()
db.commit()
```

## Gestion des erreurs

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| Permission denied | Clé SSH non configurée | Configurer ssh-copy-id |
| Connection refused | SSH non activé | Activer SSH sur le NAS |
| Connection timeout | NAS inaccessible | Vérifier le réseau |
| No such file | Chemin invalide | Vérifier NAS_PATH |

### Timeout

- Connexion SSH : 30 secondes
- Transfert par fichier : 5 minutes

## Statistiques

```python
stats = sync_service.get_sync_stats(user_id=1)

# Exemple de retour
{
    "total_documents": 150,
    "synced": 142,
    "pending": 8,
    "sync_percentage": 94.7,
    "last_sync": "2024-01-15T14:30:00",
    "nas_configured": True
}
```

## Bonnes pratiques

### Sécurité

- Utiliser une clé SSH dédiée
- Limiter les permissions sur le NAS
- Ne pas exposer le NAS sur Internet

### Performance

- Synchroniser régulièrement (éviter les gros batchs)
- Utiliser une connexion réseau stable
- Prévoir suffisamment d'espace sur le NAS

### Fiabilité

- Vérifier les logs en cas d'échec
- Implémenter des retries automatiques (à venir)
- Monitorer l'espace disque NAS
