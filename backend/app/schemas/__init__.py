"""
Schémas Pydantic - Point d'entrée centralisé.

ARCHITECTURE:
- Les schémas *Create et *Update sont utilisés pour valider les entrées
- Les réponses API retournent des dicts via les fonctions de conversion
- Cela évite la récursion infinie causée par les relations SQLAlchemy
"""

# =============================================================================
# Schémas d'entrée (validation des requêtes)
# =============================================================================

from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    Token,
    TokenData,
)

from app.schemas.tag import (
    TagCreate,
    TagUpdate,
)

from app.schemas.item import (
    ItemCreate,
    ItemUpdate,
)

from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentManualCreate,
)

from app.schemas.budget import (
    BudgetCreate,
    BudgetUpdate,
)

from app.schemas.currency import (
    CurrencyCreate,
    CurrencyUpdate,
)

# =============================================================================
# Converters (SQLAlchemy -> dict)
# =============================================================================

from app.schemas.converters import (
    user_to_response,
    currency_to_response,
    tag_to_simple,
    tag_to_response,
    item_to_simple,
    item_to_response,
    document_to_response,
    document_to_list_response,
    budget_to_response,
)

__all__ = [
    # User
    "UserCreate",
    "UserLogin",
    "UserUpdate",
    "Token",
    "TokenData",
    # Tag
    "TagCreate",
    "TagUpdate",
    # Item
    "ItemCreate",
    "ItemUpdate",
    # Document
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentManualCreate",
    # Budget
    "BudgetCreate",
    "BudgetUpdate",
    # Currency
    "CurrencyCreate",
    "CurrencyUpdate",
    # Converters
    "user_to_response",
    "currency_to_response",
    "tag_to_simple",
    "tag_to_response",
    "item_to_simple",
    "item_to_response",
    "document_to_response",
    "document_to_list_response",
    "budget_to_response",
]
