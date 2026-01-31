/**
 * Page Dashboard - Vue d'ensemble des finances
 *
 * Affiche :
 * - Cartes statistiques (solde, dépenses, revenus, transactions)
 * - Graphique d'évolution mensuelle
 * - Répartition par catégorie (donut)
 * - Suivi des budgets
 * - Dernières dépenses
 * - Articles fréquents
 */

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, subMonths, addMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Services
import { stats, budgets, documents } from '../services/api';

// Composants du dashboard
import {
  StatCard,
  MonthlyChart,
  TagPieChart,
  BudgetProgress,
  TopExpenses,
  TopItems,
} from '../components/dashboard';

// Types
import type { MonthlyData } from '../components/dashboard/MonthlyChart';
import type { TagSpendingData } from '../components/dashboard/TagPieChart';
import type { BudgetData } from '../components/dashboard/BudgetProgress';
import type { ExpenseData } from '../components/dashboard/TopExpenses';
import type { TopItemData } from '../components/dashboard/TopItems';
import type { StatsSummary } from '../types';

// ============================================
// Helpers
// ============================================

/** Formate un montant en euros */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/** Formate un mois pour l'affichage */
const formatMonthDisplay = (month: string): string => {
  try {
    const date = parseISO(`${month}-01`);
    return format(date, 'MMMM yyyy', { locale: fr });
  } catch {
    return month;
  }
};

/** Retourne le mois au format YYYY-MM */
const getMonthString = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

// ============================================
// Composant principal
// ============================================

export default function DashboardPage() {
  // État du mois sélectionné
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const monthString = getMonthString(selectedMonth);

  // États de chargement
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Données
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [tagData, setTagData] = useState<TagSpendingData[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseData[]>([]);
  const [topItems, setTopItems] = useState<TopItemData[]>([]);

  // ============================================
  // Chargement des données
  // ============================================

  const loadData = async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Charger toutes les données en parallèle
      const [summaryRes, monthlyRes, tagRes, budgetRes, docsRes, itemsRes] = await Promise.all([
        stats.getSummary(monthString).catch(() => null),
        stats.getMonthly(6).catch(() => []),
        stats.getByTag(monthString).catch(() => []),
        budgets.getCurrent(monthString).catch(() => []),
        documents.list({ limit: 10, is_income: false }).catch(() => []),
        stats.getTopItems({ month: monthString, limit: 5 }).catch(() => []),
      ]);

      if (summaryRes) {
        setSummary(summaryRes);
      }

      setMonthlyData(monthlyRes.map(m => ({
        month: m.month,
        expenses: m.expenses,
        income: m.income,
      })));

      setTagData(tagRes.map(t => ({
        tag_id: t.tag_id,
        tag_name: t.tag_name,
        tag_color: t.tag_color,
        total_amount: t.total_amount,
        percentage: t.percentage,
      })));

      setBudgetData(budgetRes);

      setRecentExpenses(
        docsRes
          .filter(d => !d.is_income && d.total_amount)
          .slice(0, 5)
          .map(d => ({
            id: d.id,
            merchant: d.merchant || null,
            original_name: d.original_name,
            doc_type: d.doc_type || null,
            total_amount: d.total_amount || 0,
            date: d.date || null,
            tags: d.tags.map(t => ({ id: t.id, name: t.name, color: t.color })),
          }))
      );

      setTopItems(itemsRes);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Charger les données au montage et quand le mois change
  useEffect(() => {
    loadData();
  }, [monthString]);

  // ============================================
  // Navigation entre les mois
  // ============================================

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    const next = addMonths(selectedMonth, 1);
    // Ne pas aller dans le futur
    if (next <= new Date()) {
      setSelectedMonth(next);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const isCurrentMonth = getMonthString(selectedMonth) === getMonthString(new Date());

  // ============================================
  // Rendu
  // ============================================

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Header avec sélecteur de mois */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Vue d'ensemble de vos finances</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Sélecteur de mois */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-2 py-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
              title="Mois précédent"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>

            <button
              onClick={goToCurrentMonth}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors min-w-[140px] capitalize"
            >
              {formatMonthDisplay(monthString)}
            </button>

            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Mois suivant"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Bouton rafraîchir */}
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 bg-white rounded-lg shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* Cartes statistiques */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Solde du mois"
          value={summary ? formatCurrency(summary.balance) : '—'}
          icon={Wallet}
          color={summary && summary.balance >= 0 ? 'green' : 'red'}
          isLoading={isLoading}
        />
        <StatCard
          title="Dépenses"
          value={summary ? formatCurrency(summary.total_expenses) : '—'}
          icon={TrendingDown}
          color="orange"
          isLoading={isLoading}
        />
        <StatCard
          title="Revenus"
          value={summary ? formatCurrency(summary.total_income) : '—'}
          icon={TrendingUp}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="Transactions"
          value={summary ? summary.transaction_count.toString() : '—'}
          icon={Receipt}
          color="blue"
          isLoading={isLoading}
        />
      </div>

      {/* ============================================ */}
      {/* Graphique d'évolution mensuelle */}
      {/* ============================================ */}
      <MonthlyChart data={monthlyData} isLoading={isLoading} />

      {/* ============================================ */}
      {/* Répartition par tag + Budgets */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TagPieChart data={tagData} isLoading={isLoading} />
        <BudgetProgress budgets={budgetData} isLoading={isLoading} />
      </div>

      {/* ============================================ */}
      {/* Dernières dépenses + Top articles */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopExpenses
          expenses={recentExpenses}
          title="Dernières dépenses"
          isLoading={isLoading}
        />
        <TopItems items={topItems} isLoading={isLoading} />
      </div>
    </div>
  );
}
