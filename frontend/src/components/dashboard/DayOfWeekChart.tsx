/**
 * Graphique des dépenses par jour de la semaine.
 *
 * Affiche un bar chart montrant les dépenses moyennes par jour.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ============================================
// Types
// ============================================

export interface DayOfWeekData {
  day: number;
  day_name: string;
  total: number;
  count: number;
}

interface DayOfWeekChartProps {
  data: DayOfWeekData[];
  isLoading?: boolean;
}

// ============================================
// Helpers
// ============================================

const toNumber = (val: number | string): number => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Abréviations des jours
const getDayAbbrev = (dayName: string): string => {
  return dayName.substring(0, 3);
};

// Couleurs pour chaque jour (plus foncé = plus de dépenses)
const getBarColor = (value: number, maxValue: number): string => {
  if (maxValue === 0) return '#94a3b8';
  const intensity = value / maxValue;
  if (intensity > 0.8) return '#ef4444'; // red-500
  if (intensity > 0.6) return '#f97316'; // orange-500
  if (intensity > 0.4) return '#eab308'; // yellow-500
  if (intensity > 0.2) return '#22c55e'; // green-500
  return '#94a3b8'; // slate-400
};

// ============================================
// Tooltip personnalisé
// ============================================

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
      <p className="font-medium text-slate-700 mb-1">{data.day_name}</p>
      <p className="text-sm text-slate-600">
        Total: <span className="font-medium">{formatCurrency(toNumber(data.total))}</span>
      </p>
      <p className="text-xs text-slate-400">
        {data.count} transaction{data.count > 1 ? 's' : ''}
      </p>
    </div>
  );
};

// ============================================
// Composant
// ============================================

export default function DayOfWeekChart({
  data,
  isLoading = false
}: DayOfWeekChartProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="h-48 flex items-end justify-around gap-2">
          {[40, 60, 80, 50, 90, 70, 30].map((h, i) => (
            <div
              key={i}
              className="w-8 bg-slate-200 rounded-t animate-pulse"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Message si pas de données
  const hasData = data.some(d => toNumber(d.total) > 0);
  if (!hasData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Dépenses par jour
        </h3>
        <div className="h-48 flex items-center justify-center text-slate-400">
          Aucune dépense ce mois
        </div>
      </div>
    );
  }

  // Préparer les données
  const chartData = data.map(d => ({
    ...d,
    total: toNumber(d.total),
    abbrev: getDayAbbrev(d.day_name),
  }));

  const maxValue = Math.max(...chartData.map(d => d.total));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Dépenses par jour
      </h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="abbrev"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v}€`}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.total, maxValue)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
