"""
Schémas Pydantic - Point d'entrée centralisé.

Importe tous les schémas pour un accès simplifié:
    from app.schemas import UserCreate, DocumentResponse, etc.
"""

from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    Token,
    TokenData,
)

from app.schemas.tag import (
    TagCreate,
    TagUpdate,
    TagResponse,
)

from app.schemas.item import (
    ItemCreate,
    ItemUpdate,
    ItemResponse,
)

from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentListResponse,
)

from app.schemas.budget import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BudgetWithSpending,
)

from app.schemas.currency import (
    CurrencyCreate,
    CurrencyUpdate,
    CurrencyResponse,
)

__all__ = [
    # User
    "UserCreate",
    "UserLogin",
    "UserUpdate",
    "UserResponse",
    "Token",
    "TokenData",
    # Tag
    "TagCreate",
    "TagUpdate",
    "TagResponse",
    # Item
    "ItemCreate",
    "ItemUpdate",
    "ItemResponse",
    # Document
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentResponse",
    "DocumentListResponse",
    # Budget
    "BudgetCreate",
    "BudgetUpdate",
    "BudgetResponse",
    "BudgetWithSpending",
    # Currency
    "CurrencyCreate",
    "CurrencyUpdate",
    "CurrencyResponse",
]
