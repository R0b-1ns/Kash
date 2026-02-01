# Kash - Améliorations futures

Roadmap des fonctionnalités à implémenter.

---

## Fonctionnalités implémentées

| # | Fonctionnalité | Version |
|---|----------------|---------|
| 1 | Visionneuse de documents (images + PDF, zoom, rotation) | v0.1 |
| 2 | Gestion des articles (édition, suppression, ajout dans la visionneuse) | v0.1 |
| 2b | Regroupement d'articles similaires (alias, suggestions automatiques) | v0.1 |
| 3 | Upload asynchrone avec file d'attente (toast, multi-upload) | v0.2 |
| 5 | Entrées financières manuelles (sans document) | v0.1 |
| 8 | Recherche et filtres avancés sur les documents | v0.2 |
| - | Templates de budget (sauvegarder/charger) | v0.1 |
| - | Duplication de documents | v0.1 |
| - | Tri des colonnes (date, montant, marchand) | v0.1 |
| - | Édition dans la visionneuse (marchand, date, montant, tags) | v0.1 |

---

## ~~3. Upload asynchrone avec file d'attente~~ (IMPLÉMENTÉ v0.2)

**Priorité:** Haute

**Description:**
Actuellement, l'upload bloque l'interface pendant tout le traitement (upload + OCR + Mistral). Cela empêche d'uploader plusieurs documents à la suite.

**Problème actuel:**
- L'utilisateur doit attendre la fin du traitement complet avant de pouvoir faire autre chose
- Impossible d'uploader plusieurs documents rapidement
- Le traitement OCR + IA peut prendre 10-30 secondes par document

**Solution proposée:**
- Upload en arrière-plan avec notifications toast
- File d'attente pour gérer plusieurs documents simultanément
- L'utilisateur peut continuer à naviguer pendant le traitement

**Fonctionnalités:**
- Toast en bas à droite pour chaque document uploadé :
  - "Document X en cours de traitement..." (avec spinner)
  - "Document X traité avec succès" (vert)
  - "Erreur sur Document X" (rouge, cliquable pour détails)
- File d'attente visible (nombre de documents en attente)
- Possibilité d'annuler un document en attente
- Rafraîchissement automatique de la liste quand un document est terminé

**Implémentation technique:**
- Backend : Endpoint séparé pour l'upload (retour immédiat) + traitement via Celery/Background Tasks
- Frontend : Context React pour gérer la file d'attente + composant Toast global
- WebSocket ou polling pour les mises à jour de statut

**Librairies potentielles:**
- `react-hot-toast` ou `sonner` pour les notifications
- Celery + Redis pour la file d'attente backend (optionnel)

---

## 4. Documents récurrents (abonnements)

**Priorité:** Haute

**Description:**
Permettre de marquer un document comme "récurrent" pour les abonnements mensuels (Netflix, Spotify, loyer, assurance, etc.). Le document est automatiquement dupliqué chaque mois sans avoir à re-scanner la facture.

**Problème résolu:**
- Éviter de re-uploader chaque mois la même facture d'abonnement
- Avoir une vue claire des dépenses fixes mensuelles
- Prévoir le budget avec les charges récurrentes

**Fonctionnalités:**

*Frontend:*
- Case à cocher "Document récurrent" dans le modal d'édition
- Sélecteur de fréquence : mensuel, trimestriel, annuel
- Date de début / date de fin (optionnelle)
- Badge visuel sur les documents récurrents dans la liste
- Page dédiée "Abonnements" pour voir tous les récurrents

*Backend:*
- Nouveau champ `is_recurring` (boolean) sur Document
- Nouveau champ `recurring_frequency` (monthly, quarterly, yearly)
- Nouveau champ `recurring_end_date` (optionnel)
- Table `recurring_documents` pour tracker les récurrences
- Job CRON (ou Celery beat) qui s'exécute le 1er de chaque mois :
  - Trouve tous les documents récurrents actifs
  - Crée une copie pour le nouveau mois (sans le fichier, juste les métadonnées)
  - Met à jour la date au mois courant

**Données copiées lors de la récurrence:**
- Marchand
- Montant total
- Devise
- Type de document
- Tags
- is_income
- Items (articles)

**Données NON copiées:**
- Fichier original (pas besoin de dupliquer le PDF)
- Texte OCR

**Affichage Dashboard:**
- Section "Charges fixes du mois" avec total des récurrents
- Distinction visuelle entre dépenses ponctuelles et récurrentes

---

## 6. Amélioration du Dashboard

**Priorité:** Moyenne

**Description:**
Améliorer l'affichage des articles fréquents dans le dashboard.

**Fonctionnalités:**
- Cliquer sur un article pour voir les documents associés
- Filtrer par période
- Affichage des articles regroupés (voir #2b)

---

## 7. Export et rapports

**Priorité:** Moyenne

**Description:**
Améliorer les options d'export.

**Fonctionnalités:**
- Export PDF du bilan mensuel
- Export des graphiques
- Rapport annuel récapitulatif

---

## ~~8. Recherche et filtres avancés (Documents)~~ (IMPLÉMENTÉ v0.2)

**Priorité:** ~~Haute~~ FAIT

**Description:**
Ajouter une barre de recherche et des filtres avancés sur la page Documents pour retrouver rapidement un document ou une plage de documents.

**Cas d'usage:**
- Retrouver tous les tickets Carrefour de l'année
- Chercher une facture par son montant approximatif
- Filtrer les fiches de paie d'une période donnée
- Trouver un document dont on se souvient vaguement du contenu

**Fonctionnalités:**

*Barre de recherche textuelle:*
- Recherche par marchand/nom
- Recherche dans le texte OCR brut
- Recherche dans les noms d'articles
- Recherche instantanée (debounce 300ms)

*Filtres combinables:*
- **Type de document** : Ticket, Facture, Fiche de paie, Autre (multi-sélection)
- **Plage de dates** : Date de début / Date de fin
- **Plage de montants** : Montant min / Montant max
- **Tags** : Filtrer par un ou plusieurs tags
- **Statut** : Revenu / Dépense / Tous
- **Sync NAS** : Synchronisé / Non synchronisé / Tous

*Interface:*
- Barre de recherche toujours visible en haut de la liste
- Bouton "Filtres" qui ouvre un panneau dépliable
- Chips/badges pour les filtres actifs (cliquables pour les retirer)
- Bouton "Réinitialiser les filtres"
- Compteur de résultats ("X documents trouvés")

*Backend:*
```python
# Endpoint existant à enrichir
GET /documents?search=carrefour&type=receipt,invoice&date_from=2024-01-01&date_to=2024-12-31&amount_min=10&amount_max=100&tags=1,5&is_income=false
```

*Frontend:*
```typescript
interface DocumentFilters {
  search?: string;           // Recherche textuelle
  types?: string[];          // receipt, invoice, payslip, other
  dateFrom?: string;         // YYYY-MM-DD
  dateTo?: string;           // YYYY-MM-DD
  amountMin?: number;
  amountMax?: number;
  tagIds?: number[];
  isIncome?: boolean | null; // true, false, ou null (tous)
  syncedToNas?: boolean | null;
}
```

**Persistance:**
- Sauvegarder les filtres dans l'URL (query params) pour pouvoir partager/bookmarker
- Option : sauvegarder les filtres favoris

---

## 9. Notifications et alertes

**Priorité:** Basse

**Description:**
Alertes pour le suivi budgétaire via différents canaux de communication.

**Types d'alertes:**
- Alerte quand un budget approche la limite (80%, 100%)
- Récapitulatif hebdomadaire des dépenses
- Récapitulatif mensuel avec bilan

**Canaux de notification:**

| Canal | Implémentation |
|-------|----------------|
| **Discord** | Webhook vers un channel privé |
| **Telegram** | Bot Telegram avec chat ID |
| **Email** | SMTP (Gmail, etc.) |

*Configuration dans les paramètres:*
- Choix du canal préféré (un ou plusieurs)
- Discord : URL du webhook
- Telegram : Token du bot + Chat ID
- Email : Adresse email de destination
- Fréquence : Temps réel / Quotidien / Hebdomadaire

*Format des messages:*
```
Alerte Budget - Kash

Le budget "Courses" a atteint 85% de sa limite.
- Dépensé : 425€ / 500€
- Restant : 75€

Voir les détails : http://localhost:3000/budgets
```

*Backend:*
- Service `notification_service.py` avec adaptateurs par canal
- Job CRON pour les récapitulatifs périodiques
- Table `notification_settings` pour stocker les préférences utilisateur

---

## 10. Recherche et filtres avancés sur les Articles (Items)

**Priorité:** Haute

**Description:**
Ajouter un système de recherche et de filtres avancés sur la page Articles, similaire à celui implémenté pour les documents. Permet de retrouver rapidement des articles par catégorie, tag, période, etc.

**Cas d'usage:**
- Voir tous les articles de la catégorie "Nourriture"
- Trouver les articles liés au tag "Santé"
- Analyser les dépenses d'un type d'article sur une période
- Comparer les prix d'un même article dans le temps

**Fonctionnalités:**

*Barre de recherche textuelle:*
- Recherche par nom d'article
- Recherche instantanée (debounce 300ms)

*Filtres combinables:*
- **Tags** : Filtrer par un ou plusieurs tags (via les documents associés)
- **Plage de dates** : Date de début / Date de fin
- **Plage de prix** : Prix min / Prix max (unit_price ou total_price)
- **Marchand** : Filtrer par marchand (via le document parent)
- **Catégorie** : Si catégorisation des articles implémentée

*Interface:*
- Réutiliser le composant `DocumentFilters` adapté pour les items
- Panneau de filtres repliable
- Badge avec nombre de filtres actifs
- Bouton "Effacer les filtres"
- Compteur de résultats ("X articles trouvés")

*Backend:*
```python
# Nouvel endpoint ou enrichissement de l'existant
GET /items?search=pain&tag_ids=1,5&start_date=2024-01-01&end_date=2024-12-31&min_price=1&max_price=10&merchant=carrefour
```

*Frontend:*
```typescript
interface ItemFilters {
  search?: string;           // Recherche dans le nom
  tag_ids?: number[];        // Tags des documents parents
  start_date?: string;       // YYYY-MM-DD
  end_date?: string;         // YYYY-MM-DD
  min_price?: number;
  max_price?: number;
  merchant?: string;         // Marchand du document parent
}
```

**Statistiques enrichies:**
- Total dépensé pour les articles filtrés
- Nombre d'achats
- Prix moyen
- Évolution du prix dans le temps (graphique)

---

## Notes

- Les améliorations seront implémentées après la stabilisation des fonctionnalités actuelles
- Prioriser les fonctionnalités qui améliorent la correction des erreurs OCR/IA
