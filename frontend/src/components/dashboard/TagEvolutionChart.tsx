/**
 * Graphique d'évolution des dépenses par tag (stacked area).
 *
 * Affiche l'évolution des dépenses par catégorie sur plusieurs mois.
 */

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// Types
// ============================================

export interface TagEvolutionEntry {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  amount: number;
}

export interface TagEvolutionData {
  month: string;
  tags: TagEvolutionEntry[];
}

interface TagEvolutionChartProps {
  data: TagEvolutionData[];
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

const formatMonth = (month: string): string => {
  try {
    const date = parseISO(`${month}-01`);
    return format(date, 'MMM', { locale: fr });
  } catch {
    return month;
  }
};

// ============================================
// Tooltip personnalisé
// ============================================

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
      <p className="font-medium text-slate-700 mb-2 capitalize">
        {formatMonth(label)}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600">{entry.name}</span>
          </div>
          <span className="font-medium text-slate-700">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
      <div className="border-t border-slate-200 mt-2 pt-2">
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-slate-700">Total</span>
          <span className="text-slate-800">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Légende personnalisée
// ============================================

const CustomLegend = ({ payload }: any) => {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-2">
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

export default function TagEvolutionChart({
  data,
  isLoading = false
}: TagEvolutionChartProps) {
  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded animate-pulse"></div>
      </div>
    );
  }

  // Message si pas de données
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Évolution par catégorie
        </h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  // Extraire tous les tags uniques
  const allTags = useMemo(() => {
    const tagsMap = new Map<number, { name: string; color: string }>();
    data.forEach(month => {
      month.tags.forEach(tag => {
        if (!tagsMap.has(tag.tag_id)) {
          tagsMap.set(tag.tag_id, { name: tag.tag_name, color: tag.tag_color });
        }
      });
    });
    return Array.from(tagsMap.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      color: info.color,
    }));
  }, [data]);

  // Transformer les données pour Recharts
  const chartData = useMemo(() => {
    return data.map(monthData => {
      const result: Record<string, any> = { month: monthData.month };
      allTags.forEach(tag => {
        const tagEntry = monthData.tags.find(t => t.tag_id === tag.id);
        result[tag.name] = tagEntry ? toNumber(tagEntry.amount) : 0;
      });
      return result;
    });
  }, [data, allTags]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Évolution par catégorie
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v}€`}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            {allTags.map((tag) => (
              <Area
                key={tag.id}
                type="monotone"
                dataKey={tag.name}
                stackId="1"
                stroke={tag.color}
                fill={tag.color}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
