/**
 * Page Articles - Liste et statistiques des articles achetés
 * Affiche tous les articles avec filtres avancés
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  TrendingUp,
  ArrowUpDown,
  Link as LinkIcon,
  Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { items as itemsApi } from '../services/api';
import type { ItemFilters as ItemFiltersType, Item } from '../types';
import ItemFilters from '../components/ItemFilters';

// ============================================
// Helpers
// ============================================

/**
 * Extrait un message d'erreur lisible depuis une réponse d'erreur API
 */
const extractErrorMessage = (err: any, fallback: string): string => {
  const detail = err.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
  }
  if (typeof detail === 'object' && detail.msg) {
    return detail.msg;
  }
  return fallback;
};

// ============================================
// Types locaux
// ============================================

type SortField = 'name' | 'quantity' | 'price';
type SortDir = 'asc' | 'desc';

// ============================================
// Composant ItemsPage
// ============================================

const ItemsPage: React.FC = () => {
  // État des données
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [statsData, setStatsData] = useState<{ total_spent: number; total_quantity: number }>({
    total_spent: 0,
    total_quantity: 0,
  });
  const [totalCount, setTotalCount] = useState(0);

  // État UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [filters, setFilters] = useState<Partial<ItemFiltersType>>({});
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  /**
   * Charge les données avec les filtres
   */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await itemsApi.list(filters);
      setItemsList(response.items);
      setStatsData(response.stats);
      setTotalCount(response.total);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors du chargement'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Chargement initial et lors des changements de filtres
  useEffect(() => {
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  /**
   * Gestion des changements de filtres
   */
  const handleFiltersChange = (newFilters: Partial<ItemFiltersType>) => {
    setFilters(newFilters);
  };

  /**
   * Trie les items
   */
  const getSortedItems = () => {
    return [...itemsList].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = (a.quantity || 1) - (b.quantity || 1);
          break;
        case 'price':
          comparison = (a.total_price || a.unit_price || 0) - (b.total_price || b.unit_price || 0);
          break;
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });
  };

  /**
   * Change le tri
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  /**
   * Formate un montant
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const sortedItems = getSortedItems();

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Header */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Articles</h1>
          <p className="text-slate-600 mt-1">
            Statistiques de tous vos achats par article
          </p>
        </div>
        <Link
          to="/item-aliases"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
        >
          <LinkIcon className="w-4 h-4" />
          Gérer les regroupements
        </Link>
      </div>

      {/* ============================================ */}
      {/* Stats résumé */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Articles trouvés</p>
              <p className="text-xl font-bold text-slate-800">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total dépensé</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(statsData.total_spent)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Quantité totale</p>
              <p className="text-xl font-bold text-slate-800">{statsData.total_quantity.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Filtres */}
      {/* ============================================ */}
      <ItemFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* ============================================ */}
      {/* Erreur */}
      {/* ============================================ */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* ============================================ */}
      {/* Liste des articles */}
      {/* ============================================ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-600">Chargement...</span>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
          <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-slate-800">Aucun article</h3>
          <p className="mt-2 text-sm text-slate-500">
            {Object.keys(filters).length > 0
              ? 'Aucun article ne correspond aux filtres'
              : 'Uploadez des documents pour voir vos articles'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header du tableau */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
            <button
              onClick={() => handleSort('name')}
              className="col-span-6 flex items-center gap-1 hover:text-slate-800"
            >
              Article
              {sortField === 'name' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleSort('quantity')}
              className="col-span-2 flex items-center gap-1 hover:text-slate-800 justify-end"
            >
              Quantité
              {sortField === 'quantity' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleSort('price')}
              className="col-span-2 flex items-center gap-1 hover:text-slate-800 justify-end"
            >
              Prix unit.
              {sortField === 'price' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <div className="col-span-2 text-right">Total</div>
          </div>

          {/* Liste */}
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {sortedItems.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-50 items-center"
              >
                <div className="col-span-6">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm w-6">{index + 1}.</span>
                    <span className="text-slate-800 font-medium">{item.name}</span>
                    {item.category && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-right text-slate-600">
                  {item.quantity || 1} {item.unit || ''}
                </div>
                <div className="col-span-2 text-right text-slate-600">
                  {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                </div>
                <div className="col-span-2 text-right font-medium text-slate-800">
                  {item.total_price ? formatCurrency(item.total_price) : (item.unit_price ? formatCurrency(item.unit_price * (item.quantity || 1)) : '-')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsPage;
