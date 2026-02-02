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

export interface ItemCreate {
  name: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

export interface ItemUpdate {
  name?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

// ============================================
// Types d'alias d'articles
// ============================================

export interface ItemAlias {
  id: number;
  alias_name: string;
  created_at: string;
}

export interface ItemAliasGroup {
  canonical_name: string;
  aliases: ItemAlias[];
  alias_count: number;
}

export interface ItemAliasSuggestion {
  suggested_canonical: string;
  variants: string[];
  total_occurrences: number;
}

export interface DistinctItem {
  name: string;
  occurrence_count: number;
  total_spent: number;
  has_alias: boolean;
  canonical_name?: string;
}

export interface ItemAliasCreate {
  canonical_name: string;
  alias_name: string;
}

export interface ItemAliasBulkCreate {
  canonical_name: string;
  alias_names: string[];
}

export interface ItemAliasGroupUpdate {
  old_canonical_name: string;
  new_canonical_name: string;
}

// ============================================
// Types de documents
// ============================================

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error';

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
  processing_status?: ProcessingStatus;
  processing_error?: string;
  // Recurring document fields
  is_recurring: boolean;
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly';
  recurring_end_date?: string;
  recurring_parent_id?: number;
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
  is_recurring?: boolean;
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly';
  recurring_parent_id?: number;
  processing_status?: ProcessingStatus;
  processing_error?: string;
  created_at: string;
  tags: Tag[];
}

export interface DocumentStatusResponse {
  status: ProcessingStatus;
  error?: string;
  document?: Document;
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

export interface DocumentFilters {
  search?: string;
  ocr_search?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number | string;
  max_amount?: number | string;
  tag_ids?: number[];
  is_income?: boolean | null;
  doc_type?: string;
}

export interface ItemFilters {
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  start_date?: string;
  end_date?: string;
  merchant?: string;
  tag_ids?: number[];
}

export interface ItemListResponse {
  items: Item[];
  total: number;
  stats: {
    total_spent: number;
    total_quantity: number;
  };
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

export interface TopMerchant {
  merchant: string;
  total_spent: number;
  visit_count: number;
}

export interface RecurringBreakdown {
  recurring_total: number;
  one_time_total: number;
  recurring_count: number;
  one_time_count: number;
  recurring_percentage: number;
}

export interface TagEvolutionEntry {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  amount: number;
}

export interface TagEvolutionMonth {
  month: string;
  tags: TagEvolutionEntry[];
}

export interface DayOfWeekSpending {
  day: number;
  day_name: string;
  total: number;
  count: number;
}

export interface TopTransaction {
  id: number;
  merchant: string | null;
  total_amount: number;
  date: string | null;
  doc_type: string | null;
}

export interface StatsSummaryWithComparison extends StatsSummary {
  previous_expenses?: number;
  previous_income?: number;
  expense_change_percent?: number | null;
  income_change_percent?: number | null;
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

export type ChartType = 'pie' | 'bar' | 'line' | 'donut' | 'area';

export interface ExportChartParams {
  chart_type: ChartType;
  month?: string;
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

// ============================================
// Types de documents récurrents (abonnements)
// ============================================

export interface RecurringTemplate {
  id: number;
  merchant: string;
  total_amount: number;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  is_active: boolean;
  end_date?: string;
  last_generated?: string;
  tags: Array<{ id: number; name: string; color: string }>;
}

export interface RecurringSummary {
  total_monthly: number;
  total_count: number;
  pending_this_month: number;
  generated_this_month: number;
  month: string;
  templates: RecurringTemplate[];
}

export interface RecurringGenerateResult {
  success: boolean;
  month: string;
  created: number;
  skipped: number;
  details: Array<{
    id: number;
    merchant: string;
    date: string;
    total_amount: number;
    parent_id: number;
  }>;
}
