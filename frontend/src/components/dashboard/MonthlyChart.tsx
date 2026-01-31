/**
 * Graphique d'évolution mensuelle des dépenses et revenus.
 *
 * Affiche un graphique en barres avec :
 * - Dépenses en rouge/orange
 * - Revenus en vert
 * - Axe X : mois
 * - Axe Y : montant en euros
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ============================================
// Types
// ============================================

export interface MonthlyData {
  /** Mois au format "YYYY-MM" ou label court "Jan", "Fév", etc. */
  month: string;
  /** Label affiché sur l'axe X */
  label?: string;
  /** Total des dépenses */
  expenses: number;
  /** Total des revenus */
  income: number;
}

interface MonthlyChartProps {
  /** Données mensuelles */
  data: MonthlyData[];
  /** État de chargement */
  isLoading?: boolean;
}

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

/** Convertit "YYYY-MM" en label court */
const formatMonthLabel = (month: string): string => {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const [, m] = month.split('-');
  return months[parseInt(m, 10) - 1] || month;
};

// ============================================
// Composant Tooltip personnalisé
// ============================================

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
      <p className="font-medium text-slate-700 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

// ============================================
// Composant
// ============================================

export default function MonthlyChart({ data, isLoading = false }: MonthlyChartProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded animate-pulse"></div>
      </div>
    );
  }

  // Préparer les données avec labels formatés
  const chartData = data.map((item) => ({
    ...item,
    label: item.label || formatMonthLabel(item.month),
  }));

  // Message si pas de données
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Évolution mensuelle
        </h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Évolution mensuelle
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `${value}€`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
            />
            <Bar
              dataKey="expenses"
              name="Dépenses"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="income"
              name="Revenus"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
