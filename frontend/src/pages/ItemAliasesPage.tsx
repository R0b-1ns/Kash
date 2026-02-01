/**
 * Page de gestion des alias d'articles
 * Permet de regrouper des articles similaires sous un nom canonique
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Link,
  Unlink,
} from 'lucide-react';
import { itemAliases as aliasesApi } from '../services/api';
import type {
  ItemAliasGroup,
  ItemAliasSuggestion,
  DistinctItem,
} from '../types';

// ============================================
// Helpers
// ============================================

/**
 * Extrait un message d'erreur lisible depuis une réponse d'erreur API
 * Gère les erreurs Pydantic (array d'objets) et les erreurs simples (string)
 */
const extractErrorMessage = (err: any, fallback: string): string => {
  const detail = err.response?.data?.detail;

  if (!detail) return fallback;

  // Si c'est une string, la retourner directement
  if (typeof detail === 'string') return detail;

  // Si c'est un array (erreurs Pydantic), extraire les messages
  if (Array.isArray(detail)) {
    return detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
  }

  // Si c'est un objet avec un message
  if (typeof detail === 'object' && detail.msg) {
    return detail.msg;
  }

  return fallback;
};

// ============================================
// Composant ItemAliasesPage
// ============================================

const ItemAliasesPage: React.FC = () => {
  // État des groupes
  const [groups, setGroups] = useState<ItemAliasGroup[]>([]);
  const [suggestions, setSuggestions] = useState<ItemAliasSuggestion[]>([]);
  const [distinctItems, setDistinctItems] = useState<DistinctItem[]>([]);

  // État UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'groups' | 'suggestions' | 'manual'>('groups');

  // État de recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // État de création manuelle
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [canonicalName, setCanonicalName] = useState('');
  const [selectedExistingGroup, setSelectedExistingGroup] = useState<string>(''); // Groupe existant sélectionné
  const [isCreating, setIsCreating] = useState(false);

  // État d'édition de groupe
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Groupes ouverts (expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  /**
   * Charge les données initiales
   */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [groupsData, suggestionsData] = await Promise.all([
        aliasesApi.list(),
        aliasesApi.getSuggestions({ min_occurrences: 2, max_distance: 3 }),
      ]);

      setGroups(groupsData);
      setSuggestions(suggestionsData);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors du chargement'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Recherche d'articles
   */
  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const items = await aliasesApi.listItems({
        search: searchQuery || undefined,
        limit: 100,
      });
      setDistinctItems(items);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors de la recherche'));
    } finally {
      setIsSearching(false);
    }
  };

  // Recherche au changement de tab ou de requête (avec debounce)
  useEffect(() => {
    if (activeTab === 'manual') {
      const timer = setTimeout(handleSearch, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, searchQuery]);

  /**
   * Toggle sélection d'un item
   */
  const toggleItemSelection = (itemName: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((n) => n !== itemName)
        : [...prev, itemName]
    );
    // Suggérer le premier item sélectionné comme nom canonique
    if (!canonicalName && !selectedItems.includes(itemName)) {
      setCanonicalName(itemName);
    }
  };

  /**
   * Crée un groupe ou ajoute à un groupe existant
   */
  const handleCreateGroup = async () => {
    const targetGroup = selectedExistingGroup || canonicalName.trim();

    if (!targetGroup || selectedItems.length === 0) {
      setError('Veuillez sélectionner des articles et choisir un groupe cible');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const result = await aliasesApi.createBulk({
        canonical_name: targetGroup,
        alias_names: selectedItems,
      });

      if (result.created > 0) {
        const action = selectedExistingGroup ? 'ajouté(s) au groupe' : 'créé avec';
        setSuccess(`${result.created} article(s) ${action} "${targetGroup}"`);
        setTimeout(() => setSuccess(null), 3000);
      }
      if (result.skipped > 0) {
        setError(`${result.skipped} article(s) ignoré(s): ${result.errors.join(', ')}`);
      }

      // Reset et recharger
      setSelectedItems([]);
      setCanonicalName('');
      setSelectedExistingGroup('');
      await loadData();
      await handleSearch();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors de la création'));
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Applique une suggestion
   */
  const applySuggestion = async (suggestion: ItemAliasSuggestion) => {
    try {
      setIsCreating(true);
      setError(null);

      const result = await aliasesApi.createBulk({
        canonical_name: suggestion.suggested_canonical,
        alias_names: suggestion.variants,
      });

      setSuccess(`Groupe "${suggestion.suggested_canonical}" créé avec ${result.created} article(s)`);
      setTimeout(() => setSuccess(null), 3000);

      await loadData();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors de l\'application'));
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Renomme un groupe
   */
  const handleRenameGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) return;

    try {
      setIsSaving(true);
      setError(null);

      await aliasesApi.renameGroup({
        old_canonical_name: editingGroup,
        new_canonical_name: newGroupName.trim(),
      });

      setSuccess(`Groupe renommé en "${newGroupName}"`);
      setTimeout(() => setSuccess(null), 3000);

      setEditingGroup(null);
      setNewGroupName('');
      await loadData();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors du renommage'));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Supprime un groupe
   */
  const handleDeleteGroup = async (canonicalName: string) => {
    if (!window.confirm(`Voulez-vous supprimer le groupe "${canonicalName}" et dégrouper tous ses articles ?`)) {
      return;
    }

    try {
      setError(null);
      await aliasesApi.deleteGroup(canonicalName);

      setSuccess(`Groupe "${canonicalName}" supprimé`);
      setTimeout(() => setSuccess(null), 3000);

      await loadData();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors de la suppression'));
    }
  };

  /**
   * Supprime un alias individuel
   */
  const handleDeleteAlias = async (aliasId: number, aliasName: string) => {
    try {
      setError(null);
      await aliasesApi.delete(aliasId);

      setSuccess(`Article "${aliasName}" retiré du groupe`);
      setTimeout(() => setSuccess(null), 3000);

      await loadData();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Erreur lors de la suppression'));
    }
  };

  /**
   * Toggle expansion d'un groupe
   */
  const toggleGroupExpand = (canonicalName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(canonicalName)) {
        next.delete(canonicalName);
      } else {
        next.add(canonicalName);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Header */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Articles similaires</h1>
          <p className="text-slate-600 mt-1">
            Regroupez les variantes d'un même article pour des statistiques plus précises
          </p>
        </div>
        <div className="text-sm text-slate-500">{groups.length} groupe(s)</div>
      </div>

      {/* ============================================ */}
      {/* Messages de feedback */}
      {/* ============================================ */}
      {success && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
          <span className="text-sm text-green-700">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto p-1 hover:bg-green-100 rounded">
            <X className="w-4 h-4 text-green-500" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* Tabs */}
      {/* ============================================ */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4 inline-block mr-2" />
            Groupes existants ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'suggestions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 inline-block mr-2" />
            Suggestions ({suggestions.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus className="w-4 h-4 inline-block mr-2" />
            Créer manuellement
          </button>
        </nav>
      </div>

      {/* ============================================ */}
      {/* Contenu des tabs */}
      {/* ============================================ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-600">Chargement...</span>
        </div>
      ) : (
        <>
          {/* Tab: Groupes existants */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              {groups.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                  <Layers className="w-16 h-16 text-slate-300 mx-auto" />
                  <h3 className="mt-4 text-lg font-medium text-slate-800">Aucun groupe</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Utilisez les suggestions ou créez manuellement des groupes
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-200">
                  {groups.map((group) => {
                    const isExpanded = expandedGroups.has(group.canonical_name);
                    const isEditing = editingGroup === group.canonical_name;

                    return (
                      <div key={group.canonical_name} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleGroupExpand(group.canonical_name)}
                              className="p-1 hover:bg-slate-100 rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                              )}
                            </button>

                            {isEditing ? (
                              <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium text-slate-800">{group.canonical_name}</span>
                            )}

                            <span className="text-sm text-slate-500">
                              ({group.alias_count} variante{group.alias_count > 1 ? 's' : ''})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={handleRenameGroup}
                                  disabled={isSaving}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                >
                                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => { setEditingGroup(null); setNewGroupName(''); }}
                                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setEditingGroup(group.canonical_name); setNewGroupName(group.canonical_name); }}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Renommer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(group.canonical_name)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Supprimer le groupe"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 ml-9 space-y-2">
                            {group.aliases.map((alias) => (
                              <div
                                key={alias.id}
                                className="flex items-center justify-between py-1 px-3 bg-slate-50 rounded-lg"
                              >
                                <span className="text-sm text-slate-600">{alias.alias_name}</span>
                                <button
                                  onClick={() => handleDeleteAlias(alias.id, alias.alias_name)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                                  title="Retirer du groupe"
                                >
                                  <Unlink className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Suggestions */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                  <Sparkles className="w-16 h-16 text-slate-300 mx-auto" />
                  <h3 className="mt-4 text-lg font-medium text-slate-800">Aucune suggestion</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Pas d'articles similaires détectés automatiquement
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-slate-800">
                            {suggestion.suggested_canonical}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {suggestion.total_occurrences} occurrence(s) totale(s)
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {suggestion.variants.map((variant, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded"
                              >
                                {variant}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => applySuggestion(suggestion)}
                          disabled={isCreating}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isCreating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Link className="w-4 h-4" />
                          )}
                          Grouper
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Création manuelle */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              {/* Barre de recherche */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un article..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Zone de création / ajout */}
              {selectedItems.length > 0 && (
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                  <h3 className="font-medium text-blue-800 mb-3">
                    {selectedItems.length} article(s) sélectionné(s)
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedItems.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {item}
                        <button
                          onClick={() => toggleItemSelection(item)}
                          className="ml-1 hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {/* Choix: groupe existant ou nouveau */}
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Ajouter à un groupe existant
                      </label>
                      <select
                        value={selectedExistingGroup}
                        onChange={(e) => {
                          setSelectedExistingGroup(e.target.value);
                          if (e.target.value) setCanonicalName(''); // Reset le nom si groupe existant choisi
                        }}
                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Créer un nouveau groupe --</option>
                        {groups.map((group) => (
                          <option key={group.canonical_name} value={group.canonical_name}>
                            {group.canonical_name} ({group.alias_count} variante{group.alias_count > 1 ? 's' : ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nom du nouveau groupe (si pas de groupe existant sélectionné) */}
                    {!selectedExistingGroup && (
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          Nom du nouveau groupe
                        </label>
                        <input
                          type="text"
                          value={canonicalName}
                          onChange={(e) => setCanonicalName(e.target.value)}
                          placeholder="Ex: Coca-Cola"
                          className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleCreateGroup}
                      disabled={isCreating || (!selectedExistingGroup && !canonicalName.trim())}
                      className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCreating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                      {selectedExistingGroup ? `Ajouter au groupe "${selectedExistingGroup}"` : 'Créer le groupe'}
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des articles */}
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <span className="ml-2 text-slate-600">Recherche...</span>
                </div>
              ) : distinctItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                  <Search className="w-16 h-16 text-slate-300 mx-auto" />
                  <h3 className="mt-4 text-lg font-medium text-slate-800">Aucun article</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Aucun article trouvé. Uploadez des documents avec des articles.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm text-slate-600">
                      {distinctItems.length} article(s) trouvé(s)
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {distinctItems.map((item) => {
                      const isSelected = selectedItems.includes(item.name);
                      const isDisabled = item.has_alias;

                      return (
                        <div
                          key={item.name}
                          className={`px-4 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                            isSelected ? 'bg-blue-50' : ''
                          } ${isDisabled ? 'opacity-50' : ''}`}
                          onClick={() => !isDisabled && toggleItemSelection(item.name)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300"
                            />
                            <div>
                              <span className="text-slate-800">{item.name}</span>
                              {item.has_alias && (
                                <span className="ml-2 text-xs text-slate-500">
                                  (groupé sous "{item.canonical_name}")
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-slate-600">{item.occurrence_count}x</div>
                            <div className="text-slate-400">
                              {item.total_spent.toFixed(2)} €
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ItemAliasesPage;
