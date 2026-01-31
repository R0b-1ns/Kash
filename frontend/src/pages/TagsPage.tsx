/**
 * Page Tags
 * Gestion des tags avec création, modification et suppression
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Save,
} from 'lucide-react';
import { tags as tagsApi } from '../services/api';
import { Tag, TagCreate, TagUpdate } from '../types';
import clsx from 'clsx';

// ============================================
// Couleurs prédéfinies pour les tags
// ============================================

const predefinedColors = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
];

// ============================================
// Composant TagsPage
// ============================================

const TagsPage: React.FC = () => {
  // État des tags
  const [tagsList, setTagsList] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // État du formulaire de création
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(predefinedColors[0]);
  const [isCreating, setIsCreating] = useState(false);

  // État de modification
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Tag en cours de suppression
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /**
   * Charge la liste des tags
   */
  const loadTags = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await tagsApi.list();
      setTagsList(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des tags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  /**
   * Crée un nouveau tag
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTagName.trim()) {
      setError('Le nom du tag est requis');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const newTag: TagCreate = {
        name: newTagName.trim(),
        color: newTagColor,
      };

      const createdTag = await tagsApi.create(newTag);
      setTagsList((prev) => [...prev, createdTag]);

      // Reset du formulaire
      setNewTagName('');
      setNewTagColor(predefinedColors[0]);

      setSuccess('Tag créé avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la création du tag');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Commence l'édition d'un tag
   */
  const startEditing = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  /**
   * Annule l'édition
   */
  const cancelEditing = () => {
    setEditingTag(null);
    setEditName('');
    setEditColor('');
  };

  /**
   * Sauvegarde les modifications d'un tag
   */
  const handleSave = async () => {
    if (!editingTag) return;

    if (!editName.trim()) {
      setError('Le nom du tag est requis');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const updateData: TagUpdate = {
        name: editName.trim(),
        color: editColor,
      };

      const updatedTag = await tagsApi.update(editingTag.id, updateData);
      setTagsList((prev) =>
        prev.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag))
      );

      setSuccess('Tag modifié avec succès');
      setTimeout(() => setSuccess(null), 3000);

      cancelEditing();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification du tag');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Supprime un tag
   */
  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce tag ?')) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);
      await tagsApi.delete(id);
      setTagsList((prev) => prev.filter((tag) => tag.id !== id));

      setSuccess('Tag supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression du tag');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Header de la page */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tags</h1>
          <p className="text-slate-600 mt-1">
            Organisez vos documents avec des catégories
          </p>
        </div>
        <div className="text-sm text-slate-500">{tagsList.length} tag(s)</div>
      </div>

      {/* ============================================ */}
      {/* Messages de feedback */}
      {/* ============================================ */}
      {success && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
          <span className="text-sm text-green-700">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto p-1 hover:bg-green-100 rounded"
          >
            <X className="w-4 h-4 text-green-500" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* Formulaire de création */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Créer un nouveau tag
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
          {/* Nom du tag */}
          <div className="flex-1">
            <label
              htmlFor="tagName"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Nom du tag
            </label>
            <input
              id="tagName"
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Ex: Factures, Transport, Alimentation..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Sélecteur de couleur */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Couleur
            </label>
            <div className="flex flex-wrap gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={clsx(
                    'w-8 h-8 rounded-lg border-2 transition-all',
                    newTagColor === color
                      ? 'border-slate-800 scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Bouton créer */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isCreating || !newTagName.trim()}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Créer
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ============================================ */}
      {/* Liste des tags */}
      {/* ============================================ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-600">Chargement des tags...</span>
        </div>
      ) : tagsList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
          <Tags className="w-16 h-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-slate-800">
            Aucun tag
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Créez votre premier tag pour organiser vos documents
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-200">
            {tagsList.map((tag) => {
              const isEditing = editingTag?.id === tag.id;
              const isDeleting = deletingId === tag.id;

              return (
                <div
                  key={tag.id}
                  className={clsx(
                    'px-6 py-4 transition-colors',
                    isDeleting && 'opacity-50'
                  )}
                >
                  {isEditing ? (
                    // Mode édition
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      {/* Nom */}
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />

                      {/* Couleurs */}
                      <div className="flex flex-wrap gap-2">
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            className={clsx(
                              'w-6 h-6 rounded border-2 transition-all',
                              editColor === color
                                ? 'border-slate-800 scale-110'
                                : 'border-transparent hover:scale-105'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Sauvegarder"
                        >
                          {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Annuler"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Mode affichage
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {/* Indicateur de couleur */}
                        <div
                          className="w-4 h-4 rounded-full mr-4"
                          style={{ backgroundColor: tag.color }}
                        />
                        {/* Badge du tag */}
                        <span
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(tag)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          disabled={isDeleting}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsPage;
