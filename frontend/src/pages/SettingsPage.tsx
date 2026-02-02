/**
 * Page de paramètres
 *
 * Regroupe les fonctionnalités de configuration :
 * - Synchronisation NAS (statut, test, lancement)
 * - Export de données (CSV, PDF, PNG)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ServerIcon,
  FolderIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import { sync, exportApi, tags } from '../services/api';
import type { SyncStatus, SyncConfigStatus, Tag, ChartType } from '../types';

/**
 * Page des paramètres avec synchronisation NAS et export
 */
export default function SettingsPage() {
  // États pour la synchronisation
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfigStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // États pour l'export
  const [isExporting, setIsExporting] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportIncludeItems, setExportIncludeItems] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();

  const [exportMonth, setExportMonth] = useState(currentMonth);
  const [exportYear, setExportYear] = useState(currentYear);
  const [chartType, setChartType] = useState<ChartType>('donut');
  const [chartMonth, setChartMonth] = useState(currentMonth);


  /**
   * Charge les données de synchronisation au montage
   */
  const loadSyncData = useCallback(async () => {
    try {
      const [status, config] = await Promise.all([
        sync.getStatus(),
        sync.getConfig(),
      ]);
      setSyncStatus(status);
      setSyncConfig(config);
    } catch (error) {
      console.error('Erreur lors du chargement des données de synchronisation:', error);
    }
  }, []);

  /**
   * Charge les tags disponibles pour le filtre d'export
   */
  const loadTags = useCallback(async () => {
    try {
      const tagsList = await tags.list();
      setAvailableTags(tagsList);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
    }
  }, []);

  useEffect(() => {
    loadSyncData();
    loadTags();
  }, [loadSyncData, loadTags]);

  /**
   * Teste la connexion au NAS
   */
  const handleTestConnection = async () => {
    setIsTesting(true);
    setSyncMessage(null);

    try {
      const result = await sync.testConnection();
      setSyncMessage({
        type: result.success ? 'success' : 'error',
        text: result.message,
      });
    } catch {
      setSyncMessage({
        type: 'error',
        text: 'Erreur lors du test de connexion',
      });
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Lance la synchronisation
   */
  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const result = await sync.runSync();

      if (result.failed === 0) {
        setSyncMessage({
          type: 'success',
          text: `${result.synced} document(s) synchronisé(s) avec succès`,
        });
      } else {
        setSyncMessage({
          type: 'error',
          text: `${result.synced} synchronisé(s), ${result.failed} échec(s)`,
        });
      }

      // Recharger le statut
      await loadSyncData();
    } catch {
      setSyncMessage({
        type: 'error',
        text: 'Erreur lors de la synchronisation',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Exporte les documents en CSV
   */
  const handleExportDocumentsCSV = async () => {
    setIsExporting(true);
    try {
      await exportApi.documentsCSV({
        start_date: exportStartDate || undefined,
        end_date: exportEndDate || undefined,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        include_items: exportIncludeItems,
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export des documents');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exporte le résumé mensuel en CSV
   */
  const handleExportMonthlyCSV = async () => {
    setIsExporting(true);
    try {
      const [year, month] = exportMonth.split('-').map(Number);
      await exportApi.monthlyCSV(year, month);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export du résumé mensuel');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exporte le rapport mensuel en PDF
   */
  const handleExportMonthlyPDF = async () => {
    setIsExporting(true);
    try {
      const [year, month] = exportMonth.split('-').map(Number);
      await exportApi.monthlyPDF(year, month);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export du rapport PDF mensuel');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exporte le rapport annuel en PDF
   */
  const handleExportAnnualPDF = async () => {
    setIsExporting(true);
    try {
      await exportApi.annualPDF(exportYear);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF annuel:', error);
      alert('Erreur lors de l\'export du rapport PDF annuel');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exporte un graphique en PNG
   */
  const handleExportChart = async () => {
    setIsExporting(true);
    try {
      await exportApi.exportChart(chartType, chartMonth);
    } catch (error) {
      console.error('Erreur lors de l\'export du graphique:', error);
      alert('Erreur lors de l\'export du graphique');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Toggle un tag dans la sélection
   */
  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-gray-500">
          Synchronisation NAS et export de données
        </p>
      </div>

      {/* Section Synchronisation NAS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CloudArrowUpIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Synchronisation NAS</h2>
            <p className="text-sm text-gray-500">
              Sauvegardez vos documents sur votre NAS
            </p>
          </div>
        </div>

        {/* Statut de configuration */}
        {syncConfig && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Configuration</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <ServerIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Hôte:</span>
                <span className={syncConfig.nas_host ? 'text-green-600' : 'text-red-600'}>
                  {syncConfig.host || 'Non configuré'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Chemin:</span>
                <span className={syncConfig.nas_path ? 'text-green-600' : 'text-red-600'}>
                  {syncConfig.path || 'Non configuré'}
                </span>
              </div>
            </div>

            {!syncConfig.configured && (
              <p className="mt-3 text-sm text-amber-600">
                Configurez NAS_HOST, NAS_USER et NAS_PATH dans le fichier .env du backend
              </p>
            )}
          </div>
        )}

        {/* Statut de synchronisation */}
        {syncStatus && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Statut</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {syncStatus.total_documents}
                </div>
                <div className="text-xs text-gray-500">Documents</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {syncStatus.synced}
                </div>
                <div className="text-xs text-gray-500">Synchronisés</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {syncStatus.pending}
                </div>
                <div className="text-xs text-gray-500">En attente</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {syncStatus.sync_percentage}%
                </div>
                <div className="text-xs text-gray-500">Progression</div>
              </div>
            </div>

            {syncStatus.last_sync && (
              <p className="mt-3 text-sm text-gray-500">
                Dernière synchronisation: {new Date(syncStatus.last_sync).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        )}

        {/* Message de retour */}
        {syncMessage && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              syncMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {syncMessage.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
            {syncMessage.text}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !syncConfig?.configured}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ServerIcon className="h-4 w-4" />
            )}
            Tester la connexion
          </button>

          <button
            onClick={handleRunSync}
            disabled={isSyncing || !syncConfig?.configured || syncStatus?.pending === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <CloudArrowUpIcon className="h-4 w-4" />
            )}
            Synchroniser ({syncStatus?.pending || 0} en attente)
          </button>
        </div>
      </div>

      {/* Section Export */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <DocumentArrowDownIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export de données</h2>
            <p className="text-sm text-gray-500">
              Téléchargez vos données et rapports en format CSV, PDF ou PNG
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Export des documents CSV */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Export de documents (CSV)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            {availableTags.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button key={tag.id} onClick={() => toggleTag(tag.id)} className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedTagIds.includes(tag.id) ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : undefined}>
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={exportIncludeItems} onChange={(e) => setExportIncludeItems(e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                <span className="text-sm text-gray-700">Inclure le détail des articles</span>
              </label>
              <button onClick={handleExportDocumentsCSV} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {isExporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentArrowDownIcon className="h-4 w-4" />}
                Exporter CSV
              </button>
            </div>
          </div>

          {/* Export mensuel */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Rapport Mensuel</h3>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <input type="month" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
              </div>
              <button onClick={handleExportMonthlyCSV} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                {isExporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : '📄'}
                CSV Résumé
              </button>
              <button onClick={handleExportMonthlyPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isExporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentChartBarIcon className="h-4 w-4" />}
                PDF Rapport
              </button>
            </div>
          </div>
          
          {/* Export annuel */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Rapport Annuel</h3>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                <input type="number" value={exportYear} onChange={(e) => setExportYear(parseInt(e.target.value))} min="2000" max="2100" className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
              </div>
              <button onClick={handleExportAnnualPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isExporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentChartBarIcon className="h-4 w-4" />}
                PDF Rapport Annuel
              </button>
            </div>
          </div>

          {/* Export Graphiques */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Export de Graphique</h3>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="donut">Répartition (Anneau)</option>
                  <option value="pie">Répartition (Camembert)</option>
                  <option value="bar">Évolution Mensuelle (Barres)</option>
                  <option value="line">Évolution Annuelle (Ligne)</option>
                  <option value="area">Évolution (Aires)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <input type="month" value={chartMonth} onChange={(e) => setChartMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
              </div>
              <button onClick={handleExportChart} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {isExporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ChartPieIcon className="h-4 w-4" />}
                Télécharger PNG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
