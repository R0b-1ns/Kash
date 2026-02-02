/**
 * Page de gestion des documents récurrents (abonnements)
 *
 * Affiche:
 * - Résumé des charges fixes mensuelles
 * - Liste des templates d'abonnements
 * - Bouton pour générer les entrées du mois
 * - Historique des documents générés ce mois
 */

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Calendar,
  CreditCard,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
} from 'lucide-react';
import { recurring as recurringApi } from '../services/api';
import { RecurringSummary, DocumentListItem, RecurringTemplate } from '../types';
import clsx from 'clsx';

const RecurringPage: React.FC = () => {
  const [summary, setSummary] = useState<RecurringSummary | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mois sélectionné pour la vue
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [summaryData, generated] = await Promise.all([
        recurringApi.getSummary(selectedMonth),
        recurringApi.listGenerated(selectedMonth),
      ]);

      setSummary(summaryData);
      setGeneratedDocs(generated);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const result = await recurringApi.generate(selectedMonth);

      if (result.created > 0) {
        setSuccess(`${result.created} document(s) généré(s) avec succès`);
      } else {
        setSuccess('Tous les abonnements ont déjà été générés pour ce mois');
      }

      // Recharger les données
      await loadData();

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = async (templateId: number) => {
    try {
      await recurringApi.toggle(templateId);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification');
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month;

    if (direction === 'prev') {
      if (month === 1) {
        newMonth = 12;
        newYear = year - 1;
      } else {
        newMonth = month - 1;
      }
    } else {
      if (month === 12) {
        newMonth = 1;
        newYear = year + 1;
      } else {
        newMonth = month + 1;
      }
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const formatAmount = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getFrequencyLabel = (frequency: string): string => {
    switch (frequency) {
      case 'monthly':
        return 'Mensuel';
      case 'quarterly':
        return 'Trimestriel';
      case 'yearly':
        return 'Annuel';
      default:
        return frequency;
    }
  };

  const getFrequencyColor = (frequency: string): string => {
    switch (frequency) {
      case 'monthly':
        return 'bg-blue-100 text-blue-700';
      case 'quarterly':
        return 'bg-purple-100 text-purple-700';
      case 'yearly':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getAnnualAmount = (amount: number, frequency: string): number => {
    switch (frequency) {
      case 'monthly':
        return amount * 12;
      case 'quarterly':
        return amount * 4;
      case 'yearly':
        return amount;
      default:
        return amount * 12;
    }
  };

  const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: fr });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Abonnements</h1>
          <p className="text-slate-600 mt-1">
            Gérez vos charges fixes et abonnements récurrents.
          </p>
        </div>

        {/* Sélecteur de mois */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="text-lg font-medium text-slate-800 min-w-[150px] text-center capitalize">
            {monthLabel}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
          <span className="text-sm text-green-700">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-600">Chargement...</span>
        </div>
      ) : summary ? (
        <>
          {/* Cartes de résumé */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total mensuel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Charges / mois</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatAmount(summary.total_monthly)}
                  </p>
                </div>
              </div>
            </div>

            {/* Total annuel estimé */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estimé / an</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatAmount(summary.total_monthly * 12)}
                  </p>
                </div>
              </div>
            </div>

            {/* Nombre d'abonnements */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Abonnements actifs</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.total_count}</p>
                </div>
              </div>
            </div>

            {/* Générés ce mois */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Générés ce mois</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {summary.generated_this_month}
                  </p>
                </div>
              </div>
            </div>

            {/* À générer ce mois */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${summary.pending_this_month > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
                  <Clock className={`w-6 h-6 ${summary.pending_this_month > 0 ? 'text-orange-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">À générer ce mois</p>
                  <p className={`text-2xl font-bold ${summary.pending_this_month > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {summary.pending_this_month}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton de génération */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              Générer les abonnements du mois
            </button>
          </div>

          {/* Liste des templates */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                Vos abonnements ({summary.templates.length})
              </h2>
            </div>

            {summary.templates.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Aucun abonnement configuré.</p>
                <p className="text-sm text-slate-500 mt-2">
                  Pour créer un abonnement, éditez un document et activez l'option "Récurrent".
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {summary.templates.map((template: RecurringTemplate) => (
                  <div
                    key={template.id}
                    className={clsx(
                      'px-6 py-4 flex items-center justify-between gap-4',
                      !template.is_active && 'opacity-50 bg-slate-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-slate-800 truncate">
                          {template.merchant || 'Sans nom'}
                        </p>
                        <span
                          className={clsx(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            getFrequencyColor(template.frequency)
                          )}
                        >
                          {getFrequencyLabel(template.frequency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        {template.last_generated && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Dernier: {format(new Date(template.last_generated), 'dd/MM/yyyy')}
                          </span>
                        )}
                        {template.end_date && (
                          <span className="text-orange-600">
                            Fin: {format(new Date(template.end_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>

                      {template.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {template.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">
                          {formatAmount(template.total_amount, template.currency)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatAmount(getAnnualAmount(template.total_amount, template.frequency), template.currency)}/an
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggle(template.id)}
                        className={clsx(
                          'p-1 rounded-lg transition-colors',
                          template.is_active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-slate-400 hover:bg-slate-100'
                        )}
                        title={template.is_active ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                      >
                        {template.is_active ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents générés ce mois */}
          {generatedDocs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">
                  Documents générés ce mois ({generatedDocs.length})
                </h2>
              </div>

              <div className="divide-y divide-slate-200">
                {generatedDocs.map((doc) => (
                  <div key={doc.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {doc.merchant || 'Document'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {doc.date
                            ? format(new Date(doc.date), 'dd MMMM yyyy', { locale: fr })
                            : 'Date non définie'}
                        </p>
                      </div>
                    </div>
                    <p className="font-medium text-slate-800">
                      {doc.total_amount !== undefined
                        ? formatAmount(doc.total_amount, doc.currency)
                        : '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default RecurringPage;
