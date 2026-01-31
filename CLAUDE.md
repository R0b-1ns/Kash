# Instructions pour Claude - Gestionnaire de Finance

## Contexte du projet
Application web personnelle de gestion financière qui :
- Centralise les factures, tickets de caisse et fiches de paie
- Extrait automatiquement les données via OCR + IA
- Génère des dashboards et bilans mensuels
- Tourne en local sur Docker (Mac M1)
- Synchronise les fichiers vers un NAS Ugreen

## Stack technique
| Composant | Technologie |
|-----------|-------------|
| Backend | Python 3.11 + FastAPI |
| Frontend | React 18 + Vite + Tailwind CSS |
| Base de données | PostgreSQL 15 |
| OCR | PaddleOCR |
| IA | Ollama + Mistral 7B |
| Graphiques | Recharts |
| Auth | JWT |
| Conteneurs | Docker Compose |

## Structure du projet
```
gestionnaireDeFinance/
├── backend/
│   ├── app/
│   │   ├── api/           # Routes FastAPI
│   │   ├── core/          # Config, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic (OCR, IA)
│   │   └── main.py
│   ├── alembic/           # Migrations BDD
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/      # API calls
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── CLAUDE.md
└── history.md
```

## Commandes importantes
```bash
# Lancer l'application
docker-compose up -d

# Voir les logs
docker-compose logs -f backend

# Migrations BDD
docker-compose exec backend alembic upgrade head

# Rebuild après changements
docker-compose up -d --build
```

## Phases de développement
1. Infrastructure Docker + BDD
2. Backend API Core + Auth
3. OCR + IA (PaddleOCR + Ollama)
4. Frontend Base (React + Auth)
5. Dashboard + Graphiques
6. Features avancées (budgets, export, sync NAS)

## Notes importantes
- Toujours consulter history.md pour l'historique des décisions
- Les fichiers uploadés sont stockés localement puis synchronisés vers le NAS via rsync
- Multi-devise supporté (EUR par défaut, conversion automatique)
- Système de tags personnalisables (pas de catégories fixes)
- Chaque ligne d'un ticket de caisse = 1 item en BDD
