# Instructions pour Claude - Kash

## Contexte du projet
**Kash** est une application web personnelle de gestion financière qui :
- Centralise les factures, tickets de caisse et fiches de paie
- Extrait automatiquement les données via OCR + IA
- Génère des dashboards et bilans mensuels
- Tourne en local sur Docker (Mac M1)
- Synchronise les fichiers vers un NAS Ugreen (via SMB)

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Python 3.11 + FastAPI |
| Frontend | React 18 + Vite + Tailwind CSS |
| Base de données | PostgreSQL 15 |
| OCR | PaddleOCR (microservice séparé) |
| IA | Ollama + Mistral 7B |
| Graphiques | Recharts |
| Auth | JWT (HS256, expire 7 jours) |
| Conteneurs | Docker Compose (5 services) |
| Sync NAS | Montage SMB/CIFS |

## Architecture des services Docker

```
┌─────────────────────────────────────────────────────────────────┐
│                        docker compose                           │
├──────────┬──────────┬──────────┬──────────┬────────────────────┤
│ frontend │ backend  │ postgres │  ollama  │    ocr-service     │
│  :3000   │  :8000   │  :5432   │  :11434  │       :5001        │
│  React   │ FastAPI  │   BDD    │ Mistral  │    PaddleOCR       │
└──────────┴────┬─────┴──────────┴────┬─────┴────────────────────┘
                │                      │
                └──────────────────────┘
                   Appels HTTP internes
```

## Structure du projet

```
gestionnaireDeFinance/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # Dépendances (get_db, get_current_user)
│   │   │   └── routes/
│   │   │       ├── auth.py          # POST /register, /login, GET /me
│   │   │       ├── documents.py     # CRUD + upload + tags
│   │   │       ├── tags.py          # CRUD tags
│   │   │       ├── budgets.py       # CRUD + /current
│   │   │       ├── stats.py         # /summary, /by-tag, /monthly, /top-items
│   │   │       ├── export.py        # Export CSV
│   │   │       ├── sync.py          # Synchronisation NAS
│   │   │       ├── currencies.py    # Gestion devises
│   │   │       └── items.py         # CRUD items
│   │   ├── core/
│   │   │   ├── config.py            # Settings (Pydantic)
│   │   │   ├── database.py          # SQLAlchemy engine
│   │   │   └── security.py          # JWT + bcrypt
│   │   ├── models/                  # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   ├── item.py
│   │   │   ├── tag.py
│   │   │   ├── budget.py
│   │   │   └── currency.py
│   │   ├── schemas/                 # Pydantic schemas (input only)
│   │   │   ├── converters.py        # SQLAlchemy → dict (évite récursion)
│   │   │   └── *.py
│   │   ├── services/
│   │   │   ├── ocr_service.py       # Client HTTP → microservice OCR
│   │   │   ├── ai_service.py        # Client Ollama + parsing JSON
│   │   │   ├── document_processor.py # Pipeline OCR → IA → BDD
│   │   │   ├── nas_sync_service.py  # Sync SMB (copie fichiers)
│   │   │   ├── export_service.py    # Génération CSV
│   │   │   └── currency_service.py  # Conversion devises
│   │   └── main.py
│   ├── alembic/                     # Migrations BDD
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx           # Sidebar + Header
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── dashboard/           # Composants graphiques
│   │   │       ├── StatCard.tsx
│   │   │       ├── MonthlyChart.tsx
│   │   │       ├── TagPieChart.tsx
│   │   │       ├── BudgetProgress.tsx
│   │   │       ├── TopExpenses.tsx
│   │   │       └── TopItems.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DocumentsPage.tsx    # Upload + liste + edit modal
│   │   │   ├── TagsPage.tsx
│   │   │   ├── BudgetsPage.tsx
│   │   │   └── SettingsPage.tsx     # Export + Sync NAS
│   │   ├── hooks/
│   │   │   └── useAuth.tsx          # Context auth
│   │   ├── services/
│   │   │   └── api.ts               # Client Axios
│   │   ├── types/
│   │   │   └── index.ts             # Interfaces TypeScript
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── ocr_service/                     # Microservice OCR (Python/Flask)
│   ├── app.py                       # Endpoint POST /ocr
│   ├── requirements.txt             # PaddleOCR + dependencies
│   └── Dockerfile
├── ollama/
│   └── entrypoint.sh                # Auto-téléchargement du modèle
├── docker compose.yml
├── .env.example
├── CLAUDE.md                        # Ce fichier
├── AMELIORATIONS.md                 # Roadmap des améliorations futures
└── history.md                       # Historique des décisions
```

## Commandes importantes

```bash
# Lancer l'application
docker compose up -d

# Voir les logs
docker compose logs -f backend
docker compose logs -f ocr-service
docker compose logs -f ollama

# Migrations BDD
docker compose exec backend alembic upgrade head

# Rebuild après changements
docker compose up -d --build

# Redémarrer un service
docker compose restart backend
```

## Configuration (.env)

```env
# Sécurité
SECRET_KEY=your-super-secret-key

# Base de données
DATABASE_URL=postgresql://finance:finance@postgres:5432/finance_db

# Ollama
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral

# OCR Microservice
OCR_SERVICE_URL=http://ocr-service:5001

# NAS Sync (SMB)
NAS_LOCAL_PATH=/Volumes/NAS/finance    # Chemin sur le Mac
NAS_MOUNT_PATH=/app/nas_backup          # Chemin dans le container
```

## API Endpoints (préfixe: /api/v1)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/auth/register` | POST | Inscription |
| `/auth/login` | POST | Connexion (retourne JWT) |
| `/auth/me` | GET | Utilisateur courant |
| `/documents` | GET | Liste documents (filtres, pagination) |
| `/documents/upload` | POST | Upload + OCR + IA |
| `/documents/{id}` | GET/PUT/DELETE | CRUD document |
| `/documents/{id}/reprocess` | POST | Relancer OCR + IA |
| `/tags` | GET/POST | Liste/Créer tags |
| `/tags/{id}` | GET/PUT/DELETE | CRUD tag |
| `/budgets` | GET/POST | Liste/Créer budgets |
| `/budgets/current` | GET | Budgets du mois avec dépenses |
| `/stats/summary` | GET | Résumé mensuel |
| `/stats/by-tag` | GET | Dépenses par tag |
| `/stats/monthly` | GET | Évolution mois par mois |
| `/stats/top-items` | GET | Articles les plus achetés |
| `/export/documents/csv` | GET | Export CSV |
| `/sync/status` | GET | Statut sync NAS |
| `/sync/run` | POST | Lancer synchronisation |

## Pipeline de traitement des documents

```
1. Upload fichier (image/PDF)
       ↓
2. Microservice OCR (PaddleOCR)
   → Texte brut + score confiance
       ↓
3. Ollama/Mistral
   → JSON structuré (type, date, marchand, items, montant)
   → Suggestion de tags parmi les tags existants
       ↓
4. Sauvegarde en BDD
   → Document + Items + Tags assignés
       ↓
5. (Optionnel) Sync vers NAS
   → Structure: année/mois/type/fichier
```

## Notes importantes

- **Schémas Pydantic**: Les réponses API utilisent des dicts (via `converters.py`) pour éviter la récursion avec SQLAlchemy
- **Dates**: Utilise `COALESCE(date, created_at)` pour les stats quand la date n'est pas extraite
- **Decimals**: Sérialisés en strings dans le JSON, convertis en numbers côté frontend
- **Sync NAS**: Via montage SMB (plus simple que SSH/rsync)
- **Tags IA**: L'IA suggère des tags parmi ceux de l'utilisateur
- Consulter `history.md` pour l'historique complet des décisions
- Consulter `AMELIORATIONS.md` pour la roadmap des features futures
