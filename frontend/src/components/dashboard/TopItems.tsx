/**
 * Liste des articles les plus achetés.
 *
 * Affiche les produits par montant total dépensé.
 */

import React from 'react';
import { Package } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface TopItemData {
  /** Nom de l'article */
  name: string;
  /** Quantité totale achetée */
  total_quantity: number;
  /** Montant total dépensé */
  total_spent: number;
  /** Nombre d'achats */
  purchase_count: number;
}

interface TopItemsProps {
  /** Liste des articles */
  items: TopItemData[];
  /** Nombre max d'éléments */
  limit?: number;
  /** État de chargement */
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatQuantity = (qty: number | string): string => {
  const num = typeof qty === 'string' ? parseFloat(qty) : qty;
  if (isNaN(num)) return '0';
  if (num === Math.floor(num)) {
    return num.toString();
  }
  return num.toFixed(2);
};

// ============================================
// Composant
// ============================================

export default function TopItems({
  items,
  limit = 5,
  isLoading = false
}: TopItemsProps) {
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
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Articles fréquents
        </h3>
        <div className="py-8 text-center text-slate-400">
          Aucun article enregistré
        </div>
      </div>
    );
  }

  // Limiter et calculer le max pour les barres
  const displayedItems = items.slice(0, limit);
  const maxSpent = Math.max(...displayedItems.map((i) =>
    typeof i.total_spent === 'string' ? parseFloat(i.total_spent) : i.total_spent
  ));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Articles fréquents
      </h3>

      <div className="space-y-3">
        {displayedItems.map((item, index) => {
          const spent = typeof item.total_spent === 'string' ? parseFloat(item.total_spent) : item.total_spent;
          const barWidth = (spent / maxSpent) * 100;

          return (
            <div key={index} className="relative">
              {/* Barre de fond */}
              <div
                className="absolute inset-0 bg-blue-50 rounded-lg"
                style={{ width: `${barWidth}%` }}
              />

              {/* Contenu */}
              <div className="relative flex items-center gap-3 p-2">
                {/* Rang */}
                <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-slate-500">
                    {index + 1}
                  </span>
                </div>

                {/* Nom et quantité */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate text-sm">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatQuantity(item.total_quantity)} unités • {item.purchase_count} achat{item.purchase_count > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Montant */}
                <span className="font-semibold text-slate-800 text-sm">
                  {formatCurrency(item.total_spent)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
