# Finance Manager

Gestionnaire de finances personnel avec OCR et IA locale.

## Fonctionnalités

- **Upload de documents** : Photos de tickets, factures PDF, fiches de paie
- **OCR intelligent** : Extraction automatique du texte avec PaddleOCR
- **IA locale** : Catégorisation et extraction de données avec Ollama/Mistral
- **Dashboard interactif** : Graphiques, statistiques, suivi de budget
- **Tags personnalisables** : Système de catégorisation flexible
- **Multi-devises** : Support des devises pour les voyages
- **Export CSV** : Exportez vos données facilement
- **Synchronisation NAS** : Sauvegarde automatique vers votre NAS

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Frontend | React 18, TypeScript, Tailwind CSS |
| OCR | PaddleOCR |
| IA | Ollama avec Mistral 7B |
| Conteneurisation | Docker Compose |

## Démarrage rapide

```bash
# Cloner le projet
git clone <repository>
cd gestionnaireDeFinance

# Configurer l'environnement
cp .env.example .env

# Lancer avec Docker
docker compose up -d

# Accéder à l'application
open http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│                   http://localhost:3000                  │
└───────────────────────┬─────────────────────────────────┘
                        │ API REST
┌───────────────────────▼─────────────────────────────────┐
│                   Backend (FastAPI)                      │
│                   http://localhost:8000                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   OCR   │  │   IA    │  │  Export │  │   Sync  │    │
│  │ Service │  │ Service │  │ Service │  │ Service │    │
│  └────┬────┘  └────┬────┘  └─────────┘  └────┬────┘    │
│       │            │                          │         │
│       ▼            ▼                          ▼         │
│  ┌─────────┐  ┌─────────┐              ┌─────────┐     │
│  │PaddleOCR│  │ Ollama  │              │  rsync  │     │
│  └─────────┘  └─────────┘              └────┬────┘     │
└─────────────────────┬───────────────────────│──────────┘
                      │                       │
              ┌───────▼───────┐        ┌──────▼──────┐
              │  PostgreSQL   │        │     NAS     │
              └───────────────┘        └─────────────┘
```

## Liens utiles

- [Guide d'installation](getting-started/installation.md)
- [Configuration](getting-started/configuration.md)
- [API Reference](api/auth.md)
- [Documentation Swagger](http://localhost:8000/docs)
