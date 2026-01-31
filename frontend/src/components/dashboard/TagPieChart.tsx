/**
 * Graphique en donut de la répartition des dépenses par tag.
 *
 * Affiche :
 * - Un donut avec les couleurs des tags
 * - Le total au centre
 * - Une légende avec les pourcentages
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

// ============================================
// Types
// ============================================

export interface TagSpendingData {
  /** ID du tag */
  tag_id: number;
  /** Nom du tag */
  tag_name: string;
  /** Couleur du tag (hex) */
  tag_color: string;
  /** Montant total */
  total_amount: number;
  /** Pourcentage du total */
  percentage: number;
}

interface TagPieChartProps {
  /** Données par tag */
  data: TagSpendingData[];
  /** État de chargement */
  isLoading?: boolean;
}

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
// Composant Tooltip personnalisé
// ============================================

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.tag_color }}
        />
        <span className="font-medium text-slate-700">{data.tag_name}</span>
      </div>
      <p className="text-sm text-slate-600">
        {formatCurrency(data.total_amount)} ({toNumber(data.percentage).toFixed(1)}%)
      </p>
    </div>
  );
};

// ============================================
// Composant Légende personnalisée
// ============================================

const CustomLegend = ({ payload }: any) => {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Composant
// ============================================

export default function TagPieChart({ data, isLoading = false }: TagPieChartProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="h-64 flex items-center justify-center">
          <div className="w-48 h-48 bg-slate-100 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Calculer le total
  const total = data.reduce((sum, item) => sum + toNumber(item.total_amount), 0);

  // Message si pas de données
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Répartition par catégorie
        </h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          Aucune dépense ce mois
        </div>
      </div>
    );
  }

  // Préparer les données pour Recharts
  const chartData = data.map((item) => ({
    ...item,
    name: item.tag_name,
    value: toNumber(item.total_amount),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Répartition par catégorie
      </h3>

      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.tag_color}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Total au centre du donut */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
