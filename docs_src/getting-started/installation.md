# Installation

## Prérequis

- **Docker** et **Docker Compose** installés
- **Mac M1/M2** ou Linux (architecture ARM64 ou AMD64)
- Au moins **8 Go de RAM** (pour Ollama)
- **10 Go d'espace disque** (modèles IA + données)

## Installation avec Docker

### 1. Cloner le projet

```bash
git clone <repository-url>
cd gestionnaireDeFinance
```

### 2. Configurer l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer les variables (optionnel)
nano .env
```

Variables importantes :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SECRET_KEY` | Clé secrète JWT | À changer en production |
| `DATABASE_URL` | URL PostgreSQL | Configuré pour Docker |
| `OLLAMA_MODEL` | Modèle LLM | `mistral` |
| `NAS_HOST` | IP du NAS | Vide (optionnel) |

### 3. Lancer les services

```bash
# Démarrer tous les services
docker compose up -d

# Voir les logs
docker compose logs -f
```

### 4. Initialiser la base de données

```bash
# Exécuter les migrations
docker compose exec backend alembic upgrade head
```

### 5. Télécharger le modèle IA

```bash
# Télécharger Mistral (3.8 Go)
docker compose exec ollama ollama pull mistral
```

!!! note "Premier téléchargement"
    Le téléchargement du modèle peut prendre plusieurs minutes selon votre connexion.

## Vérification

### Accès aux services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Interface utilisateur |
| Backend | http://localhost:8000 | API REST |
| Swagger | http://localhost:8000/docs | Documentation API |
| Ollama | http://localhost:11434 | API LLM |

### Test de l'API

```bash
# Vérifier que l'API répond
curl http://localhost:8000/health

# Réponse attendue
{"status": "healthy"}
```

## Commandes utiles

```bash
# Arrêter les services
docker compose down

# Reconstruire les images
docker compose build --no-cache

# Voir l'état des conteneurs
docker compose ps

# Accéder au shell du backend
docker compose exec backend bash

# Voir les logs d'un service
docker compose logs -f backend
```

## Dépannage

### Erreur de connexion à PostgreSQL

```bash
# Vérifier que postgres est démarré
docker compose ps postgres

# Recréer le conteneur si nécessaire
docker compose rm -f postgres
docker compose up -d postgres
```

### Ollama ne répond pas

```bash
# Vérifier les logs
docker compose logs ollama

# Le modèle est-il téléchargé ?
docker compose exec ollama ollama list
```

### OCR lent sur Mac M1

PaddleOCR utilise le CPU par défaut. Les performances sont acceptables mais pas optimales. Pour des documents complexes, prévoyez quelques secondes de traitement.
