/**
 * Liste des plus grosses dépenses du mois.
 *
 * Affiche les N dernières transactions triées par montant décroissant.
 */

import React from 'react';
import { FileText, ShoppingBag, CreditCard, Receipt } from 'lucide-react';
import { clsx } from 'clsx';

// ============================================
// Types
// ============================================

export interface ExpenseData {
  /** ID du document */
  id: number;
  /** Nom du marchand */
  merchant: string | null;
  /** Nom original du fichier (fallback) */
  original_name: string;
  /** Type de document */
  doc_type: string | null;
  /** Montant */
  total_amount: number;
  /** Date */
  date: string | null;
  /** Tags associés */
  tags: Array<{ id: number; name: string; color: string }>;
}

interface TopExpensesProps {
  /** Liste des dépenses */
  expenses: ExpenseData[];
  /** Titre du composant */
  title?: string;
  /** Nombre max d'éléments à afficher */
  limit?: number;
  /** État de chargement */
  isLoading?: boolean;
}

// ============================================
// Helpers
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/** Retourne l'icône selon le type de document */
const getDocIcon = (docType: string | null) => {
  switch (docType) {
    case 'receipt':
      return Receipt;
    case 'invoice':
      return FileText;
    default:
      return ShoppingBag;
  }
};

// ============================================
// Composant
// ============================================

export default function TopExpenses({
  expenses,
  title = 'Dernières dépenses',
  limit = 5,
  isLoading = false
}: TopExpensesProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-slate-100 rounded w-20"></div>
              </div>
              <div className="h-5 bg-slate-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Message si pas de données
  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="py-8 text-center text-slate-400">
          Aucune dépense ce mois
        </div>
      </div>
    );
  }

  // Limiter le nombre d'éléments
  const displayedExpenses = expenses.slice(0, limit);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <a
          href="/documents"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Voir tout
        </a>
      </div>

      <div className="space-y-3">
        {displayedExpenses.map((expense) => {
          const Icon = getDocIcon(expense.doc_type);
          const displayName = expense.merchant || expense.original_name;

          return (
            <div
              key={expense.id}
              className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {/* Icône */}
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-slate-500" />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">{displayName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {formatDate(expense.date)}
                  </span>
                  {expense.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag.id}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Montant */}
              <span className="font-semibold text-slate-800">
                {formatCurrency(expense.total_amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
