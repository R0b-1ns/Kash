/**
 * Page Articles - Liste et statistiques des articles achetés
 * Affiche tous les articles avec leurs stats d'achat
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar,
  ArrowUpDown,
  Link as LinkIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { stats as statsApi, itemAliases as aliasesApi } from '../services/api';
import type { TopItem, DistinctItem } from '../types';

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

type SortField = 'name' | 'quantity' | 'spent' | 'count';
type SortDir = 'asc' | 'desc';

// ============================================
// Composant ItemsPage
// ============================================

const ItemsPage: React.FC = () => {
  // État des données
  const [items, setItems] = useState<DistinctItem[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);

  // État UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  /**
   * Génère les options de mois (12 derniers mois)
   */
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  /**
   * Charge les données
   */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Charger les top items (avec stats) et la liste complète
      const [topItemsData, allItemsData] = await Promise.all([
        statsApi.getTopItems({ month: selectedMonth || undefined, limit: 500 }),
        aliasesApi.listItems({ search: searchQuery || undefined, limit: 500 }),
      ]);

      setTopItems(topItemsData);
      setItems(allItemsData);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors du chargement'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, searchQuery]);

  // Chargement initial et lors des changements de filtres
  useEffect(() => {
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  /**
   * Fusionne les données de topItems avec les infos d'alias
   */
  const getMergedItems = () => {
    // Créer un map des items avec alias
    const aliasMap = new Map(items.map(item => [item.name, item]));

    // Fusionner avec les top items
    return topItems.map(top => ({
      ...top,
      has_alias: aliasMap.get(top.name)?.has_alias || false,
      canonical_name: aliasMap.get(top.name)?.canonical_name,
    }));
  };

  /**
   * Trie les items
   */
  const getSortedItems = () => {
    const merged = getMergedItems();

    return merged.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = Number(a.total_quantity) - Number(b.total_quantity);
          break;
        case 'spent':
          comparison = Number(a.total_spent) - Number(b.total_spent);
          break;
        case 'count':
          comparison = a.purchase_count - b.purchase_count;
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

  // Stats globales
  const totalItems = sortedItems.length;
  const totalSpent = sortedItems.reduce((sum, item) => sum + Number(item.total_spent), 0);
  const totalPurchases = sortedItems.reduce((sum, item) => sum + item.purchase_count, 0);

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
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Articles différents</p>
              <p className="text-xl font-bold text-slate-800">{totalItems}</p>
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
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Achats totaux</p>
              <p className="text-xl font-bold text-slate-800">{totalPurchases}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Filtres */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtre par mois */}
          <div className="sm:w-48">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les temps</option>
              {getMonthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
            Uploadez des documents pour voir vos articles
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header du tableau */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
            <button
              onClick={() => handleSort('name')}
              className="col-span-5 flex items-center gap-1 hover:text-slate-800"
            >
              Article
              {sortField === 'name' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleSort('count')}
              className="col-span-2 flex items-center gap-1 hover:text-slate-800 justify-end"
            >
              Achats
              {sortField === 'count' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleSort('quantity')}
              className="col-span-2 flex items-center gap-1 hover:text-slate-800 justify-end"
            >
              Quantité
              {sortField === 'quantity' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleSort('spent')}
              className="col-span-3 flex items-center gap-1 hover:text-slate-800 justify-end"
            >
              Total
              {sortField === 'spent' && <ArrowUpDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Liste */}
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {sortedItems.map((item, index) => (
              <div
                key={item.name}
                className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-50 items-center"
              >
                <div className="col-span-5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm w-6">{index + 1}.</span>
                    <span className="text-slate-800 font-medium">{item.name}</span>
                    {(item as any).has_alias && (
                      <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        groupé
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-right text-slate-600">
                  {item.purchase_count}x
                </div>
                <div className="col-span-2 text-right text-slate-600">
                  {Number(item.total_quantity).toFixed(0)}
                </div>
                <div className="col-span-3 text-right font-medium text-slate-800">
                  {formatCurrency(Number(item.total_spent))}
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
