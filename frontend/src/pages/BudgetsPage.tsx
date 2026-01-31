/**
 * Page Budgets - Gestion des budgets mensuels
 *
 * Permet de :
 * - Voir les budgets du mois avec la progression
 * - Créer de nouveaux budgets par tag
 * - Modifier les limites de budget
 * - Supprimer des budgets
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { format, subMonths, addMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx } from 'clsx';

// Services
import { budgets, tags } from '../services/api';

// Types
import type { BudgetWithSpending, Tag } from '../types';

// ============================================
// Helpers
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMonthDisplay = (month: string): string => {
  try {
    const date = parseISO(`${month}-01`);
    return format(date, 'MMMM yyyy', { locale: fr });
  } catch {
    return month;
  }
};

const getMonthString = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-orange-500';
  if (percentage >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
};

// ============================================
// Composant BudgetCard
// ============================================

interface BudgetCardProps {
  budget: BudgetWithSpending;
  onDelete: (id: number) => void;
  onEdit: (id: number, newLimit: number) => void;
}

function BudgetCard({ budget, onDelete, onEdit }: BudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(budget.limit_amount.toString());

  const progressWidth = Math.min(budget.percentage_used, 100);

  const handleSave = () => {
    const newLimit = parseFloat(editValue);
    if (!isNaN(newLimit) && newLimit > 0) {
      onEdit(budget.id, newLimit);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(budget.limit_amount.toString());
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: budget.tag_color }}
          />
          <h3 className="font-semibold text-slate-800">{budget.tag_name}</h3>
        </div>

        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Sauvegarder"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 text-slate-400 hover:bg-slate-50 rounded transition-colors"
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(budget.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Montants */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-2xl font-bold text-slate-800">
          {formatCurrency(budget.spent_amount)}
        </span>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <span className="text-slate-400">/</span>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-24 px-2 py-1 text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              step="1"
              autoFocus
            />
            <span className="text-slate-400">€</span>
          </div>
        ) : (
          <span className="text-slate-500">
            / {formatCurrency(budget.limit_amount)}
          </span>
        )}
      </div>

      {/* Barre de progression */}
      <div className="relative mb-2">
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              getProgressColor(budget.percentage_used)
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        <span
          className={clsx(
            'font-medium',
            budget.percentage_used >= 100 ? 'text-red-600' : 'text-slate-500'
          )}
        >
          {budget.percentage_used.toFixed(0)}% utilisé
        </span>
        <span
          className={clsx(
            budget.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {budget.remaining_amount >= 0 ? 'Reste' : 'Dépassement'}:{' '}
          {formatCurrency(Math.abs(budget.remaining_amount))}
        </span>
      </div>

      {/* Alerte de dépassement */}
      {budget.percentage_used >= 100 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>Budget dépassé !</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Composant principal
// ============================================

export default function BudgetsPage() {
  // État du mois
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const monthString = getMonthString(selectedMonth);

  // États
  const [budgetList, setBudgetList] = useState<BudgetWithSpending[]>([]);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire de création
  const [showForm, setShowForm] = useState(false);
  const [newTagId, setNewTagId] = useState<number | ''>('');
  const [newLimit, setNewLimit] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // ============================================
  // Chargement des données
  // ============================================

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [budgetsRes, tagsRes] = await Promise.all([
        budgets.getCurrent(monthString),
        tags.list(),
      ]);

      setBudgetList(budgetsRes);
      setTagList(tagsRes);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur lors du chargement des budgets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthString]);

  // ============================================
  // Actions
  // ============================================

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagId || !newLimit) return;

    setIsCreating(true);
    try {
      await budgets.create({
        tag_id: Number(newTagId),
        month: monthString,
        limit_amount: parseFloat(newLimit),
      });

      // Recharger les données
      await loadData();

      // Réinitialiser le formulaire
      setNewTagId('');
      setNewLimit('');
      setShowForm(false);
    } catch (err: any) {
      console.error('Erreur lors de la création:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la création du budget');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce budget ?')) return;

    try {
      await budgets.delete(id);
      setBudgetList((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression du budget');
    }
  };

  const handleEdit = async (id: number, newLimitAmount: number) => {
    try {
      await budgets.update(id, { limit_amount: newLimitAmount });
      await loadData(); // Recharger pour avoir les nouvelles valeurs calculées
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      setError('Erreur lors de la modification du budget');
    }
  };

  // ============================================
  // Navigation entre les mois
  // ============================================

  const goToPreviousMonth = () => setSelectedMonth((prev) => subMonths(prev, 1));
  const goToNextMonth = () => {
    const next = addMonths(selectedMonth, 1);
    if (next <= new Date()) setSelectedMonth(next);
  };
  const isCurrentMonth = getMonthString(selectedMonth) === getMonthString(new Date());

  // Tags disponibles (sans budget existant)
  const availableTags = tagList.filter(
    (tag) => !budgetList.some((b) => b.tag_id === tag.id)
  );

  // ============================================
  // Rendu
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Budgets</h1>
          <p className="text-slate-500 mt-1">Gérez vos limites de dépenses par catégorie</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Sélecteur de mois */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-2 py-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-slate-700 min-w-[140px] text-center capitalize">
              {formatMonthDisplay(monthString)}
            </span>
            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Bouton créer */}
          <button
            onClick={() => setShowForm(true)}
            disabled={availableTags.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nouveau budget</span>
          </button>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Formulaire de création */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Créer un nouveau budget
          </h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Catégorie
              </label>
              <select
                value={newTagId}
                onChange={(e) => setNewTagId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionner un tag...</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-40">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Limite (€)
              </label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="400"
                              min="1"
                              step="1"                required
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Création...' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>

          {availableTags.length === 0 && (
            <p className="mt-3 text-sm text-amber-600">
              Tous vos tags ont déjà un budget pour ce mois. Créez de nouveaux tags pour ajouter des budgets.
            </p>
          )}
        </div>
      )}

      {/* Liste des budgets */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 bg-slate-200 rounded-full" />
                <div className="h-5 bg-slate-200 rounded w-24" />
              </div>
              <div className="h-8 bg-slate-200 rounded w-32 mb-3" />
              <div className="h-3 bg-slate-100 rounded-full mb-2" />
              <div className="h-4 bg-slate-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : budgetList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Aucun budget pour {formatMonthDisplay(monthString)}
          </h2>
          <p className="text-slate-500 mb-4">
            Créez des budgets pour suivre vos dépenses par catégorie
          </p>
          <button
            onClick={() => setShowForm(true)}
            disabled={availableTags.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Créer un budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgetList
            .sort((a, b) => b.percentage_used - a.percentage_used)
            .map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
        </div>
      )}

      {/* Résumé */}
      {budgetList.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Résumé du mois</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-500">Budget total</p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(budgetList.reduce((sum, b) => sum + b.limit_amount, 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Dépensé</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(budgetList.reduce((sum, b) => sum + b.spent_amount, 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Restant</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(budgetList.reduce((sum, b) => sum + b.remaining_amount, 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
