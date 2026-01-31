"""
Routes pour l'export des données.

Endpoints:
- GET /export/documents/csv : Export CSV des documents
- GET /export/monthly/csv : Export CSV du résumé mensuel
"""

from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.export_service import get_export_service

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/documents/csv")
def export_documents_csv(
    start_date: Optional[date] = Query(None, description="Date de début"),
    end_date: Optional[date] = Query(None, description="Date de fin"),
    tag_ids: Optional[List[int]] = Query(None, description="Filtrer par tags"),
    include_items: bool = Query(False, description="Inclure le détail des articles"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exporte les documents en CSV.

    Le fichier CSV contient :
    - Sans items : une ligne par document (ID, date, marchand, montant, tags, etc.)
    - Avec items : une ligne par article (document, article, quantité, prix, etc.)

    Le séparateur est le point-virgule (;) pour compatibilité Excel FR.

    Args:
        start_date: Filtrer à partir de cette date
        end_date: Filtrer jusqu'à cette date
        tag_ids: Filtrer par ces tags
        include_items: Inclure le détail des articles

    Returns:
        Fichier CSV en téléchargement
    """
    export_service = get_export_service(db, current_user.id)

    csv_content = export_service.export_documents_csv(
        start_date=start_date,
        end_date=end_date,
        tag_ids=tag_ids,
        include_items=include_items
    )

    # Générer le nom du fichier
    filename_parts = ["documents"]
    if start_date:
        filename_parts.append(f"from_{start_date.isoformat()}")
    if end_date:
        filename_parts.append(f"to_{end_date.isoformat()}")
    if include_items:
        filename_parts.append("details")
    filename = "_".join(filename_parts) + ".csv"

    # Retourner comme fichier téléchargeable
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8"
        }
    )


@router.get("/monthly/csv")
def export_monthly_csv(
    year: int = Query(..., ge=2000, le=2100, description="Année"),
    month: int = Query(..., ge=1, le=12, description="Mois (1-12)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exporte le résumé mensuel en CSV.

    Contient :
    - Totaux (dépenses, revenus, solde)
    - Répartition par catégorie
    - Nombre de transactions

    Args:
        year: Année du rapport
        month: Mois du rapport (1-12)

    Returns:
        Fichier CSV en téléchargement
    """
    export_service = get_export_service(db, current_user.id)

    csv_content = export_service.export_monthly_summary_csv(year, month)

    filename = f"resume_{year}-{month:02d}.csv"

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8"
        }
    )
