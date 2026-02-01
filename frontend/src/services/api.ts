/**
 * Client API pour le Finance Manager
 * Configuration Axios avec intercepteurs et fonctions pour chaque endpoint
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  Document,
  DocumentListItem,
  DocumentFilters,
  DocumentStatusResponse,
  Item,
  ItemCreate,
  ItemUpdate,
  ItemFilters,
  ItemListResponse,
  ItemAliasGroup,
  ItemAliasSuggestion,
  DistinctItem,
  ItemAliasCreate,
  ItemAliasBulkCreate,
  ItemAliasGroupUpdate,
  Tag,
  TagCreate,
  TagUpdate,
  Budget,
  BudgetCreate,
  BudgetUpdate,
  BudgetWithSpending,
  BudgetTemplate,
  BudgetTemplateCreate,
  BudgetTemplateApplyResult,
  StatsSummary,
  StatsByTag,
  MonthlyStats,
  TopItem,
  SyncStatus,
  SyncConfigStatus,
  SyncResult,
  SyncRunResult,
  ExportParams,
  ManualEntryCreate,
  RecurringSummary,
  RecurringGenerateResult,
} from '../types';

// URL de base de l'API (configurée via variables d'environnement)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Clé de stockage du token
const TOKEN_KEY = 'finance_manager_token';

/**
 * Instance Axios configurée pour l'API
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Intercepteur de requête : ajoute le token JWT à chaque requête
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Intercepteur de réponse : gère les erreurs d'authentification
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Si erreur 401, le token est invalide ou expiré
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // Rediriger vers la page de login (sauf si déjà sur login)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// Fonctions utilitaires
// ============================================

/**
 * Sauvegarde le token dans le localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Récupère le token du localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Supprime le token du localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// ============================================
// API d'authentification
// ============================================

export const auth = {
  /**
   * Inscription d'un nouvel utilisateur
   */
  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', data);
    return response.data;
  },

  /**
   * Connexion d'un utilisateur
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

    // Sauvegarder le token automatiquement
    if (response.data.access_token) {
      setToken(response.data.access_token);
    }

    return response.data;
  },

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};

// ============================================
// API des documents
// ============================================

export const documents = {
  /**
   * Liste tous les documents de l'utilisateur
   */
  list: async (filters?: DocumentFilters): Promise<DocumentListItem[]> => {
    // Nettoyer les filtres pour ne pas envoyer de valeurs vides ou nulles
    const params: Record<string, any> = {};

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        // Gérer le cas spécifique de is_income qui peut être `false`
        if (key === 'is_income' && value === false) {
          params[key] = false;
        }
        // Pour les autres clés, ne pas envoyer si null, undefined ou chaîne vide
        else if (value !== null && value !== undefined && value !== '') {
          if (key === 'tag_ids' && Array.isArray(value) && value.length > 0) {
            params[key] = value.join(',');
          } else if (key !== 'tag_ids') {
            params[key] = value;
          }
        }
      });
    }

    const response = await apiClient.get<DocumentListItem[]>('/documents', { params });
    return response.data;
  },

  /**
   * Upload un nouveau document
   * @param file - Le fichier à uploader
   */
  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<Document>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Récupère un document par son ID
   */
  get: async (id: number): Promise<Document> => {
    const response = await apiClient.get<Document>(`/documents/${id}`);
    return response.data;
  },

  /**
   * Met à jour un document
   */
  update: async (id: number, data: Partial<Document>): Promise<Document> => {
    const response = await apiClient.put<Document>(`/documents/${id}`, data);
    return response.data;
  },

  /**
   * Supprime un document
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  /**
   * Relance l'extraction OCR/IA sur un document
   */
  reprocess: async (id: number): Promise<Document> => {
    const response = await apiClient.post<Document>(`/documents/${id}/reprocess`);
    return response.data;
  },

  /**
   * Ajoute un tag à un document
   */
  addTag: async (documentId: number, tagId: number): Promise<Document> => {
    const response = await apiClient.post<Document>(`/documents/${documentId}/tags/${tagId}`);
    return response.data;
  },

  /**
   * Retire un tag d'un document
   */
  removeTag: async (documentId: number, tagId: number): Promise<Document> => {
    const response = await apiClient.delete<Document>(`/documents/${documentId}/tags/${tagId}`);
    return response.data;
  },

  /**
   * Crée une entrée financière manuelle (sans fichier)
   */
  createManual: async (data: ManualEntryCreate): Promise<Document> => {
    const response = await apiClient.post<Document>('/documents/manual', data);
    return response.data;
  },

  /**
   * Duplique un document (utile pour les entrées récurrentes)
   */
  duplicate: async (id: number): Promise<Document> => {
    const response = await apiClient.post<Document>(`/documents/${id}/duplicate`);
    return response.data;
  },

  /**
   * Récupère le fichier d'un document sous forme de Blob URL
   * Utile pour afficher les images/PDF dans le navigateur
   */
  getFileBlob: async (id: number): Promise<string> => {
    const response = await apiClient.get(`/documents/${id}/file`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  /**
   * Récupère le statut de traitement d'un document
   * Utilisé pour le polling pendant l'upload asynchrone
   */
  getStatus: async (id: number): Promise<DocumentStatusResponse> => {
    const response = await apiClient.get<DocumentStatusResponse>(`/documents/${id}/status`);
    return response.data;
  },
};

// ============================================
// API des items (articles)
// ============================================

export const items = {
  /**
   * Liste les articles avec filtres avancés
   */
  list: async (filters?: ItemFilters): Promise<ItemListResponse> => {
    const params: Record<string, any> = {};

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'tag_ids' && Array.isArray(value) && value.length > 0) {
            params[key] = value.join(',');
          } else if (key !== 'tag_ids') {
            params[key] = value;
          }
        }
      });
    }

    const response = await apiClient.get<ItemListResponse>('/items', { params });
    return response.data;
  },

  /**
   * Ajoute un article à un document
   */
  create: async (documentId: number, data: ItemCreate): Promise<Item> => {
    const response = await apiClient.post<Item>(`/items/documents/${documentId}`, data);
    return response.data;
  },

  /**
   * Met à jour un article
   */
  update: async (itemId: number, data: ItemUpdate): Promise<Item> => {
    const response = await apiClient.put<Item>(`/items/${itemId}`, data);
    return response.data;
  },

  /**
   * Supprime un article
   */
  delete: async (itemId: number): Promise<void> => {
    await apiClient.delete(`/items/${itemId}`);
  },
};

// ============================================
// API des alias d'articles
// ============================================

export const itemAliases = {
  /**
   * Liste tous les groupes d'alias
   */
  list: async (): Promise<ItemAliasGroup[]> => {
    const response = await apiClient.get<ItemAliasGroup[]>('/item-aliases');
    return response.data;
  },

  /**
   * Récupère les suggestions de regroupement
   */
  getSuggestions: async (params?: {
    min_occurrences?: number;
    max_distance?: number;
  }): Promise<ItemAliasSuggestion[]> => {
    const response = await apiClient.get<ItemAliasSuggestion[]>('/item-aliases/suggestions', { params });
    return response.data;
  },

  /**
   * Liste les articles distincts avec leur statut d'alias
   */
  listItems: async (params?: {
    search?: string;
    limit?: number;
  }): Promise<DistinctItem[]> => {
    const response = await apiClient.get<DistinctItem[]>('/item-aliases/items-list', { params });
    return response.data;
  },

  /**
   * Crée un alias
   */
  create: async (data: ItemAliasCreate): Promise<any> => {
    const response = await apiClient.post('/item-aliases', data);
    return response.data;
  },

  /**
   * Crée plusieurs alias (regroupement)
   */
  createBulk: async (data: ItemAliasBulkCreate): Promise<{
    success: boolean;
    canonical_name: string;
    created: number;
    skipped: number;
    errors: string[];
  }> => {
    const response = await apiClient.post('/item-aliases/bulk', data);
    return response.data;
  },

  /**
   * Renomme un groupe
   */
  renameGroup: async (data: ItemAliasGroupUpdate): Promise<{
    success: boolean;
    updated_count: number;
  }> => {
    const response = await apiClient.put('/item-aliases/group', data);
    return response.data;
  },

  /**
   * Supprime un alias (dégroupe un article)
   */
  delete: async (aliasId: number): Promise<void> => {
    await apiClient.delete(`/item-aliases/${aliasId}`);
  },

  /**
   * Supprime un groupe entier
   */
  deleteGroup: async (canonicalName: string): Promise<void> => {
    await apiClient.delete(`/item-aliases/group/${encodeURIComponent(canonicalName)}`);
  },
};

// ============================================
// API des tags
// ============================================

export const tags = {
  /**
   * Liste tous les tags de l'utilisateur
   */
  list: async (): Promise<Tag[]> => {
    const response = await apiClient.get<Tag[]>('/tags');
    return response.data;
  },

  /**
   * Crée un nouveau tag
   */
  create: async (data: TagCreate): Promise<Tag> => {
    const response = await apiClient.post<Tag>('/tags', data);
    return response.data;
  },

  /**
   * Récupère un tag par son ID
   */
  get: async (id: number): Promise<Tag> => {
    const response = await apiClient.get<Tag>(`/tags/${id}`);
    return response.data;
  },

  /**
   * Met à jour un tag
   */
  update: async (id: number, data: TagUpdate): Promise<Tag> => {
    const response = await apiClient.put<Tag>(`/tags/${id}`, data);
    return response.data;
  },

  /**
   * Supprime un tag
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tags/${id}`);
  },
};

// ============================================
// API des budgets
// ============================================

export const budgets = {
  /**
   * Liste tous les budgets (optionnellement filtrés par mois)
   */
  list: async (params?: { month?: string }): Promise<Budget[]> => {
    const response = await apiClient.get<Budget[]>('/budgets', { params });
    return response.data;
  },

  /**
   * Récupère les budgets du mois avec les dépenses calculées
   * C'est l'endpoint principal pour le dashboard
   */
  getCurrent: async (month?: string): Promise<BudgetWithSpending[]> => {
    const params = month ? { month } : {};
    const response = await apiClient.get<BudgetWithSpending[]>('/budgets/current', { params });
    return response.data;
  },

  /**
   * Crée un nouveau budget
   */
  create: async (data: BudgetCreate): Promise<Budget> => {
    const response = await apiClient.post<Budget>('/budgets', data);
    return response.data;
  },

  /**
   * Met à jour un budget
   */
  update: async (id: number, data: BudgetUpdate): Promise<Budget> => {
    const response = await apiClient.put<Budget>(`/budgets/${id}`, data);
    return response.data;
  },

  /**
   * Supprime un budget
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/budgets/${id}`);
  },
};

// ============================================
// API des templates de budget
// ============================================

export const budgetTemplates = {
  /**
   * Liste tous les templates de l'utilisateur
   */
  list: async (): Promise<BudgetTemplate[]> => {
    const response = await apiClient.get<BudgetTemplate[]>('/budget-templates');
    return response.data;
  },

  /**
   * Crée un template depuis les budgets d'un mois
   */
  create: async (data: BudgetTemplateCreate): Promise<BudgetTemplate> => {
    const response = await apiClient.post<BudgetTemplate>('/budget-templates', data);
    return response.data;
  },

  /**
   * Supprime un template
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/budget-templates/${id}`);
  },

  /**
   * Applique un template à un mois
   */
  apply: async (id: number, month: string): Promise<BudgetTemplateApplyResult> => {
    const response = await apiClient.post<BudgetTemplateApplyResult>(
      `/budget-templates/${id}/apply`,
      { month, skip_existing: true }
    );
    return response.data;
  },
};

// ============================================
// API des statistiques
// ============================================

export const stats = {
  /**
   * Récupère le résumé du mois (dépenses, revenus, solde)
   */
  getSummary: async (month?: string): Promise<StatsSummary> => {
    const params = month ? { month } : {};
    const response = await apiClient.get<StatsSummary>('/stats/summary', { params });
    return response.data;
  },

  /**
   * Récupère les dépenses par tag pour un mois
   */
  getByTag: async (month?: string): Promise<StatsByTag[]> => {
    const params = month ? { month } : {};
    const response = await apiClient.get<StatsByTag[]>('/stats/by-tag', { params });
    return response.data;
  },

  /**
   * Récupère l'évolution mensuelle sur N mois
   */
  getMonthly: async (months: number = 12): Promise<MonthlyStats[]> => {
    const response = await apiClient.get<MonthlyStats[]>('/stats/monthly', { params: { months } });
    return response.data;
  },

  /**
   * Récupère les articles les plus achetés
   */
  getTopItems: async (params?: { month?: string; limit?: number }): Promise<TopItem[]> => {
    const response = await apiClient.get<TopItem[]>('/stats/top-items', { params });
    return response.data;
  },
};

// ============================================
// API de synchronisation NAS
// ============================================

export const sync = {
  /**
   * Récupère le statut de synchronisation
   */
  getStatus: async (): Promise<SyncStatus> => {
    const response = await apiClient.get<SyncStatus>('/sync/status');
    return response.data;
  },

  /**
   * Récupère le statut de configuration du NAS
   */
  getConfig: async (): Promise<SyncConfigStatus> => {
    const response = await apiClient.get<SyncConfigStatus>('/sync/config');
    return response.data;
  },

  /**
   * Teste la connexion au NAS
   */
  testConnection: async (): Promise<SyncResult> => {
    const response = await apiClient.post<SyncResult>('/sync/test');
    return response.data;
  },

  /**
   * Lance la synchronisation de tous les documents en attente
   */
  runSync: async (): Promise<SyncRunResult> => {
    const response = await apiClient.post<SyncRunResult>('/sync/run');
    return response.data;
  },

  /**
   * Synchronise un document spécifique
   */
  syncDocument: async (documentId: number): Promise<SyncResult> => {
    const response = await apiClient.post<SyncResult>(`/sync/document/${documentId}`);
    return response.data;
  },
};

// ============================================
// API d'export
// ============================================

export const exportApi = {
  /**
   * Exporte les documents en CSV
   * Retourne l'URL pour télécharger le fichier
   */
  documentsCSV: async (params?: ExportParams): Promise<void> => {
    const queryParams = new URLSearchParams();

    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.include_items) queryParams.append('include_items', 'true');
    if (params?.tag_ids) {
      params.tag_ids.forEach(id => queryParams.append('tag_ids', id.toString()));
    }

    // Télécharger le fichier directement
    const token = localStorage.getItem(TOKEN_KEY);
    const url = `${API_BASE_URL}/export/documents/csv?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Erreur lors de l\'export');

    // Créer le téléchargement
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;

    // Récupérer le nom du fichier depuis les headers
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
    link.download = filenameMatch ? filenameMatch[1] : 'documents.csv';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Exporte le résumé mensuel en CSV
   */
  monthlyCSV: async (year: number, month: number): Promise<void> => {
    const token = localStorage.getItem(TOKEN_KEY);
    const url = `${API_BASE_URL}/export/monthly/csv?year=${year}&month=${month}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Erreur lors de l\'export');

    // Créer le téléchargement
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `resume_${year}-${month.toString().padStart(2, '0')}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

// ============================================
// API des documents récurrents (abonnements)
// ============================================

export const recurring = {
  /**
   * Liste les templates récurrents de l'utilisateur
   */
  list: async (): Promise<DocumentListItem[]> => {
    const response = await apiClient.get<DocumentListItem[]>('/recurring');
    return response.data;
  },

  /**
   * Récupère le résumé des charges fixes
   */
  getSummary: async (month?: string): Promise<RecurringSummary> => {
    const params = month ? { month } : {};
    const response = await apiClient.get<RecurringSummary>('/recurring/summary', { params });
    return response.data;
  },

  /**
   * Génère les documents récurrents pour un mois donné
   */
  generate: async (month?: string): Promise<RecurringGenerateResult> => {
    const params = month ? { month } : {};
    const response = await apiClient.post<RecurringGenerateResult>('/recurring/generate', null, { params });
    return response.data;
  },

  /**
   * Active/désactive le statut récurrent d'un document
   */
  toggle: async (documentId: number): Promise<Document> => {
    const response = await apiClient.post<Document>(`/recurring/${documentId}/toggle`);
    return response.data;
  },

  /**
   * Liste les documents générés automatiquement pour un mois
   */
  listGenerated: async (month?: string): Promise<DocumentListItem[]> => {
    const params = month ? { month } : {};
    const response = await apiClient.get<DocumentListItem[]>('/recurring/generated', { params });
    return response.data;
  },
};

// Export par défaut de toutes les APIs
export default {
  auth,
  documents,
  items,
  itemAliases,
  tags,
  budgets,
  budgetTemplates,
  stats,
  sync,
  exportApi,
  recurring,
  setToken,
  getToken,
  removeToken,
};
