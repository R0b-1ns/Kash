# Service Export

Le service d'export génère des fichiers CSV à partir des données.

## Fichier source

`backend/app/services/export_service.py`

## Fonctionnalités

- Export des documents en CSV
- Export du résumé mensuel
- Filtrage par dates, tags
- Option détail des articles

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

## Utilisation

```python
from app.services.export_service import get_export_service

# Créer le service
export_service = get_export_service(db, user_id=1)

# Export des documents
csv_content = export_service.export_documents_csv(
    start_date=date(2024, 1, 1),
    end_date=date(2024, 1, 31),
    tag_ids=[1, 2],
    include_items=True
)

# Sauvegarder le fichier
with open("export.csv", "w", encoding="utf-8-sig") as f:
    f.write(csv_content)
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

### Export mensuel

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
