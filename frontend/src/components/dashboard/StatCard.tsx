/**
 * Carte statistique pour le dashboard.
 *
 * Affiche une métrique clé avec :
 * - Icône
 * - Titre
 * - Valeur principale
 * - Variation optionnelle (vs mois précédent)
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

// ============================================
// Types
// ============================================

interface StatCardProps {
  /** Titre de la statistique */
  title: string;
  /** Valeur à afficher (formatée) */
  value: string;
  /** Icône Lucide à afficher */
  icon: LucideIcon;
  /** Couleur du thème : blue, green, red, purple */
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  /** Variation en pourcentage (optionnel) */
  change?: number;
  /** Texte de la variation (ex: "vs mois dernier") */
  changeLabel?: string;
  /** État de chargement */
  isLoading?: boolean;
}

// ============================================
// Mapping des couleurs
// ============================================

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    iconBg: 'bg-green-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    iconBg: 'bg-red-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    iconBg: 'bg-orange-100',
  },
};

// ============================================
// Composant
// ============================================

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  change,
  changeLabel = 'vs mois dernier',
  isLoading = false,
}: StatCardProps) {
  const colors = colorClasses[color];

  // Skeleton de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-slate-200 rounded w-24"></div>
            <div className="h-8 bg-slate-200 rounded w-32"></div>
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        {/* Contenu textuel */}
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>

          {/* Variation optionnelle */}
          {change !== undefined && (
            <div className="flex items-center mt-2">
              <span
                className={clsx(
                  'text-sm font-medium',
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400 ml-1">{changeLabel}</span>
            </div>
          )}
        </div>

        {/* Icône */}
        <div className={clsx('p-3 rounded-lg', colors.iconBg)}>
          <Icon className={clsx('w-6 h-6', colors.icon)} />
        </div>
      </div>
    </div>
  );
}
