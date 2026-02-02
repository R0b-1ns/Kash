/**
 * Graphique donut répartition récurrent vs ponctuel.
 *
 * Affiche la proportion des dépenses récurrentes (abonnements)
 * par rapport aux dépenses ponctuelles.
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// ============================================
// Types
// ============================================

export interface RecurringBreakdownData {
  recurring_total: number;
  one_time_total: number;
  recurring_count: number;
  one_time_count: number;
  recurring_percentage: number;
}

interface RecurringBreakdownProps {
  data: RecurringBreakdownData | null;
  isLoading?: boolean;
}

// ============================================
// Couleurs
// ============================================

const COLORS = {
  recurring: '#8b5cf6', // purple-500
  oneTime: '#f97316',   // orange-500
};

// ============================================
// Helpers
// ============================================

const toNumber = (val: number | string): number => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (value: number | string): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNumber(value));
};

// ============================================
// Tooltip personnalisé
// ============================================

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="font-medium text-slate-700">{data.name}</span>
      </div>
      <p className="text-sm text-slate-600">
        {formatCurrency(data.value)} ({data.count} transaction{data.count > 1 ? 's' : ''})
      </p>
    </div>
  );
};

// ============================================
// Composant
// ============================================

export default function RecurringBreakdown({
  data,
  isLoading = false
}: RecurringBreakdownProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="h-48 flex items-center justify-center">
          <div className="w-32 h-32 bg-slate-100 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Message si pas de données
  if (!data || (toNumber(data.recurring_total) === 0 && toNumber(data.one_time_total) === 0)) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Récurrent vs Ponctuel
        </h3>
        <div className="h-48 flex items-center justify-center text-slate-400">
          Aucune dépense ce mois
        </div>
      </div>
    );
  }

  const total = toNumber(data.recurring_total) + toNumber(data.one_time_total);
  const recurringPct = total > 0 ? (toNumber(data.recurring_total) / total * 100) : 0;

  // Préparer les données pour Recharts
  const chartData = [
    {
      name: 'Récurrent',
      value: toNumber(data.recurring_total),
      count: data.recurring_count,
      color: COLORS.recurring,
    },
    {
      name: 'Ponctuel',
      value: toNumber(data.one_time_total),
      count: data.one_time_count,
      color: COLORS.oneTime,
    },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Récurrent vs Ponctuel
      </h3>

      <div className="h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Pourcentage au centre */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {recurringPct.toFixed(0)}%
            </p>
            <p className="text-xs text-slate-500">récurrent</p>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.recurring }}></div>
          <span className="text-xs text-slate-600">
            Récurrent ({formatCurrency(data.recurring_total)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.oneTime }}></div>
          <span className="text-xs text-slate-600">
            Ponctuel ({formatCurrency(data.one_time_total)})
          </span>
        </div>
      </div>
    </div>
  );
}
