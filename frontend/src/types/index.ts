/**
 * Types TypeScript pour le Finance Manager
 * Définitions des interfaces utilisées dans toute l'application
 */

// ============================================
// Types d'authentification
// ============================================

export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// ============================================
// Types de tags
// ============================================

export interface Tag {
  id: number;
  name: string;
  color: string;
  icon?: string;
  created_at: string;
}

export interface TagCreate {
  name: string;
  color: string;
  icon?: string;
}

export interface TagUpdate {
  name?: string;
  color?: string;
  icon?: string;
}

// ============================================
// Types d'items (articles)
// ============================================

export interface Item {
  id: number;
  document_id: number;
  name: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  category?: string;
  created_at: string;
}

// ============================================
// Types de documents
// ============================================

export interface Document {
  id: number;
  file_path: string;
  original_name: string;
  file_type?: string;
  doc_type?: 'receipt' | 'invoice' | 'payslip' | 'other';
  date?: string;
  time?: string;
  merchant?: string;
  location?: string;
  total_amount?: number;
  currency: string;
  is_income: boolean;
  ocr_raw_text?: string;
  ocr_confidence?: number;
  synced_to_nas: boolean;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  items: Item[];
}

export interface DocumentListItem {
  id: number;
  original_name?: string;
  file_path?: string;
  file_type?: string;
  doc_type?: string;
  date?: string;
  merchant?: string;
  total_amount?: number;
  currency: string;
  is_income: boolean;
  created_at: string;
  tags: Tag[];
}

export interface ManualEntryCreate {
  date: string;
  merchant: string;
  total_amount: number;
  currency?: string;
  is_income?: boolean;
  doc_type?: string;
  tag_ids?: number[];
  notes?: string;
}

// ============================================
// Types de budgets
// ============================================

export interface Budget {
  id: number;
  tag_id: number;
  month: string;
  limit_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  tag?: Tag;
}

export interface BudgetCreate {
  tag_id: number;
  month: string;
  limit_amount: number;
  currency?: string;
}

export interface BudgetUpdate {
  limit_amount?: number;
  currency?: string;
}

export interface BudgetWithSpending {
  id: number;
  tag_id: number;
  tag_name: string;
  tag_color: string;
  month: string;
  limit_amount: number;
  currency: string;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
}

// ============================================
// Types de templates de budget
// ============================================

export interface BudgetTemplateItem {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  limit_amount: number;
  currency: string;
}

export interface BudgetTemplate {
  id: number;
  name: string;
  created_at: string;
  items: BudgetTemplateItem[];
  item_count: number;
}

export interface BudgetTemplateCreate {
  name: string;
  from_month: string;
}

export interface BudgetTemplateApplyResult {
  success: boolean;
  message: string;
  created: number;
  skipped: number;
  month: string;
}

// ============================================
// Types de statistiques
// ============================================

export interface StatsSummary {
  month: string;
  total_expenses: number;
  total_income: number;
  balance: number;
  transaction_count: number;
}

export interface StatsByTag {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

export interface MonthlyStats {
  month: string;
  expenses: number;
  income: number;
}

export interface TopItem {
  name: string;
  total_quantity: number;
  total_spent: number;
  purchase_count: number;
}

// ============================================
// Types de synchronisation NAS
// ============================================

export interface SyncStatus {
  total_documents: number;
  synced: number;
  pending: number;
  sync_percentage: number;
  last_sync: string | null;
  nas_configured: boolean;
}

export interface SyncConfigStatus {
  configured: boolean;
  nas_host: boolean;
  nas_user: boolean;
  nas_path: boolean;
  host: string | null;
  path: string | null;
}

export interface SyncResult {
  success: boolean;
  message: string;
}

export interface SyncRunResult {
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}

// ============================================
// Types d'export
// ============================================

export interface ExportParams {
  start_date?: string;
  end_date?: string;
  tag_ids?: number[];
  include_items?: boolean;
}

// ============================================
// Types d'API génériques
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

// ============================================
// Types de contexte Auth
// ============================================

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}
