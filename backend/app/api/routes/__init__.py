"""
Routes API - Point d'entrée centralisé.

Ce module agrège toutes les routes de l'API pour simplifier l'import
dans le fichier main.py.

Structure des routes:
- /auth : Authentification (register, login, me)
- /documents : Gestion des factures/tickets
- /tags : Gestion des tags personnalisés
- /budgets : Gestion des budgets mensuels
- /budget-templates : Templates de budget réutilisables
- /items : Gestion des articles
- /item-aliases : Regroupement d'articles similaires
- /stats : Statistiques et dashboard
- /currencies : Gestion des devises
- /export : Export des données (CSV)
- /sync : Synchronisation vers le NAS
- /recurring : Gestion des documents récurrents (abonnements)
"""

from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.documents import router as documents_router
from app.api.routes.tags import router as tags_router
from app.api.routes.budgets import router as budgets_router
from app.api.routes.budget_templates import router as budget_templates_router
from app.api.routes.items import router as items_router
from app.api.routes.item_aliases import router as item_aliases_router
from app.api.routes.stats import router as stats_router
from app.api.routes.currencies import router as currencies_router
from app.api.routes.export import router as export_router
from app.api.routes.sync import router as sync_router
from app.api.routes.recurring import router as recurring_router

# Router principal qui agrège toutes les routes
api_router = APIRouter()

# Inclusion des sous-routers
api_router.include_router(auth_router)
api_router.include_router(documents_router)
api_router.include_router(tags_router)
api_router.include_router(budgets_router)
api_router.include_router(budget_templates_router)
api_router.include_router(items_router)
api_router.include_router(item_aliases_router)
api_router.include_router(stats_router)
api_router.include_router(currencies_router)
api_router.include_router(export_router)
api_router.include_router(sync_router)
api_router.include_router(recurring_router)
