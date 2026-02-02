# Kash

**Gestionnaire de finances personnelles avec OCR et IA locale.**

Kash centralise vos factures, tickets de caisse et fiches de paie. Il extrait automatiquement les données grâce à l'OCR et l'IA, puis génère des dashboards et bilans mensuels.

## Fonctionnalités

- **Upload de documents** : Photos de tickets, PDFs de factures, fiches de paie
- **Extraction automatique** : OCR (PaddleOCR) + IA (Mistral 7B via Ollama)
- **Données extraites** : Date, marchand, articles, montants, devise
- **Dashboard** : Graphiques, évolution mensuelle, répartition par catégorie
- **Budgets** : Limites mensuelles par tag avec alertes visuelles
- **Tags** : Organisation personnalisée (pas de catégories fixes)
- **Multi-devise** : EUR, USD, GBP, CHF... avec conversion
- **Export** : CSV des documents et résumés mensuels
- **Rapports PDF** : Rapports mensuels et annuels avec graphiques.
- **Sync NAS** : Sauvegarde automatique vers NAS (SMB)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   PostgreSQL    │
│  React + Vite   │     │    FastAPI      │     │                 │
│     :3000       │     │     :8000       │     │     :5432       │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │    OCR    │ │  Ollama   │ │    NAS    │
             │ PaddleOCR │ │  Mistral  │ │   (SMB)   │
             │   :5001   │ │  :11434   │ │           │
             └───────────┘ └───────────┘ └───────────┘
```

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python 3.11 + FastAPI |
| Base de données | PostgreSQL 15 |
| OCR | PaddleOCR (microservice) |
| IA | Ollama + Mistral 7B |
| Graphiques | Recharts |
| Auth | JWT |
| Conteneurs | Docker Compose |

## Installation

### Prérequis

- Un PC standard est suffisant pour faire tourner l'application.
- Une carte graphique (GPU) est recommandée pour l'accélération matérielle des modèles d'IA (Ollama).
- Docker Desktop.
- 8 Go de RAM minimum.

### Démarrage rapide

```bash
# Cloner le repo
git clone https://github.com/votre-user/kash.git
cd kash

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres

# Lancer l'application
docker compose up -d

# Appliquer les migrations
docker compose exec backend alembic upgrade head
```

L'application est accessible sur :
- **Frontend** : http://localhost:3000
- **API** : http://localhost:8000
- **API Docs** : http://localhost:8000/docs

### Configuration NAS (optionnel)

```bash
# Monter le partage SMB sur Mac
mount -t smbfs //user:pass@nas-ip/share /Volumes/NAS

# Configurer dans .env
NAS_LOCAL_PATH=/Volumes/NAS/finance
NAS_MOUNT_PATH=/app/nas_backup
```

## Utilisation

### 1. Créer un compte

Accédez à http://localhost:3000 et créez votre compte.

### 2. Configurer vos tags

Créez des tags pour organiser vos documents (ex: Courses, Restaurant, Transport...).n
### 3. Uploader des documents

Glissez-déposez vos tickets et factures. L'extraction est automatique :
- OCR extrait le texte
- L'IA analyse et structure les données
- Les articles sont détaillés individuellement

### 4. Suivre vos finances

Le dashboard affiche :
- Solde du mois (revenus - dépenses)
- Évolution mensuelle
- Répartition par catégorie
- Progression des budgets
- Articles les plus achetés

## Documentation

La documentation technique est disponible dans `docs_src/` :

| Section | Description |
|---------|-------------|
| [Architecture](docs_src/architecture/overview.md) | Vue d'ensemble du système |
| [API](docs_src/api/) | Documentation des endpoints |
| [Services](docs_src/services/) | OCR, IA, Export, NAS Sync |
| [Configuration](docs_src/getting-started/configuration.md) | Variables d'environnement |

## Commandes utiles

```bash
# Logs en temps réel
docker compose logs -f backend

# Reconstruire après modifications
docker compose up -d --build

# Arrêter l'application
docker compose down

# Réinitialiser la base de données
docker compose down -v
docker compose up -d
docker compose exec backend alembic upgrade head
```

## Structure du projet

```
kash/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # Endpoints FastAPI
│   │   ├── core/            # Config, sécurité, BDD
│   │   ├── models/          # Modèles SQLAlchemy
│   │   ├── schemas/         # Schémas Pydantic
│   │   └── services/        # OCR, IA, Export, Sync, PDF
│   └── alembic/             # Migrations
├── frontend/
│   ├── src/
│   │   ├── components/      # Composants React
│   │   ├── pages/           # Pages de l'app
│   │   ├── hooks/           # Hooks personnalisés
│   │   └── services/        # Client API
│   └── package.json
├── ocr_service/             # Microservice OCR
├── docs_src/                # Documentation
├── docker compose.yml
└── .env.example
```

## Améliorations prévues

- Intégration de notifications pour les alertes de budget via :
  - Email
  - Discord
  - Telegram

## Licence

Projet personnel - Tous droits réservés.
