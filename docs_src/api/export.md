# API Export

Base URL: `/api/v1/export`

Endpoints pour exporter les données en format CSV.

## Endpoints

### GET /documents/csv

Exporte les documents en format CSV.

**Query Parameters:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| start_date | date | Date de début (format: YYYY-MM-DD) |
| end_date | date | Date de fin (format: YYYY-MM-DD) |
| tag_ids | int[] | Filtrer par tags (peut être répété) |
| include_items | bool | Inclure le détail des articles (défaut: false) |

**Response (200):**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="documents_*.csv"`

### Format sans items (défaut)

Une ligne par document :

```csv
ID;Date;Heure;Marchand;Lieu;Type;Montant;Devise;Type transaction;Tags;Fichier original
1;2024-01-15;14:30:00;Carrefour;Paris 15e;receipt;45.67;EUR;Dépense;Courses;ticket-carrefour.jpg
2;2024-01-16;09:15:00;RATP;Paris;receipt;16.90;EUR;Dépense;Transport;navigo.pdf
```

### Format avec items

Une ligne par article :

```csv
ID Document;Date;Marchand;Article;Quantité;Unité;Prix unitaire;Prix total;Catégorie article;Tags document
1;2024-01-15;Carrefour;Pommes Golden;1.50;kg;2.99;4.49;Fruits;Courses
1;2024-01-15;Carrefour;Baguette;2.00;;1.20;2.40;Boulangerie;Courses
1;2024-01-15;Carrefour;Lait;1.00;L;1.10;1.10;Produits laitiers;Courses
```

---

### GET /monthly/csv

Exporte le résumé mensuel en format CSV.

**Query Parameters:**

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| year | int | Oui | Année (2000-2100) |
| month | int | Oui | Mois (1-12) |

**Response (200):**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="resume_YYYY-MM.csv"`

**Format:**

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
Logement;400.00 EUR;32.0%
Loisirs;220.45 EUR;17.6%
```

---

## Exemples d'utilisation

### Export avec cURL

```bash
# Export basique
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/documents/csv" \
     -o documents.csv

# Export avec filtres
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/documents/csv?start_date=2024-01-01&end_date=2024-01-31&tag_ids=1&tag_ids=2" \
     -o janvier.csv

# Export avec détail des articles
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/documents/csv?include_items=true" \
     -o documents_details.csv

# Export résumé mensuel
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/monthly/csv?year=2024&month=1" \
     -o resume_janvier.csv
```

### Export avec JavaScript

```javascript
// Télécharger l'export documents
await exportApi.documentsCSV({
  start_date: "2024-01-01",
  end_date: "2024-01-31",
  tag_ids: [1, 2],
  include_items: true
});
// Le fichier est téléchargé automatiquement

// Télécharger le résumé mensuel
await exportApi.monthlyCSV(2024, 1);
```

---

## Notes

!!! info "Séparateur"
    Le séparateur utilisé est le point-virgule (`;`) pour une meilleure compatibilité avec Excel en version française.

!!! info "Encodage"
    Les fichiers sont encodés en UTF-8 avec BOM pour garantir l'affichage correct des caractères accentués dans Excel.
