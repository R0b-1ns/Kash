"""
Services métier de l'application Finance Manager.

Ce package contient les services pour:
- OCR: Extraction de texte des images et PDF
- IA: Analyse et extraction de données structurées
- Document Processing: Orchestration du pipeline complet
- Export: Génération de fichiers CSV
- NAS Sync: Synchronisation des fichiers vers le NAS
- Currency: Gestion des devises et conversions
"""

from app.services.ocr_service import (
    OCRService,
    OCRResult,
    get_ocr_service,
    extract_text_from_file,
)

from app.services.ai_service import (
    AIService,
    ExtractionResult,
    ExtractedItem,
    get_ai_service,
    extract_structured_data,
)

from app.services.document_processor import (
    DocumentProcessor,
    ProcessingError,
    get_document_processor,
    process_document,
    reprocess_document,
)

from app.services.export_service import (
    ExportService,
    get_export_service,
)

from app.services.nas_sync_service import (
    NASSyncService,
    NASSyncError,
    get_nas_sync_service,
)

from app.services.currency_service import (
    CurrencyService,
    get_currency_service,
)

__all__ = [
    # OCR
    "OCRService",
    "OCRResult",
    "get_ocr_service",
    "extract_text_from_file",
    # IA
    "AIService",
    "ExtractionResult",
    "ExtractedItem",
    "get_ai_service",
    "extract_structured_data",
    # Document Processing
    "DocumentProcessor",
    "ProcessingError",
    "get_document_processor",
    "process_document",
    "reprocess_document",
    # Export
    "ExportService",
    "get_export_service",
    # NAS Sync
    "NASSyncService",
    "NASSyncError",
    "get_nas_sync_service",
    # Currency
    "CurrencyService",
    "get_currency_service",
]
