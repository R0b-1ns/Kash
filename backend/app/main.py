"""
Point d'entrée de l'application FastAPI - Finance Manager.

Ce fichier configure:
- L'application FastAPI avec sa documentation OpenAPI
- Les middlewares (CORS)
- L'inclusion de toutes les routes API
- Les endpoints de santé

Pour lancer l'application:
    uvicorn app.main:app --reload

Documentation API disponible sur:
    - Swagger UI: http://localhost:8000/docs
    - ReDoc: http://localhost:8000/redoc
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import api_router

settings = get_settings()

# =============================================================================
# Configuration de l'application FastAPI
# =============================================================================

app = FastAPI(
    title=settings.app_name,
    description="""
## API de Gestion Financière Personnelle

Cette API permet de:
- **Uploader** des factures, tickets de caisse et fiches de paie
- **Extraire** automatiquement les données via OCR et IA
- **Catégoriser** les dépenses avec des tags personnalisés
- **Suivre** ses budgets mensuels par catégorie
- **Visualiser** ses dépenses via des statistiques

### Authentification
L'API utilise des tokens JWT. Pour obtenir un token:
1. Créer un compte via `POST /auth/register`
2. Se connecter via `POST /auth/login`
3. Utiliser le token dans le header `Authorization: Bearer <token>`
    """,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# =============================================================================
# Middleware CORS
# =============================================================================
# Permet les requêtes cross-origin depuis le frontend React

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Frontend en dev
        "http://127.0.0.1:3000",
        "http://frontend:3000",       # Frontend dans Docker
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Autorise toutes les méthodes HTTP
    allow_headers=["*"],              # Autorise tous les headers
)

# =============================================================================
# Inclusion des routes API
# =============================================================================
# Toutes les routes sont préfixées par /api/v1

app.include_router(api_router, prefix="/api/v1")


# =============================================================================
# Endpoints racine et santé
# =============================================================================

@app.get("/", tags=["Root"])
async def root():
    """
    Endpoint racine - Informations de base sur l'API.
    """
    return {
        "message": "Finance Manager API",
        "version": "0.1.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Endpoint de santé - Utilisé par Docker pour vérifier que l'app tourne.
    """
    return {"status": "healthy"}
