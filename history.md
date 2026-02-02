# Historique des décisions - Kash

> **Kash** : Gestionnaire de finances personnelles avec OCR et IA locale.

## 2026-01-30 - Initialisation du projet

### Session 1 - Démarrage
- Création du fichier CLAUDE.md pour les instructions
- Création du fichier history.md pour l'historique des décisions

### Pitch reçu - Résumé du besoin
**Problème:** Centraliser et analyser toutes les dépenses/revenus à partir de factures stockées
**Utilisateur:** Usage personnel
**Fonctionnalités demandées:**
1. Upload de documents (photos tickets, PDFs de factures, fiches de paie)
2. OCR pour extraire le texte des documents
3. IA locale pour catégoriser automatiquement
4. Extraction: date, heure, lieu, articles, montants
5. Dashboard avec graphiques et bilans mensuels
6. Analyse détaillée (ex: quantités par produit pour courses)
7. Distinction entrées/sorties d'argent

**Contraintes:**
- Docker sur Mac M1
- Modèles IA locaux (légers)
- Interface web
- Fichiers stockés sur NAS (pas en local)

---

## Décisions techniques

### Session 1 - Choix validés avec l'utilisateur
1. **Authentification** : OUI - Login/mot de passe (JWT)
2. **Multi-devise** : OUI - Support plusieurs devises (voyages)
3. **Système de tags** : OUI - Tags personnalisables par l'utilisateur (remplace catégories fixes)
4. **Export** : OUI - Export CSV des données
5. **Alertes budget** : OUI - Budget mensuel par catégorie avec indicateurs visuels (%)
6. **Stockage NAS** : OUI - Synchronisation des fichiers vers NAS

### Architecture stockage
- Fichiers uploadés traités localement (temporaire)
- Synchronisation vers NAS via montage SMB/CIFS
- NAS: Ugreen (compatible SMB/Samba)

---

## Phase 1 - Infrastructure Docker + BDD (TERMINÉE)

### Fichiers créés
- `docker compose.yml` - Orchestration des services (backend, frontend, postgres, ollama)
- `.env` / `.env.example` - Variables d'environnement
- `.gitignore` - Fichiers à ignorer

### Backend
- `backend/Dockerfile` - Image Python 3.11 avec dépendances PaddleOCR
- `backend/requirements.txt` - Dépendances Python (FastAPI, SQLAlchemy, PaddleOCR, etc.)
- `backend/app/main.py` - Point d'entrée FastAPI
- `backend/app/core/config.py` - Configuration centralisée
- `backend/app/core/database.py` - Connexion PostgreSQL

### Modèles de données (SQLAlchemy)
- `User` - Utilisateurs avec authentification
- `Document` - Factures/tickets (date, montant, marchand, etc.)
- `Item` - Articles individuels dans un document
- `Tag` - Tags personnalisables
- `DocumentTag` - Relation many-to-many
- `Budget` - Budgets mensuels par tag
- `Currency` - Devises avec taux de conversion

### Migrations (Alembic)
- `001_initial_schema.py` - Création de toutes les tables
- Devises par défaut: EUR, USD, GBP, CHF, JPY, CAD

### Frontend
- `frontend/Dockerfile` - Image Node 20
- `frontend/package.json` - Dépendances (React 18, Tailwind, Recharts, etc.)
- Configuration Vite + TypeScript + Tailwind
- `frontend/src/App.tsx` - Composant placeholder

---

## Phase 2 - Backend API Core + Auth (TERMINÉE)

### Sécurité (`core/security.py`)
- Hashage des mots de passe avec bcrypt
- Création et validation des tokens JWT (HS256)
- Token expire après 7 jours (configurable)

### Schémas Pydantic (`schemas/`)
Validation des données entrantes/sortantes:
- `user.py` - UserCreate, UserLogin, UserResponse, Token
- `tag.py` - TagCreate, TagUpdate, TagResponse
- `document.py` - DocumentCreate, DocumentUpdate, DocumentResponse
- `item.py` - ItemCreate, ItemUpdate, ItemResponse
- `budget.py` - BudgetCreate, BudgetResponse, BudgetWithSpending
- `currency.py` - CurrencyCreate, CurrencyUpdate, CurrencyResponse

### Dépendances API (`api/deps.py`)
- `get_db()` - Session BDD avec fermeture automatique
- `get_current_user()` - Extraction et validation du user depuis JWT

### Routes API (`api/routes/`)
Toutes les routes sont préfixées par `/api/v1`

| Route | Description |
|-------|-------------|
| `auth.py` | POST /register, /login, GET /me |
| `documents.py` | CRUD documents + upload + gestion tags |
| `tags.py` | CRUD tags personnalisés |
| `budgets.py` | CRUD budgets + /current avec dépenses calculées |
| `items.py` | CRUD items + liste catégories |
| `stats.py` | /summary, /by-tag, /monthly, /top-items |
| `currencies.py` | Liste et gestion des devises |

### Documentation API
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Points importants
- Tous les fichiers sont bien commentés avec docstrings
- L'upload stocke temporairement les fichiers dans `/app/uploads`
- Le traitement OCR/IA sera ajouté en Phase 3
- Les stats calculent les agrégations côté BDD pour les perfs

---

## Phase 3 - OCR + IA (TERMINÉE)

### Services créés (`backend/app/services/`)

| Fichier | Description |
|---------|-------------|
| `ocr_service.py` | PaddleOCR pour images (JPG, PNG) et PDF (via pdf2image) |
| `ai_service.py` | Client Ollama async avec prompt d'extraction structurée |
| `document_processor.py` | Pipeline complet: OCR → IA → BDD |

### Pipeline de traitement
1. Upload du fichier
2. PaddleOCR extrait le texte brut + score de confiance
3. Ollama/Mistral analyse et retourne un JSON structuré
4. Mise à jour du Document en BDD
5. Création des Items (articles) associés

### Données extraites par l'IA
- `doc_type`: receipt, invoice, payslip, other
- `date`, `time`, `merchant`, `location`
- `items[]`: nom, quantité, prix unitaire, prix total
- `total_amount`, `currency`, `is_income`

### Nouvel endpoint
- `POST /documents/{id}/reprocess` - Relancer l'extraction si échec

### Configuration
- `OLLAMA_HOST`: http://ollama:11434 (Docker)
- `OLLAMA_MODEL`: mistral (configurable)
- Timeout: 2 minutes pour les appels LLM

---

## Phase 4 - Frontend React (TERMINÉE)

### Structure créée (`frontend/src/`)

```
src/
├── types/index.ts           # Interfaces TypeScript
├── services/api.ts          # Client Axios + intercepteurs JWT
├── hooks/useAuth.tsx        # Context d'authentification
├── components/
│   ├── Layout.tsx           # Sidebar + Header + Content
│   └── ProtectedRoute.tsx   # Garde de route
└── pages/
    ├── LoginPage.tsx        # Connexion
    ├── RegisterPage.tsx     # Inscription
    ├── DashboardPage.tsx    # Accueil (placeholders stats)
    ├── DocumentsPage.tsx    # Upload drag&drop + liste
    ├── TagsPage.tsx         # CRUD tags avec couleurs
    └── BudgetsPage.tsx      # Placeholder pour Phase 5
```

### Fonctionnalités implémentées
- Authentification complète (register, login, logout)
- Stockage JWT dans localStorage
- Routes protégées avec redirection
- Upload drag & drop (react-dropzone)
- Liste documents avec filtres
- Gestion des tags (création, édition, suppression)
- Design responsive (mobile-first)

### Design
- Couleurs: blue-600 (primary), slate-50 (bg), white+shadow (cards)
- Icônes: lucide-react
- Animations: fadeIn, slideIn
- Accessibilité: focus-visible, prefers-reduced-motion

---

## Phase 5 - Dashboard + Graphiques (TERMINÉE)

### Composants graphiques créés (`frontend/src/components/dashboard/`)

| Composant | Description |
|-----------|-------------|
| `StatCard.tsx` | Carte statistique avec icône, valeur, couleur |
| `MonthlyChart.tsx` | Graphique barres (dépenses vs revenus par mois) |
| `TagPieChart.tsx` | Graphique donut (répartition par catégorie) |
| `BudgetProgress.tsx` | Barres de progression des budgets |
| `TopExpenses.tsx` | Liste des dernières dépenses |
| `TopItems.tsx` | Articles les plus achetés |

### Dashboard (`DashboardPage.tsx`)

**Layout validé avec l'utilisateur:**
```
┌─────────────────────────────────────────────────────────┐
│  [Solde]    [Dépenses]    [Revenus]    [Transactions]  │
├─────────────────────────────────────────────────────────┤
│  [═══════ Évolution mensuelle (barres) ═══════════════]│
├──────────────────────────┬──────────────────────────────┤
│  [Répartition par tag]   │  [Progression budgets]      │
│      (donut)             │      (barres horiz.)        │
├──────────────────────────┴──────────────────────────────┤
│  [Dernières dépenses]          [Articles fréquents]    │
└─────────────────────────────────────────────────────────┘
```

**Fonctionnalités:**
- Sélecteur de mois (navigation < > avec mois actuel)
- Bouton rafraîchir
- Chargement en parallèle de toutes les données
- États de chargement avec skeletons
- Gestion des erreurs (fallback gracieux)

### Page Budgets fonctionnelle (`BudgetsPage.tsx`)

- Liste des budgets du mois avec progression visuelle
- Création de budgets (sélection tag + montant limite)
- Édition inline des limites
- Suppression avec confirmation
- Couleur de progression: vert → jaune → orange → rouge
- Alertes visuelles si budget dépassé
- Résumé du mois (total budget, dépensé, restant)

### Types et API mis à jour

- `types/index.ts` : Ajout BudgetWithSpending, TopItem, etc.
- `services/api.ts` : Ajout budgets.getCurrent(), stats.getTopItems()

---

## Phase 6 - Features avancées (TERMINÉE)

### Export de données (`backend/app/services/export_service.py`)

**Formats d'export:**
- CSV documents (une ligne par document ou par article)
- CSV résumé mensuel (totaux + répartition par tag)

**Filtres disponibles:**
- Plage de dates (start_date, end_date)
- Tags spécifiques
- Inclusion des articles détaillés

**Routes API (`backend/app/api/routes/export.py`):**
- `GET /export/documents/csv` - Export documents filtré
- `GET /export/monthly/csv?year=2026&month=1` - Résumé mensuel

### Synchronisation NAS (`backend/app/services/nas_sync_service.py`)

**Architecture:** Utilise un montage SMB/CIFS (pas SSH/rsync).

**Fonctionnalités:**
- Test d'accès au montage SMB
- Copie de fichiers via `shutil.copy2`
- Organisation par année/mois/type sur le NAS
- Suivi du statut (synced_to_nas, synced_at dans Document)

**Routes API (`backend/app/api/routes/sync.py`):**
- `GET /sync/status` - Statistiques de synchronisation
- `GET /sync/config` - Statut de la configuration NAS
- `POST /sync/test` - Tester l'accès au montage
- `POST /sync/run` - Lancer la synchronisation
- `POST /sync/document/{id}` - Synchroniser un document

**Configuration requise (.env):**
```env
NAS_LOCAL_PATH=/Volumes/NAS/finance
NAS_MOUNT_PATH=/app/nas_backup
```

### Gestion des devises (`backend/app/services/currency_service.py`)

- Conversion entre devises (via EUR comme intermédiaire)
- Cache des taux en mémoire
- Formatage des montants avec symboles
- Mise à jour manuelle des taux

### Frontend - Page Paramètres (`frontend/src/pages/SettingsPage.tsx`)

**Section Synchronisation NAS:**
- Affichage configuration (hôte, chemin)
- Statistiques (documents totaux, synchronisés, en attente)
- Bouton test de connexion
- Bouton synchronisation avec feedback

**Section Export:**
- Export documents CSV avec filtres (dates, tags, détail articles)
- Export résumé mensuel (sélecteur mois)
- Téléchargement direct du fichier

### Navigation mise à jour
- Ajout lien "Paramètres" dans la sidebar
- Icône Settings de lucide-react

---

## Décisions de design

### Frontend
- Layout avec sidebar fixe à gauche
- Cards blanches avec ombres légères
- Formulaires avec validation inline
- Confirmations pour les suppressions
- Loaders pendant les requêtes
- Graphiques Recharts (barres, donut)
- Couleurs cohérentes pour les indicateurs (vert=ok, orange=attention, rouge=danger)

### Backend
- Traitement OCR/IA synchrone (retourne les données extraites directement)
- Fallback gracieux si Ollama indisponible
- Logs détaillés pour debug

---

## Changements majeurs
(À documenter au fur et à mesure)
## 2026-01-31

*   **Docker/Backend:** Remplacement de la dépendance `libgl1-mesa-glx` par `libgl1` dans le Dockerfile du backend pour corriger une erreur de build sur l'architecture ARM64.
*   **Docker/Backend:** Mise à jour de la version de `paddlepaddle` de 2.6.0 à 2.6.2 dans `requirements.txt` pour assurer la compatibilité avec l'architecture ARM64.
*   **Backend:** Ajout de la dépendance `email-validator` pour corriger une erreur d'importation avec Pydantic lors de la validation des e-mails.
*   **Backend:** Mise à jour de `pydantic` (2.5.3→2.8.2) et `pydantic-settings` (2.1.0→2.2.1) pour corriger une `RecursionError` au démarrage de l'application.
*   **Backend:** Ajout de `model_rebuild()` dans `schemas/__init__.py` pour corriger une `RecursionError` Pydantic causée par des références circulaires dans les modèles SQLAlchemy.
*   **Backend:** Correction de la `RecursionError` Pydantic en utilisant des Forward References ('List['TagName']') dans les schémas et en appelant `model_rebuild()` au sein du même fichier.
*   **Backend:** Retour aux versions originales de Pydantic et augmentation de la limite de récursion Python à 2000 dans `main.py` comme dernière tentative pour corriger la `RecursionError`.
*   **Backend:** Annulation de la tentative d'augmentation de la limite de récursion dans `main.py`.
*   **Backend Refactoring:** Correction de la `RecursionError` en appliquant le pattern 'Forward Reference'. Les schémas Pydantic (`DocumentResponse`, `BudgetResponse`) utilisent maintenant des chaînes de caractères pour les types en référence circulaire, et `model_rebuild()` est appelé de manière centralisée dans `schemas/__init__.py`.
*   **Backend:** Annulation de la tentative de refactorisation 'Forward Reference' après échec.
*   **Backend Dependencies Upgrade:** Mise à jour majeure des dépendances clés pour tenter de résoudre la `RecursionError`: FastAPI (0.109.0 -> 0.110.2), Pydantic (2.5.3 -> 2.7.1), Pydantic-Settings (2.1.0 -> 2.2.1), Uvicorn (0.27.0 -> 0.29.0).
*   **Backend:** Commit des mises à jour des dépendances clés (FastAPI, Pydantic, Uvicorn).
*   **Backend Refactoring:** Adaptation de la route `/documents/{document_id}` (`get_document`) et `/documents` (`list_documents`) pour construire manuellement les réponses `DocumentResponse` et `DocumentListResponse` afin de résoudre la `RecursionError`.
*   **Backend:** Désactivation des URLs de documentation OpenAPI (docs_url, redoc_url) dans `main.py` pour tester l'hypothèse que la `RecursionError` est déclenchée lors de la génération du schéma OpenAPI.
*   **Backend:** Désactivation des URLs de documentation OpenAPI (docs_url, redoc_url) dans `main.py` pour tester l'hypothèse que la `RecursionError` est déclenchée lors de la génération du schéma OpenAPI, même après la suppression de tous les `from_attributes`.
*   **Backend:** Annulation de la désactivation des URLs de documentation OpenAPI dans `main.py`.
*   **Backend Dockerfile:** Ajout d'une réinstallation forcée de `numpy` et `opencv-python-headless` pour corriger l'erreur d'importation `numpy.core.multiarray`.
*   **Backend Dockerfile:** Nouvelle stratégie d'installation. Installation de `paddleocr` et `paddlepaddle` en premier pour assurer une résolution correcte des dépendances `numpy` et `opencv`.
*   **Backend:** Suppression de `paddleocr` et `paddlepaddle` de `requirements.txt` pour les installer uniquement via le Dockerfile, assurant une installation propre.
*   **Backend Dockerfile:** Nouvelle stratégie d'installation. Installation des dépendances de `requirements.txt` en premier, puis réinstallation forcée de `paddleocr` et `paddlepaddle` en dernier pour résoudre les conflits de `numpy` et `opencv`.
*   **Backend Dockerfile:** Annulation de la dernière stratégie d'installation après échec de résolution du conflit `numpy`/`opencv`.
*   **Architecture:** Implémentation du microservice OCR. Création du dossier `ocr_service/` avec son `Dockerfile`, `requirements.txt` et `app.py`. Modification de `backend/app/services/ocr_service.py` pour appeler le microservice via HTTP. Mise à jour de `backend/app/core/config.py` avec `OCR_SERVICE_URL`. Mise à jour de `docker compose.yml` pour inclure le nouveau service et mettre à jour les dépendances du backend.
*   **Backend:** Démarrage réussi de l'application après la refactorisation en microservice OCR. La `RecursionError` et l'`ImportError` ont été résolues.
*   **Environnement:** Ajout de `OCR_SERVICE_URL` au fichier `.env`.
*   **Database:** Les migrations Alembic ont été appliquées avec succès.
*   **Backend:** Ajout d'une contrainte de version pour `bcrypt<4.1` dans `requirements.txt` pour corriger une incompatibilité avec `passlib==1.7.4`.
*   **Backend Debug:** Ajout d'un code de débogage dans `main.py` pour afficher toutes les routes enregistrées au démarrage.
*   **Backend Debug:** Nettoyage du code de débogage pour l'affichage des routes dans `main.py`.
*   **Frontend Debug:** Le frontend fait une requête vers `http://localhost:8000/auth/login` au lieu de `http://localhost:8000/api/v1/auth/login`. Malgré la bonne configuration dans `api.ts` et `.env`, le problème semble venir d'un cache de Vite ou d'une mauvaise lecture de la variable d'environnement `VITE_API_URL` par le serveur de développement.
*   **Frontend Debug:** Ajout d'un `console.log` dans `frontend/src/services/api.ts` pour vérifier la valeur de `API_BASE_URL` utilisée par Axios.
*   **Frontend Configuration:** Correction de `docker compose.yml` pour que `VITE_API_URL` du frontend utilise la variable d'environnement du fichier `.env` (``), résolvant le problème de routage.
*   **Frontend Debug:** Le `console.log` a été retiré de `frontend/src/services/api.ts` après vérification de la configuration.
*   **Backend:** L'erreur CORS est identifiée comme masquant une erreur 500 due à une syntaxe `func.case` incorrecte dans `api/routes/stats.py`.
*   **Backend Fix:** Correction de la syntaxe `func.case` en `case` dans `api/routes/stats.py` pour résoudre la `TypeError` de SQLAlchemy et l'erreur 500.
*   **Backend:** L'erreur CORS sur la création de budget est identifiée comme masquant une erreur 500 due à une `AttributeError: 'Budget' object has no attribute 'tag'`.
*   **Backend Fix:** Ajout de la `relationship` manquante pour 'tag' dans le modèle SQLAlchemy `Budget` (`models/budget.py`) pour corriger l'`AttributeError`.
*   **Frontend Fix:** Correction des champs de saisie de limite de budget dans `frontend/src/pages/BudgetsPage.tsx` en changeant l'attribut `step` de `10` à `1` pour permettre des valeurs plus flexibles.
*   **Backend Bug:** Le résumé des budgets affiche `NaN` car les montants de type `Decimal` sont sérialisés en chaînes de caractères dans la réponse de l'API `/budgets/current`.
*   **Backend Fix:** Conversion des montants de type `Decimal` en `float` dans la réponse de l'API `/budgets/current` pour corriger le bug d'affichage `NaN` sur le frontend.

## 2026-01-31 - Session 2

### Corrections de bugs

*   **Backend Schemas:** Correction de l'erreur Pydantic `none_required` en renommant les imports `date` → `date_type` et `time` → `time_type` pour éviter les conflits avec les noms de champs, et utilisation de `Union[X, None]` au lieu de `Optional[X]`.
*   **Frontend DocumentsPage:** Ajout du bouton "Modifier" avec modal d'édition pour corriger manuellement les données extraites (marchand, date, montant, devise, type, tags).
*   **Frontend TopItems:** Correction de l'erreur `qty.toFixed is not a function` - les valeurs Decimal du backend arrivent comme chaînes, ajout de conversion automatique.
*   **Frontend TagPieChart:** Même correction pour le graphique de répartition par catégorie (NaN → conversion string→number).
*   **Backend Stats:** Correction du calcul des revenus dans le dashboard - utilisation de `COALESCE(date, created_at)` pour inclure les documents sans date extraite.
*   **Backend Budgets:** Même correction pour le calcul des dépenses par tag.

### Nouvelles fonctionnalités

*   **Backend AI Service:** L'IA suggère maintenant des tags parmi les tags existants de l'utilisateur lors de l'extraction.
*   **Backend Document Processor:** Assignation automatique des tags suggérés par l'IA au document.

### Synchronisation NAS - Refonte complète

*   **Abandon SSH/rsync** au profit d'un **montage SMB/CIFS** plus simple à configurer.
*   **Nouvelle config:** `NAS_MOUNT_PATH` (chemin dans le container) + `NAS_LOCAL_PATH` (chemin sur le Mac).
*   **Organisation des fichiers:** Structure `année/mois/type/` sur le NAS (ex: `2024/01/factures/`).
*   **Types de dossiers:** tickets, factures, salaires, autres.

### Documentation

*   **Création de `AMELIORATIONS.md`** - Liste des améliorations futures avec priorités :
    1. Visionneuse PDF/images intégrée
    2. Gestion des articles (modifier/supprimer les items)
    3. Upload asynchrone avec file d'attente et notifications toast
    4. Documents récurrents pour les abonnements
    5. Entrées financières manuelles (sans document)
    6. Amélioration du dashboard
    7. Export et rapports PDF
    8. Recherche avancée
    9. Notifications et alertes budget

*   **Mise à jour de la documentation technique** :
    - `docs_src/architecture/overview.md` - Architecture microservices avec OCR séparé
    - `docs_src/services/ocr.md` - Documentation du microservice OCR (PaddleOCR)
    - `docs_src/services/nas-sync.md` - Documentation SMB au lieu de SSH/rsync
    - `docs_src/api/sync.md` - Endpoints sync avec configuration SMB
    - `docs_src/getting-started/configuration.md` - Instructions de montage SMB
    - `docs_src/architecture/backend.md` - OCRService comme client HTTP

### Naming du projet

*   **Nom choisi : Kash** - Version stylisée de "Cash", évoque la gestion d'argent de façon moderne.
*   **Création du README.md** - Présentation du projet avec architecture, installation, utilisation.

---

## 2026-02-01 - Gestion des articles

### Édition des articles dans la visionneuse

*   **DocumentViewer:** Ajout de l'édition inline des articles dans le panneau latéral
    - Modification: nom, quantité, prix unitaire, prix total
    - Auto-calcul du total (quantité × prix unitaire)
    - Ajout de nouveaux articles (bouton "+")
    - Suppression d'articles (icône poubelle, avec restauration possible)
    - Sauvegarde groupée de toutes les modifications
*   **API Items:** Ajout des fonctions `create`, `update`, `delete` dans `api.ts`
*   **Types:** Ajout de `ItemCreate`, `ItemUpdate` dans `types/index.ts`

### Regroupement d'articles similaires

**Problème résolu:** L'OCR extrait le même article avec des noms différents (ex: "COCA-COLA", "Coca Cola", "coca cola"). Le regroupement permet d'avoir des statistiques cohérentes.

*   **Backend - Nouveau modèle:**
    - `ItemAlias` : table de correspondance (canonical_name ↔ alias_name)
    - Migration `006_item_aliases.py`

*   **Backend - Nouveaux endpoints (`/item-aliases`):**
    | Méthode | Route | Description |
    |---------|-------|-------------|
    | GET | `/` | Liste des groupes existants |
    | GET | `/suggestions` | Suggestions automatiques (Levenshtein) |
    | GET | `/items-list` | Liste des articles distincts |
    | POST | `/` | Créer un alias |
    | POST | `/bulk` | Créer plusieurs alias (regroupement) |
    | PUT | `/group` | Renommer un groupe |
    | DELETE | `/{id}` | Supprimer un alias |
    | DELETE | `/group/{name}` | Supprimer un groupe |

*   **Backend - Stats mises à jour:**
    - `/stats/top-items` utilise maintenant les alias pour regrouper
    - Tri par nombre d'achats (prioritaire) puis par montant

*   **Frontend - Page Articles Similaires (`/item-aliases`):**
    - Tab "Groupes existants" : voir, renommer, supprimer
    - Tab "Suggestions" : suggestions automatiques basées sur la distance de Levenshtein
    - Tab "Créer manuellement" : rechercher et sélectionner des articles
    - Possibilité d'ajouter des articles à un groupe existant

*   **Frontend - Nouvelle page Articles (`/items`):**
    - Stats globales : articles différents, total dépensé, achats totaux
    - Recherche par nom d'article
    - Filtre par mois (12 derniers mois)
    - Tableau triable (nom, achats, quantité, montant)
    - Lien vers la page de regroupement

### Corrections de bugs

*   **Routes FastAPI:** Réorganisation des routes PUT/DELETE pour que les routes statiques (`/group`) soient définies avant les routes dynamiques (`/{id}`)
*   **Gestion des erreurs Pydantic:** Ajout de `extractErrorMessage()` pour extraire correctement les messages d'erreur de validation
*   **Schéma Pydantic:** `min_items` → `min_length` (syntaxe Pydantic v2)
*   **Limite stats:** Augmentation de la limite de 50 à 500 pour `/stats/top-items`

### Navigation

*   Nouveau lien "Articles" dans la sidebar (icône ShoppingCart)
*   `/items` : page principale des articles avec stats
*   `/item-aliases` : accessible depuis la page Articles ("Gérer les regroupements")

---

## 2026-02-01 - Recherche avancée de documents

*   **Backend API:** Amélioration de la route `GET /documents` pour inclure une recherche avancée.
    - Ajout des paramètres de requête : `search`, `ocr_search`, `min_amount`, `max_amount`, `tag_ids`.
    - Implémentation de la logique de filtrage dans SQLAlchemy pour rechercher dans les champs `merchant`, `location`, `original_name`, et `ocr_raw_text` avec `ILIKE`, et filtrer par plage de montants et tags multiples.
*   **Frontend Types:** Ajout de l'interface `DocumentFilters` à `frontend/src/types/index.ts` pour définir la structure des paramètres de recherche avancée.
*   **Frontend API Service:** Mise à jour de la fonction `documents.list` dans `frontend/src/services/api.ts` pour accepter un objet `DocumentFilters` et le sérialiser correctement en paramètres de requête pour l'API.
*   **Frontend Hook:** Création du hook `useDebounce` pour optimiser les champs de recherche textuelle.
*   **Frontend Component:** Création du composant `DocumentFilters.tsx`, contenant l'interface utilisateur pour tous les nouveaux filtres (recherche, dates, montants, tags, etc.).
*   **Frontend Page:** Intégration de `DocumentFilters` dans `DocumentsPage.tsx`, ajout de la gestion de l'état des filtres et liaison avec l'appel API mis à jour. La page gère désormais le rafraîchissement dynamique de la liste en fonction des filtres appliqués.

---

## 2026-02-01 - Mise à jour de la Documentation

*   **Documentation:** Mise à jour de la documentation (`docs_src`) pour refléter l'implémentation de la recherche avancée sur les documents.
    - Ajout des nouveaux paramètres de requête à `docs_src/api/documents.md`.
    - Mention des nouveaux composants frontend dans `docs_src/architecture/frontend.md`.
*   **Génération de site:** Le site statique de la documentation (`docs/`) a été régénéré avec succès.

---

## 2026-02-01 - Uniformisation des commandes Docker

*   **Documentation:** Remplacement de toutes les occurrences de `docker-compose` par `docker compose` dans les fichiers de documentation (`README.md`, `CLAUDE.md`, `GEMINI.md`, `history.md`, et tous les fichiers `docs_src/**/*.md`).
*   **Génération de site:** Le site statique de la documentation (`docs/`) a été régénéré pour refléter ces changements.

---

## 2026-02-01 - Export PDF et Rapports

*   **Frontend API Service:** Ajout des fonctions `monthlyPDF`, `annualPDF`, et `exportChart` au service `api.ts`. La logique de téléchargement de blob a été refactorisée dans une fonction d'aide pour éviter la duplication de code.
*   **Frontend UI:** Mise à jour de la page `SettingsPage.tsx` pour inclure les nouvelles sections d'interface utilisateur pour l'exportation de rapports PDF mensuels et annuels, ainsi que l'exportation de graphiques individuels au format PNG. De nouveaux états et gestionnaires d'événements ont été ajoutés pour prendre en charge cette fonctionnalité.
