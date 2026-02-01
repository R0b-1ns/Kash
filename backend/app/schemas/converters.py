"""
Convertisseurs de modèles SQLAlchemy vers schémas Pydantic.

Ces fonctions permettent de convertir manuellement les objets SQLAlchemy
en schémas Pydantic, évitant ainsi les problèmes de récursion infinie
causés par from_attributes = True avec des relations bidirectionnelles.
"""

from typing import List, Optional
from app.models.document import Document
from app.models.tag import Tag
from app.models.item import Item
from app.models.budget import Budget
from app.models.user import User
from app.models.currency import Currency


def user_to_response(user: User) -> dict:
    """Convertit un User SQLAlchemy en dict pour UserResponse."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "created_at": user.created_at,
    }


def currency_to_response(currency: Currency) -> dict:
    """Convertit un Currency SQLAlchemy en dict pour CurrencyResponse."""
    return {
        "id": currency.id,
        "code": currency.code,
        "name": currency.name,
        "symbol": currency.symbol,
        "rate_to_eur": currency.rate_to_eur,
        "updated_at": currency.updated_at,
    }


def tag_to_simple(tag: Tag) -> dict:
    """Convertit un Tag SQLAlchemy en dict pour TagSimple."""
    return {
        "id": tag.id,
        "name": tag.name,
        "color": tag.color,
        "icon": tag.icon,
    }


def tag_to_response(tag: Tag) -> dict:
    """Convertit un Tag SQLAlchemy en dict pour TagResponse."""
    return {
        "id": tag.id,
        "name": tag.name,
        "color": tag.color,
        "icon": tag.icon,
        "created_at": tag.created_at,
    }


def item_to_simple(item: Item) -> dict:
    """Convertit un Item SQLAlchemy en dict pour ItemSimple."""
    return {
        "id": item.id,
        "name": item.name,
        "quantity": item.quantity,
        "unit": item.unit,
        "unit_price": item.unit_price,
        "total_price": item.total_price,
        "category": item.category,
    }


def item_to_response(item: Item) -> dict:
    """Convertit un Item SQLAlchemy en dict pour ItemResponse."""
    return {
        "id": item.id,
        "document_id": item.document_id,
        "name": item.name,
        "quantity": item.quantity,
        "unit": item.unit,
        "unit_price": item.unit_price,
        "total_price": item.total_price,
        "category": item.category,
        "created_at": item.created_at,
    }


def document_to_response(doc: Document) -> dict:
    """Convertit un Document SQLAlchemy en dict pour DocumentResponse."""
    return {
        "id": doc.id,
        "file_path": doc.file_path,
        "original_name": doc.original_name,
        "file_type": doc.file_type,
        "doc_type": doc.doc_type,
        "date": doc.date,
        "time": doc.time,
        "merchant": doc.merchant,
        "location": doc.location,
        "total_amount": doc.total_amount,
        "currency": doc.currency,
        "is_income": doc.is_income,
        "ocr_raw_text": doc.ocr_raw_text,
        "ocr_confidence": doc.ocr_confidence,
        "synced_to_nas": doc.synced_to_nas,
        "synced_at": doc.synced_at,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "tags": [tag_to_simple(t) for t in doc.tags] if doc.tags else [],
        "items": [item_to_simple(i) for i in doc.items] if doc.items else [],
    }


def document_to_list_response(doc: Document) -> dict:
    """Convertit un Document SQLAlchemy en dict pour DocumentListResponse."""
    return {
        "id": doc.id,
        "file_path": doc.file_path,  # Nécessaire pour savoir si le doc a un fichier
        "original_name": doc.original_name,
        "file_type": doc.file_type,
        "doc_type": doc.doc_type,
        "date": doc.date,
        "merchant": doc.merchant,
        "total_amount": doc.total_amount,
        "currency": doc.currency,
        "is_income": doc.is_income,
        "created_at": doc.created_at,
        "tags": [tag_to_simple(t) for t in doc.tags] if doc.tags else [],
    }


def budget_to_response(budget: Budget) -> dict:
    """Convertit un Budget SQLAlchemy en dict pour BudgetResponse."""
    return {
        "id": budget.id,
        "tag_id": budget.tag_id,
        "month": budget.month,
        "limit_amount": budget.limit_amount,
        "currency": budget.currency,
        "created_at": budget.created_at,
        "updated_at": budget.updated_at,
        "tag": tag_to_simple(budget.tag) if budget.tag else None,
    }
