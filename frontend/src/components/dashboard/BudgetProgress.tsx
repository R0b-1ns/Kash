/**
 * Composant de progression des budgets.
 *
 * Affiche une liste de barres de progression pour chaque budget :
 * - Nom du tag avec sa couleur
 * - Barre de progression colorée selon le % consommé
 * - Montant dépensé / limite
 */

import React from 'react';
import { clsx } from 'clsx';

// ============================================
// Types
// ============================================

export interface BudgetData {
  /** ID du budget */
  id: number;
  /** ID du tag */
  tag_id: number;
  /** Nom du tag */
  tag_name: string;
  /** Couleur du tag */
  tag_color: string;
  /** Mois (YYYY-MM) */
  month: string;
  /** Montant limite */
  limit_amount: number;
  /** Montant dépensé */
  spent_amount: number;
  /** Montant restant */
  remaining_amount: number;
  /** Pourcentage consommé */
  percentage_used: number;
}

interface BudgetProgressProps {
  /** Liste des budgets */
  budgets: BudgetData[];
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/** Retourne la couleur de la barre selon le pourcentage */
const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-orange-500';
  if (percentage >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
};

/** Retourne la couleur du texte selon le pourcentage */
const getTextColor = (percentage: number): string => {
  if (percentage >= 100) return 'text-red-600';
  if (percentage >= 80) return 'text-orange-600';
  return 'text-slate-600';
};

// ============================================
// Composant d'un budget individuel
// ============================================

interface BudgetItemProps {
  budget: BudgetData;
}

function BudgetItem({ budget }: BudgetItemProps) {
  const progressWidth = Math.min(budget.percentage_used, 100);

  return (
    <div className="py-3">
      {/* Header : nom du tag et montants */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: budget.tag_color }}
          />
          <span className="font-medium text-slate-700">{budget.tag_name}</span>
        </div>
        <span className={clsx('text-sm font-medium', getTextColor(budget.percentage_used))}>
          {formatCurrency(budget.spent_amount)} / {formatCurrency(budget.limit_amount)}
        </span>
      </div>

      {/* Barre de progression */}
      <div className="relative">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              getProgressColor(budget.percentage_used)
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* Indicateur de dépassement */}
        {budget.percentage_used > 100 && (
          <div className="absolute -right-1 -top-1">
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
              +{(budget.percentage_used - 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Montant restant */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-slate-400">
          {budget.percentage_used.toFixed(0)}% utilisé
        </span>
        <span className={clsx(
          'text-xs',
          budget.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {budget.remaining_amount >= 0 ? 'Reste' : 'Dépassement'}: {formatCurrency(Math.abs(budget.remaining_amount))}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Composant principal
// ============================================

export default function BudgetProgress({ budgets, isLoading = false }: BudgetProgressProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-4 bg-slate-200 rounded w-20"></div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Message si pas de budgets
  if (budgets.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Suivi des budgets
        </h3>
        <div className="py-8 text-center">
          <p className="text-slate-400 mb-2">Aucun budget défini</p>
          <a
            href="/budgets"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Créer un budget
          </a>
        </div>
      </div>
    );
  }

  // Trier par pourcentage décroissant (les plus critiques en premier)
  const sortedBudgets = [...budgets].sort((a, b) => b.percentage_used - a.percentage_used);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Suivi des budgets
        </h3>
        <a
          href="/budgets"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Voir tout
        </a>
      </div>

      <div className="divide-y divide-slate-100">
        {sortedBudgets.map((budget) => (
          <BudgetItem key={budget.id} budget={budget} />
        ))}
      </div>
    </div>
  );
}
