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

### GET /monthly/pdf

Génère et exporte le rapport PDF mensuel avec graphiques.

**Query Parameters:**

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| year | int | Oui | Année du rapport (2000-2100) |
| month | int | Oui | Mois du rapport (1-12) |

**Response (200):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="bilan_*.pdf"`

!!! note "Contenu du rapport"
    Le rapport PDF mensuel inclut un résumé financier, des graphiques de répartition par catégorie (donut), d'évolution mensuelle, des tops dépenses et marchands, ainsi qu'un suivi budgétaire.

---

### GET /annual/pdf

Génère et exporte le rapport PDF annuel récapitulatif.

**Query Parameters:**

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| year | int | Oui | Année du rapport (2000-2100) |

**Response (200):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="bilan_annuel_*.pdf"`

!!! note "Contenu du rapport"
    Le rapport PDF annuel contient un résumé de l'année, l'évolution mensuelle (graphique ligne), un tableau comparatif mois par mois, la répartition annuelle par catégorie et les tops dépenses/marchands.

---

### GET /chart/{chart_type}

Exporte un graphique individuel en PNG.

**Path Parameters:**

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| chart_type | string | Oui | Type de graphique : `pie`, `bar`, `line`, `donut`, `area` |

**Query Parameters:**

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| month | string | Non | Mois à filtrer pour le graphique (format YYYY-MM) |

**Response (200):**
- Content-Type: `image/png`
- Content-Disposition: `attachment; filename="graphique_*.png"`

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

# Export résumé mensuel CSV
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/monthly/csv?year=2024&month=1" \
     -o resume_janvier.csv

# Export rapport mensuel PDF
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/monthly/pdf?year=2024&month=1" \
     -o rapport_janvier.pdf

# Export rapport annuel PDF
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/annual/pdf?year=2024" \
     -o rapport_annuel_2024.pdf

# Export graphique camembert PNG pour un mois
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8000/api/v1/export/chart/pie?month=2024-01" \
     -o graphique_janvier_camembert.png
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

// Télécharger le résumé mensuel CSV
await exportApi.monthlyCSV(2024, 1);

// Télécharger le rapport mensuel PDF
await exportApi.monthlyPDF(2024, 1);

// Télécharger le rapport annuel PDF
await exportApi.annualPDF(2024);

// Télécharger un graphique PNG
await exportApi.exportChart('donut', '2024-01');
```

---

## Notes

!!! info "Séparateur"
    Le séparateur utilisé est le point-virgule (`;`) pour une meilleure compatibilité avec Excel en version française.

!!! info "Encodage"
    Les fichiers sont encodés en UTF-8 avec BOM pour garantir l'affichage correct des caractères accentués dans Excel.
