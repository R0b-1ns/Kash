/**
 * Page Dashboard - Vue d'ensemble des finances
 *
 * Affiche :
 * - Cartes statistiques (solde, dépenses, revenus, épargne, moyenne/jour, projection)
 * - Évolution par catégorie (stacked area)
 * - Graphique d'évolution mensuelle
 * - Répartition par tag + Récurrent/Ponctuel + Dépenses par jour
 * - Suivi des budgets
 * - Dernières dépenses + Plus grosses dépenses + Top marchands
 * - Articles fréquents (quantité et montant)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Repeat,
  PiggyBank,
  Calendar,
  Target,
} from 'lucide-react';
import { format, subMonths, addMonths, parseISO, getDaysInMonth, getDate } from 'date-fns';
import { fr } from 'date-fns/locale';

// Services
import { stats, budgets, documents, recurring } from '../services/api';

// Composants du dashboard
import {
  StatCard,
  MonthlyChart,
  TagPieChart,
  BudgetProgress,
  TopExpenses,
  TopItems,
  TopMerchants,
  RecurringBreakdown,
  TagEvolutionChart,
  DayOfWeekChart,
  TopTransactions,
} from '../components/dashboard';

// Types
import type { MonthlyData } from '../components/dashboard/MonthlyChart';
import type { TagSpendingData } from '../components/dashboard/TagPieChart';
import type { BudgetData } from '../components/dashboard/BudgetProgress';
import type { ExpenseData } from '../components/dashboard/TopExpenses';
import type { TopItemData } from '../components/dashboard/TopItems';
import type { TopMerchantData } from '../components/dashboard/TopMerchants';
import type { RecurringBreakdownData } from '../components/dashboard/RecurringBreakdown';
import type { TagEvolutionData } from '../components/dashboard/TagEvolutionChart';
import type { DayOfWeekData } from '../components/dashboard/DayOfWeekChart';
import type { TopTransactionData } from '../components/dashboard/TopTransactions';
import type { StatsSummaryWithComparison } from '../types';

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
  const [summary, setSummary] = useState<StatsSummaryWithComparison | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [tagData, setTagData] = useState<TagSpendingData[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseData[]>([]);
  const [topItems, setTopItems] = useState<TopItemData[]>([]);
  const [recurringTotal, setRecurringTotal] = useState<number | null>(null);
  // Nouvelles données
  const [topMerchants, setTopMerchants] = useState<TopMerchantData[]>([]);
  const [recurringBreakdown, setRecurringBreakdown] = useState<RecurringBreakdownData | null>(null);
  const [tagEvolution, setTagEvolution] = useState<TagEvolutionData[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<DayOfWeekData[]>([]);
  const [topTransactions, setTopTransactions] = useState<TopTransactionData[]>([]);

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
      const [
        summaryRes,
        monthlyRes,
        tagRes,
        budgetRes,
        docsRes,
        itemsRes,
        recurringRes,
        // Nouvelles données
        topMerchantsRes,
        recurringBreakdownRes,
        tagEvolutionRes,
        dayOfWeekRes,
        topTransactionsRes,
      ] = await Promise.all([
        stats.getSummary(monthString, true).catch(() => null),
        stats.getMonthly(6).catch(() => []),
        stats.getByTag(monthString).catch(() => []),
        budgets.getCurrent(monthString).catch(() => []),
        documents.list({ limit: 10, is_income: false }).catch(() => []),
        stats.getTopItems({ month: monthString, limit: 10 }).catch(() => []),
        recurring.getSummary(monthString).catch(() => null),
        // Nouvelles requêtes
        stats.getTopMerchants({ month: monthString, limit: 5 }).catch(() => []),
        stats.getRecurringBreakdown(monthString).catch(() => null),
        stats.getTagEvolution(6).catch(() => []),
        stats.getByDayOfWeek(monthString).catch(() => []),
        stats.getTopTransactions({ month: monthString, limit: 5 }).catch(() => []),
      ]);

      if (summaryRes) {
        setSummary(summaryRes);
      }

      if (recurringRes) {
        setRecurringTotal(recurringRes.total_monthly);
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

      // Nouvelles données
      setTopMerchants(topMerchantsRes);
      setRecurringBreakdown(recurringBreakdownRes);
      setTagEvolution(tagEvolutionRes);
      setDayOfWeekData(dayOfWeekRes);
      setTopTransactions(topTransactionsRes);
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
  // Calculs dérivés pour les nouvelles StatCards
  // ============================================

  // Taux d'épargne: (revenus - dépenses) / revenus * 100
  const savingsRate = useMemo(() => {
    if (!summary || summary.total_income === 0) return null;
    return ((summary.total_income - summary.total_expenses) / summary.total_income) * 100;
  }, [summary]);

  // Moyenne journalière: dépenses / jours écoulés dans le mois
  const dailyAverage = useMemo(() => {
    if (!summary) return null;
    const today = new Date();
    const monthDate = parseISO(`${monthString}-01`);
    const daysInSelectedMonth = getDaysInMonth(monthDate);

    // Si mois actuel, utiliser le jour courant, sinon tous les jours du mois
    let daysElapsed: number;
    if (isCurrentMonth) {
      daysElapsed = getDate(today);
    } else {
      daysElapsed = daysInSelectedMonth;
    }

    if (daysElapsed === 0) return null;
    return summary.total_expenses / daysElapsed;
  }, [summary, monthString, isCurrentMonth]);

  // Projection fin de mois: moyenne * jours dans le mois
  const projection = useMemo(() => {
    if (dailyAverage === null) return null;
    const monthDate = parseISO(`${monthString}-01`);
    const daysInMonth = getDaysInMonth(monthDate);
    return dailyAverage * daysInMonth;
  }, [dailyAverage, monthString]);

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
      {/* Cartes statistiques - Ligne 1 */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
          change={summary?.expense_change_percent ?? undefined}
          changeLabel="vs mois dernier"
          isLoading={isLoading}
        />
        <StatCard
          title="Revenus"
          value={summary ? formatCurrency(summary.total_income) : '—'}
          icon={TrendingUp}
          color="green"
          change={summary?.income_change_percent ?? undefined}
          changeLabel="vs mois dernier"
          isLoading={isLoading}
        />
        <StatCard
          title="Taux d'épargne"
          value={savingsRate !== null ? `${savingsRate.toFixed(0)}%` : '—'}
          icon={PiggyBank}
          color={savingsRate !== null && savingsRate >= 0 ? 'green' : 'red'}
          isLoading={isLoading}
        />
        <StatCard
          title="Moyenne/jour"
          value={dailyAverage !== null ? formatCurrency(dailyAverage) : '—'}
          icon={Calendar}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="Projection"
          value={projection !== null ? formatCurrency(projection) : '—'}
          icon={Target}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* ============================================ */}
      {/* Cartes statistiques - Ligne 2 */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Abonnements"
          value={recurringTotal !== null ? formatCurrency(recurringTotal) : '—'}
          icon={Repeat}
          color="purple"
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
      {/* Évolution par catégorie (full width) */}
      {/* ============================================ */}
      <TagEvolutionChart data={tagEvolution} isLoading={isLoading} />

      {/* ============================================ */}
      {/* Graphique d'évolution mensuelle */}
      {/* ============================================ */}
      <MonthlyChart data={monthlyData} isLoading={isLoading} />

      {/* ============================================ */}
      {/* Répartition par tag + Récurrent/Ponctuel + Dépenses par jour */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TagPieChart data={tagData} isLoading={isLoading} />
        <RecurringBreakdown data={recurringBreakdown} isLoading={isLoading} />
        <DayOfWeekChart data={dayOfWeekData} isLoading={isLoading} />
      </div>

      {/* ============================================ */}
      {/* Suivi des budgets */}
      {/* ============================================ */}
      <BudgetProgress budgets={budgetData} isLoading={isLoading} />

      {/* ============================================ */}
      {/* Dernières dépenses + Plus grosses dépenses + Top marchands */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopExpenses
          expenses={recentExpenses}
          title="Dernières dépenses"
          isLoading={isLoading}
        />
        <TopTransactions
          transactions={topTransactions}
          isLoading={isLoading}
        />
        <TopMerchants
          merchants={topMerchants}
          isLoading={isLoading}
        />
      </div>

      {/* ============================================ */}
      {/* Articles fréquents (quantité) + Articles fréquents (montant) */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopItems
          items={topItems}
          sortBy="quantity"
          title="Articles fréquents (quantité)"
          isLoading={isLoading}
        />
        <TopItems
          items={topItems}
          sortBy="spent"
          title="Articles fréquents (montant)"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
