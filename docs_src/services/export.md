# Services d'Export et Rapports

Ce module regroupe les services backend pour l'exportation de données en différents formats (CSV, PDF) et la génération de rapports avec des graphiques.

## Fichiers sources

- `backend/app/services/export_service.py`
- `backend/app/services/pdf_service.py`

## Fonctionnalités

- Export des documents en CSV
- Export du résumé mensuel en CSV
- Génération de rapports mensuels PDF avec graphiques
- Génération de rapports annuels PDF avec graphiques
- Export de graphiques individuels en PNG
- Filtrage par dates, tags (pour CSV)
- Option détail des articles (pour CSV)

## Classe ExportService

```python
class ExportService:
    def __init__(self, db: Session, user_id: int):
        """
        Initialise le service d'export.

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur (filtre les données)
        """

    def export_documents_csv(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        tag_ids: list[int] | None = None,
        include_items: bool = False
    ) -> str:
        """
        Exporte les documents en CSV.

        Returns:
            Contenu CSV sous forme de chaîne
        """

    def export_monthly_summary_csv(
        self,
        year: int,
        month: int
    ) -> str:
        """
        Exporte le résumé mensuel en CSV.

        Returns:
            Contenu CSV avec totaux et répartition
        """
```

## Classe PDFReportService

Le `PDFReportService` est responsable de la génération de rapports PDF détaillés et de l'exportation de graphiques individuels au format PNG. Il utilise `ReportLab` pour la mise en page des PDF et `Matplotlib` pour créer des visualisations de données.

```python
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg') # Utilisation du backend sans GUI
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Image, Table, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

class PDFReportService:
    def __init__(self, db: Session, user_id: int):
        """
        Initialise le service de rapports PDF.

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur (filtre les données)
        """

    def generate_monthly_report(self, year: int, month: int) -> bytes:
        """
        Génère un rapport financier mensuel complet en PDF avec graphiques.

        Returns:
            Contenu du fichier PDF sous forme de bytes.
        """

    def generate_annual_report(self, year: int) -> bytes:
        """
        Génère un rapport financier annuel complet en PDF avec graphiques.

        Returns:
            Contenu du fichier PDF sous forme de bytes.
        """

    def export_chart(self, chart_type: str, params: dict) -> bytes:
        """
        Exporte un graphique individuel (pie, bar, line, donut, area) en PNG.

        Args:
            chart_type: Type de graphique à générer.
            params: Paramètres spécifiques au graphique (ex: 'month').

        Returns:
            Contenu du fichier PNG sous forme de bytes.
        """
```

## Utilisation

```python
from app.services.export_service import get_export_service
from app.services.pdf_service import get_pdf_service

# Créer les services
export_service = get_export_service(db, user_id=1)
pdf_service = get_pdf_service(db, user_id=1)

# Export des documents CSV
csv_content = export_service.export_documents_csv(
    start_date=date(2024, 1, 1),
    end_date=date(2024, 1, 31),
    tag_ids=[1, 2],
    include_items=True
)

# Sauvegarder le fichier CSV
with open("export.csv", "w", encoding="utf-8-sig") as f:
    f.write(csv_content)

# Générer un rapport mensuel PDF
pdf_content = pdf_service.generate_monthly_report(2024, 1)

# Sauvegarder le fichier PDF
with open("rapport_mensuel.pdf", "wb") as f:
    f.write(pdf_content)

# Exporter un graphique PNG
png_content = pdf_service.export_chart("donut", {"month": "2024-01"})

# Sauvegarder le fichier PNG
with open("graphique_donut.png", "wb") as f:
    f.write(png_content)
```

## Formats de sortie

### Export documents (sans items)

```csv
ID;Date;Heure;Marchand;Lieu;Type;Montant;Devise;Type transaction;Tags;Fichier original
1;2024-01-15;14:30:00;Carrefour;Paris;receipt;45.67;EUR;Dépense;Courses;ticket.jpg
```

| Colonne | Description |
|---------|-------------|
| ID | Identifiant unique |
| Date | Date du document (YYYY-MM-DD) |
| Heure | Heure si disponible (HH:MM:SS) |
| Marchand | Nom du commerce |
| Lieu | Adresse/ville |
| Type | Type de document |
| Montant | Montant total |
| Devise | Code devise (EUR, USD...) |
| Type transaction | Revenu ou Dépense |
| Tags | Tags séparés par virgule |
| Fichier original | Nom du fichier uploadé |

### Export documents (avec items)

```csv
ID Document;Date;Marchand;Article;Quantité;Unité;Prix unitaire;Prix total;Catégorie article;Tags document
1;2024-01-15;Carrefour;Pommes Golden;1.50;kg;2.99;4.49;Fruits;Courses
1;2024-01-15;Carrefour;Baguette;2.00;;1.20;2.40;Boulangerie;Courses
```

### Export mensuel CSV

```csv
Résumé mensuel;2024-01

Métrique;Valeur
Total dépenses;1250.75 EUR
Total revenus;3500.00 EUR
Solde;2249.25 EUR
Nombre de transactions;42

Dépenses par catégorie
Tag;Montant;Pourcentage
Courses;450.30 EUR;36.0%
Transport;180.00 EUR;14.4%
```

### Rapports PDF

Les rapports PDF (mensuels et annuels) offrent une mise en page structurée avec un résumé financier, des tableaux et des graphiques générés dynamiquement.

### Graphiques PNG

Les exports de graphiques PNG fournissent des images haute résolution des visualisations de données.

## Configuration CSV

```python
# Séparateur : point-virgule (Excel FR)
writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
```

## Encodage

Les fichiers sont générés en UTF-8 avec BOM pour compatibilité Excel :

```python
# Dans la route API
return StreamingResponse(
    iter([csv_content]),
    media_type="text/csv; charset=utf-8",
    headers={
        "Content-Disposition": f'attachment; filename="{filename}"',
    }
)
```

## Performances

| Nombre de documents | Temps de génération |
|---------------------|---------------------|
| 100 | < 1s |
| 1000 | 2-3s |
| 10000 | 10-15s |

Pour les gros exports, la génération est faite en streaming pour éviter les problèmes de mémoire.
