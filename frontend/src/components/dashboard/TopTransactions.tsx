/**
 * Liste des plus grosses dépenses individuelles.
 *
 * Affiche les transactions avec les plus gros montants.
 */

import React from 'react';
import { CreditCard, FileText, Receipt, Briefcase } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// Types
// ============================================

export interface TopTransactionData {
  id: number;
  merchant: string | null;
  total_amount: number;
  date: string | null;
  doc_type: string | null;
}

interface TopTransactionsProps {
  transactions: TopTransactionData[];
  limit?: number;
  isLoading?: boolean;
}

// ============================================
// Helpers
// ============================================

const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    return format(date, 'd MMM', { locale: fr });
  } catch {
    return '—';
  }
};

const getDocTypeIcon = (docType: string | null) => {
  switch (docType) {
    case 'invoice':
      return FileText;
    case 'receipt':
      return Receipt;
    case 'payslip':
      return Briefcase;
    default:
      return CreditCard;
  }
};

const getDocTypeLabel = (docType: string | null): string => {
  switch (docType) {
    case 'invoice':
      return 'Facture';
    case 'receipt':
      return 'Ticket';
    case 'payslip':
      return 'Fiche de paie';
    default:
      return 'Transaction';
  }
};

// ============================================
// Composant
// ============================================

export default function TopTransactions({
  transactions,
  limit = 5,
  isLoading = false
}: TopTransactionsProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-44 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 bg-slate-100 rounded"></div>
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
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Plus grosses dépenses
        </h3>
        <div className="py-8 text-center text-slate-400">
          Aucune dépense enregistrée
        </div>
      </div>
    );
  }

  const displayedTransactions = transactions.slice(0, limit);
  const maxAmount = Math.max(...displayedTransactions.map((t) =>
    typeof t.total_amount === 'string' ? parseFloat(t.total_amount) : t.total_amount
  ));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Plus grosses dépenses
      </h3>

      <div className="space-y-3">
        {displayedTransactions.map((transaction, index) => {
          const amount = typeof transaction.total_amount === 'string'
            ? parseFloat(transaction.total_amount)
            : transaction.total_amount;
          const barWidth = (amount / maxAmount) * 100;
          const Icon = getDocTypeIcon(transaction.doc_type);

          return (
            <div key={transaction.id} className="relative">
              {/* Barre de fond */}
              <div
                className="absolute inset-0 bg-red-50 rounded-lg"
                style={{ width: `${barWidth}%` }}
              />

              {/* Contenu */}
              <div className="relative flex items-center gap-3 p-2">
                {/* Icône */}
                <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-red-600" />
                </div>

                {/* Marchand et date */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate text-sm">
                    {transaction.merchant || 'Non renseigné'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(transaction.date)} • {getDocTypeLabel(transaction.doc_type)}
                  </p>
                </div>

                {/* Montant */}
                <span className="font-semibold text-red-600 text-sm">
                  {formatCurrency(transaction.total_amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
