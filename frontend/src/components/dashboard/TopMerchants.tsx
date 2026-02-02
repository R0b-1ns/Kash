/**
 * Liste des marchands avec le plus de dépenses.
 *
 * Affiche les marchands triés par montant total avec barres de progression.
 */

import React from 'react';
import { Store } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface TopMerchantData {
  merchant: string;
  total_spent: number;
  visit_count: number;
}

interface TopMerchantsProps {
  merchants: TopMerchantData[];
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

// ============================================
// Composant
// ============================================

export default function TopMerchants({
  merchants,
  limit = 5,
  isLoading = false
}: TopMerchantsProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 bg-slate-100 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-slate-100 rounded w-20"></div>
              </div>
              <div className="h-5 bg-slate-200 rounded w-14"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Message si pas de données
  if (merchants.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Top Marchands
        </h3>
        <div className="py-8 text-center text-slate-400">
          Aucun marchand enregistré
        </div>
      </div>
    );
  }

  // Limiter et calculer le max pour les barres
  const displayedMerchants = merchants.slice(0, limit);
  const maxSpent = Math.max(...displayedMerchants.map((m) =>
    typeof m.total_spent === 'string' ? parseFloat(m.total_spent) : m.total_spent
  ));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Top Marchands
      </h3>

      <div className="space-y-3">
        {displayedMerchants.map((merchant, index) => {
          const spent = typeof merchant.total_spent === 'string'
            ? parseFloat(merchant.total_spent)
            : merchant.total_spent;
          const barWidth = (spent / maxSpent) * 100;

          return (
            <div key={index} className="relative">
              {/* Barre de fond */}
              <div
                className="absolute inset-0 bg-purple-50 rounded-lg"
                style={{ width: `${barWidth}%` }}
              />

              {/* Contenu */}
              <div className="relative flex items-center gap-3 p-2">
                {/* Icône */}
                <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                  <Store className="w-3.5 h-3.5 text-purple-600" />
                </div>

                {/* Nom et visites */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate text-sm">
                    {merchant.merchant}
                  </p>
                  <p className="text-xs text-slate-400">
                    {merchant.visit_count} visite{merchant.visit_count > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Montant */}
                <span className="font-semibold text-slate-800 text-sm">
                  {formatCurrency(merchant.total_spent)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
