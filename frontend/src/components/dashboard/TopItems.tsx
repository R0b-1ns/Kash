/**
 * Liste des articles les plus achetés.
 *
 * Affiche les produits triés par montant ou quantité.
 */

import React, { useMemo } from 'react';
import { Package, ShoppingCart } from 'lucide-react';

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
  /** Mode de tri: par montant dépensé ou par quantité */
  sortBy?: 'spent' | 'quantity';
  /** Titre personnalisé */
  title?: string;
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
  isLoading = false,
  sortBy = 'spent',
  title,
}: TopItemsProps) {
  // Déterminer le titre et l'icône en fonction du mode
  const displayTitle = title || (sortBy === 'quantity' ? 'Articles fréquents (quantité)' : 'Articles fréquents (montant)');
  const Icon = sortBy === 'quantity' ? ShoppingCart : Package;
  const bgColor = sortBy === 'quantity' ? 'bg-green-50' : 'bg-blue-50';
  const iconBgColor = sortBy === 'quantity' ? 'bg-green-100' : 'bg-blue-100';
  const iconColor = sortBy === 'quantity' ? 'text-green-600' : 'text-blue-600';

  // Trier les articles selon le mode
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      if (sortBy === 'quantity') {
        const qtyA = typeof a.total_quantity === 'string' ? parseFloat(a.total_quantity) : a.total_quantity;
        const qtyB = typeof b.total_quantity === 'string' ? parseFloat(b.total_quantity) : b.total_quantity;
        return qtyB - qtyA;
      } else {
        const spentA = typeof a.total_spent === 'string' ? parseFloat(a.total_spent) : a.total_spent;
        const spentB = typeof b.total_spent === 'string' ? parseFloat(b.total_spent) : b.total_spent;
        return spentB - spentA;
      }
    });
    return sorted.slice(0, limit);
  }, [items, sortBy, limit]);

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
          {displayTitle}
        </h3>
        <div className="py-8 text-center text-slate-400">
          Aucun article enregistré
        </div>
      </div>
    );
  }

  // Calculer le max pour les barres (selon le mode)
  const maxValue = sortBy === 'quantity'
    ? Math.max(...sortedItems.map((i) =>
        typeof i.total_quantity === 'string' ? parseFloat(i.total_quantity) : i.total_quantity
      ))
    : Math.max(...sortedItems.map((i) =>
        typeof i.total_spent === 'string' ? parseFloat(i.total_spent) : i.total_spent
      ));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        {displayTitle}
      </h3>

      <div className="space-y-3">
        {sortedItems.map((item, index) => {
          const spent = typeof item.total_spent === 'string' ? parseFloat(item.total_spent) : item.total_spent;
          const quantity = typeof item.total_quantity === 'string' ? parseFloat(item.total_quantity) : item.total_quantity;
          const currentValue = sortBy === 'quantity' ? quantity : spent;
          const barWidth = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;

          return (
            <div key={index} className="relative">
              {/* Barre de fond */}
              <div
                className={`absolute inset-0 ${bgColor} rounded-lg`}
                style={{ width: `${barWidth}%` }}
              />

              {/* Contenu */}
              <div className="relative flex items-center gap-3 p-2">
                {/* Icône */}
                <div className={`w-6 h-6 ${iconBgColor} rounded flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                </div>

                {/* Nom et détails */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate text-sm">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatQuantity(item.total_quantity)} unités • {item.purchase_count} achat{item.purchase_count > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Valeur principale selon le mode */}
                <span className="font-semibold text-slate-800 text-sm">
                  {sortBy === 'quantity'
                    ? `${formatQuantity(item.total_quantity)} u.`
                    : formatCurrency(item.total_spent)
                  }
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
