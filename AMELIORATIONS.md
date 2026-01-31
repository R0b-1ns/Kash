# Kash - Améliorations futures

Roadmap des fonctionnalités à implémenter.

---

## 1. Visionneuse de documents

**Priorité:** Haute

**Description:**
Ajouter une visionneuse intégrée pour afficher les PDF et images directement dans l'application.

**Fonctionnalités:**
- Cliquer sur un document dans la liste ouvre une modal/sidebar avec le fichier
- Support des images (JPG, PNG, WebP, etc.)
- Support des PDF (avec navigation multi-pages)
- Zoom avant/arrière
- Affichage côte à côte avec les données extraites pour vérification

**Librairies potentielles:**
- `react-pdf` pour les PDF
- Visionneuse native pour les images

---

## 2. Gestion des articles (items)

**Priorité:** Haute

**Description:**
Permettre la modification et suppression des articles extraits par l'OCR/IA, car l'extraction n'est pas toujours exacte.

**Fonctionnalités:**
- Voir la liste des articles d'un document
- Modifier un article (nom, quantité, prix unitaire, prix total)
- Supprimer un article incorrect
- Ajouter manuellement un article manquant
- Recalculer le total automatiquement après modification

**Où l'intégrer:**
- Dans le modal d'édition de document (ajouter un onglet "Articles")
- Ou dans une vue détaillée du document

---

## 3. Upload asynchrone avec file d'attente

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

## 5. Entrées financières manuelles (sans document)

**Priorité:** Haute

**Description:**
Permettre de créer une entrée financière sans uploader de document. Utile quand on n'a pas de ticket de caisse mais qu'on a quand même une dépense/revenu sur le compte bancaire.

**Cas d'usage:**
- Oubli de demander le ticket
- Paiement en ligne sans facture PDF
- Petites dépenses (parking, pourboire, etc.)
- Virements bancaires
- Remboursements

**Fonctionnalités:**

*Frontend:*
- Bouton "Ajouter une entrée" à côté de la zone d'upload
- Formulaire simplifié :
  - Date (obligatoire)
  - Marchand/Description (obligatoire)
  - Montant (obligatoire)
  - Devise
  - Type : Dépense / Revenu
  - Tags
  - Notes (optionnel)
- Badge visuel "Manuel" sur les entrées sans document

*Backend:*
- Le champ `file_path` devient nullable
- Nouveau champ `is_manual` (boolean) ou simplement `file_path IS NULL`
- Endpoint `POST /documents/manual` pour créer sans fichier
- Pas d'OCR ni d'IA pour les entrées manuelles

**Affichage:**
- Les entrées manuelles apparaissent dans la même liste que les documents
- Icône différente (crayon au lieu de fichier)
- Possibilité de les modifier/supprimer comme les autres

---

## 6. Amélioration du Dashboard

**Priorité:** Moyenne

**Description:**
Améliorer l'affichage des articles fréquents dans le dashboard.

**Fonctionnalités:**
- Cliquer sur un article pour voir les documents associés
- Filtrer par période
- Fusionner les articles similaires (ex: "Pain" et "PAIN")

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

## 8. Recherche et filtres avancés

**Priorité:** Haute

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
🚨 Alerte Budget - Kash

Le budget "Courses" a atteint 85% de sa limite.
- Dépensé : 425€ / 500€
- Restant : 75€

📊 Voir les détails : http://localhost:3000/budgets
```

*Backend:*
- Service `notification_service.py` avec adaptateurs par canal
- Job CRON pour les récapitulatifs périodiques
- Table `notification_settings` pour stocker les préférences utilisateur

---

## Notes

- Les améliorations seront implémentées après la stabilisation des fonctionnalités actuelles
- Prioriser les fonctionnalités qui améliorent la correction des erreurs OCR/IA
