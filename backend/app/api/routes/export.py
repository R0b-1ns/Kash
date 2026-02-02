"""
Routes pour l'export des données.

Endpoints:
- GET /export/documents/csv : Export CSV des documents
- GET /export/monthly/csv : Export CSV du résumé mensuel
- GET /export/monthly/pdf : Export PDF du rapport mensuel avec graphiques
- GET /export/annual/pdf : Export PDF du rapport annuel
- GET /export/chart/{chart_type} : Export d'un graphique individuel en PNG
"""

from datetime import date
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, Query, Path
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.export_service import get_export_service
from app.services.pdf_service import get_pdf_service

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


@router.get("/monthly/pdf")
def export_monthly_pdf(
    year: int = Query(..., ge=2000, le=2100, description="Année"),
    month: int = Query(..., ge=1, le=12, description="Mois (1-12)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Génère le rapport PDF mensuel avec graphiques.

    Le rapport contient :
    - Résumé du mois (dépenses, revenus, solde, épargne)
    - Comparaison avec le mois précédent
    - Répartition par catégorie (graphique donut)
    - Évolution sur 6 mois (graphique barres)
    - Top 5 dépenses et marchands
    - Suivi des budgets
    - Charges fixes récurrentes

    Args:
        year: Année du rapport
        month: Mois du rapport (1-12)

    Returns:
        Fichier PDF en téléchargement
    """
    pdf_service = get_pdf_service(db, current_user.id)

    pdf_content = pdf_service.generate_monthly_report(year, month)

    # Nom du fichier
    month_names = [
        '', 'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'
    ]
    filename = f"bilan_{month_names[month]}_{year}.pdf"

    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf"
        }
    )


@router.get("/annual/pdf")
def export_annual_pdf(
    year: int = Query(..., ge=2000, le=2100, description="Année"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Génère le rapport PDF annuel récapitulatif.

    Le rapport contient :
    - Résumé de l'année (dépenses totales, revenus, solde, taux d'épargne)
    - Évolution mensuelle (graphique ligne)
    - Tableau comparatif mois par mois
    - Répartition annuelle par catégorie (graphique donut)
    - Top 10 dépenses de l'année
    - Top 10 marchands de l'année

    Args:
        year: Année du rapport

    Returns:
        Fichier PDF en téléchargement
    """
    pdf_service = get_pdf_service(db, current_user.id)

    pdf_content = pdf_service.generate_annual_report(year)

    filename = f"bilan_annuel_{year}.pdf"

    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf"
        }
    )


@router.get("/chart/{chart_type}")
def export_chart(
    chart_type: Literal["pie", "bar", "line", "donut", "area"] = Path(
        ...,
        description="Type de graphique à exporter"
    ),
    month: Optional[str] = Query(
        None,
        pattern=r"^\d{4}-\d{2}$",
        description="Mois pour le graphique (YYYY-MM)"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exporte un graphique individuel en PNG.

    Types de graphiques disponibles :
    - pie : Camembert de répartition par catégorie
    - donut : Anneau de répartition par catégorie
    - bar : Barres d'évolution mensuelle
    - line : Ligne d'évolution sur 12 mois
    - area : Aires d'évolution

    Args:
        chart_type: Type de graphique (pie, bar, line, donut, area)
        month: Mois à afficher (optionnel, format YYYY-MM)

    Returns:
        Image PNG en téléchargement
    """
    pdf_service = get_pdf_service(db, current_user.id)

    params = {}
    if month:
        params['month'] = month

    png_content = pdf_service.export_chart(chart_type, params)

    # Nom du fichier
    filename_base = f"graphique_{chart_type}"
    if month:
        filename_base += f"_{month}"
    filename = f"{filename_base}.png"

    return StreamingResponse(
        iter([png_content]),
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "image/png"
        }
    )
