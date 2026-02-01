/**
 * Composant DocumentViewer - Visionneuse de documents avec édition
 *
 * Affiche les images et PDFs dans une modal avec:
 * - Zoom avant/arrière
 * - Navigation (pour les PDFs multi-pages via le navigateur natif)
 * - Affichage et modification des données extraites à côté
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  Edit2,
  Save,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { documents as documentsApi, tags as tagsApi, items as itemsApi } from '../services/api';
import type { Document, Tag } from '../types';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onUpdate?: (updatedDoc: Document) => void;
}

interface FormData {
  merchant: string;
  date: string;
  total_amount: string;
  doc_type: string;
  is_income: boolean;
  tag_ids: number[];
  is_recurring: boolean;
  recurring_frequency: string;
  recurring_end_date: string;
}

interface EditableItem {
  id?: number; // undefined pour les nouveaux articles
  name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document: initialDocument, onClose, onUpdate }) => {
  const [document, setDocument] = useState<Document>(initialDocument);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // État d'édition
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [formData, setFormData] = useState<FormData>({
    merchant: document.merchant || '',
    date: document.date || '',
    total_amount: document.total_amount?.toString() || '',
    doc_type: document.doc_type || 'other',
    is_income: document.is_income || false,
    tag_ids: document.tags?.map(t => t.id) || [],
    is_recurring: document.is_recurring || false,
    recurring_frequency: document.recurring_frequency || 'monthly',
    recurring_end_date: document.recurring_end_date || '',
  });

  // État des articles en édition
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);

  // Détermine si c'est un PDF ou une image
  const isPdf = document.file_type?.includes('pdf') || document.original_name?.toLowerCase().endsWith('.pdf');
  const isImage = document.file_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(document.original_name || '');

  // Déterminer si c'est une entrée manuelle (sans fichier)
  const isManualEntry = !document.file_path;

  // Charger le fichier (seulement si ce n'est pas une entrée manuelle)
  useEffect(() => {
    const loadFile = async () => {
      if (isManualEntry) {
        // Pour les entrées manuelles, ouvrir directement en mode édition
        setIsLoading(false);
        setIsEditing(true);
        setFormData({
          merchant: document.merchant || '',
          date: document.date || '',
          total_amount: document.total_amount?.toString() || '',
          doc_type: document.doc_type || 'other',
          is_income: document.is_income || false,
          tag_ids: document.tags?.map(t => t.id) || [],
          is_recurring: document.is_recurring || false,
          recurring_frequency: document.recurring_frequency || 'monthly',
          recurring_end_date: document.recurring_end_date || '',
        });
        setEditableItems(
          (document.items || []).map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity?.toString() || '1',
            unit_price: item.unit_price?.toString() || '',
            total_price: item.total_price?.toString() || '',
            isNew: false,
            isDeleted: false,
          }))
        );
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const url = await documentsApi.getFileBlob(document.id);
        setFileUrl(url);
      } catch (err: any) {
        console.error('Erreur lors du chargement du fichier:', err);
        setError(err.response?.data?.detail || 'Erreur lors du chargement du fichier');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();

    // Cleanup: révoquer l'URL blob quand le composant est démonté
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [document.id]);

  // Charger les tags disponibles au montage
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await tagsApi.list();
        setAvailableTags(tags);
      } catch (err) {
        console.error('Erreur chargement tags:', err);
      }
    };
    loadTags();
  }, []);

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditing) onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 25, 300));
      if (e.key === '-') setZoom((z) => Math.max(z - 25, 25));
      if (e.key === '0') setZoom(100);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditing]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    if (fileUrl) {
      const link = window.document.createElement('a');
      link.href = fileUrl;
      link.download = document.original_name || 'document';
      link.click();
    }
  };

  const handleEdit = () => {
    setFormData({
      merchant: document.merchant || '',
      date: document.date || '',
      total_amount: document.total_amount?.toString() || '',
      doc_type: document.doc_type || 'other',
      is_income: document.is_income || false,
      tag_ids: document.tags?.map(t => t.id) || [],
      is_recurring: document.is_recurring || false,
      recurring_frequency: document.recurring_frequency || 'monthly',
      recurring_end_date: document.recurring_end_date || '',
    });
    // Initialiser les articles éditables depuis le document
    setEditableItems(
      (document.items || []).map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity?.toString() || '1',
        unit_price: item.unit_price?.toString() || '',
        total_price: item.total_price?.toString() || '',
        isNew: false,
        isDeleted: false,
      }))
    );
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditableItems([]);
  };

  // Gestion des articles
  const handleItemChange = (index: number, field: keyof EditableItem, value: string) => {
    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-calcul du total si quantité ou prix unitaire changent
      if (field === 'quantity' || field === 'unit_price') {
        const qty = parseFloat(updated[index].quantity) || 0;
        const unitPrice = parseFloat(updated[index].unit_price) || 0;
        if (qty > 0 && unitPrice > 0) {
          updated[index].total_price = (qty * unitPrice).toFixed(2);
        }
      }
      return updated;
    });
  };

  const handleAddItem = () => {
    setEditableItems(prev => [
      ...prev,
      {
        name: '',
        quantity: '1',
        unit_price: '',
        total_price: '',
        isNew: true,
        isDeleted: false,
      },
    ]);
  };

  const handleDeleteItem = (index: number) => {
    setEditableItems(prev => {
      const updated = [...prev];
      if (updated[index].isNew) {
        // Si c'est un nouvel article, on le supprime directement
        updated.splice(index, 1);
      } else {
        // Sinon on le marque comme supprimé
        updated[index] = { ...updated[index], isDeleted: true };
      }
      return updated;
    });
  };

  const handleRestoreItem = (index: number) => {
    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isDeleted: false };
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // 1. Sauvegarder les modifications du document
      const updatedDoc = await documentsApi.update(document.id, {
        merchant: formData.merchant || undefined,
        date: formData.date || undefined,
        total_amount: formData.total_amount ? parseFloat(formData.total_amount) : undefined,
        doc_type: formData.doc_type as any,
        is_income: formData.is_income,
        tag_ids: formData.tag_ids,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.is_recurring ? formData.recurring_frequency : undefined,
        recurring_end_date: formData.is_recurring && formData.recurring_end_date ? formData.recurring_end_date : undefined,
      });

      // 2. Gérer les articles
      const itemPromises: Promise<any>[] = [];

      for (const item of editableItems) {
        if (item.isDeleted && item.id) {
          // Supprimer les articles marqués comme supprimés
          itemPromises.push(itemsApi.delete(item.id));
        } else if (item.isNew && !item.isDeleted && item.name.trim()) {
          // Créer les nouveaux articles
          itemPromises.push(
            itemsApi.create(document.id, {
              name: item.name.trim(),
              quantity: parseFloat(item.quantity) || 1,
              unit_price: item.unit_price ? parseFloat(item.unit_price) : undefined,
              total_price: item.total_price ? parseFloat(item.total_price) : undefined,
            })
          );
        } else if (!item.isNew && !item.isDeleted && item.id) {
          // Mettre à jour les articles existants
          itemPromises.push(
            itemsApi.update(item.id, {
              name: item.name.trim(),
              quantity: parseFloat(item.quantity) || 1,
              unit_price: item.unit_price ? parseFloat(item.unit_price) : undefined,
              total_price: item.total_price ? parseFloat(item.total_price) : undefined,
            })
          );
        }
      }

      await Promise.all(itemPromises);

      // 3. Recharger le document pour avoir les articles à jour
      const refreshedDoc = await documentsApi.get(document.id);

      setDocument(refreshedDoc);
      setEditableItems([]);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      if (onUpdate) {
        onUpdate(refreshedDoc);
      }
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTagToggle = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }));
  };

  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: document.currency || 'EUR',
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80" onClick={onClose}>
      {/* Zone principale - le document (masquée pour les entrées manuelles) */}
      {!isManualEntry && (
        <div
          className="flex-1 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Barre d'outils */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="font-medium truncate max-w-md">
                {document.original_name || 'Document'}
              </span>
              {saveSuccess && (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  Sauvegardé
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Contrôles de zoom (pour les images) */}
              {isImage && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                    title="Zoom arrière (-)"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <span className="text-sm min-w-[4rem] text-center">{zoom}%</span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                    title="Zoom avant (+)"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                    title="Rotation"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-slate-600 mx-2" />
                </>
              )}

              <button
                onClick={handleDownload}
                disabled={!fileUrl}
                className="p-2 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                title="Télécharger"
              >
                <Download className="w-5 h-5" />
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded transition-colors ml-2"
                title="Fermer (Escape)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenu du document */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-800 p-4">
            {isLoading && (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span>Chargement du document...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 text-red-400">
                <AlertCircle className="w-10 h-10" />
                <span>{error}</span>
              </div>
            )}

          {fileUrl && !isLoading && !error && (
            <>
              {isImage && (
                <img
                  src={fileUrl}
                  alt={document.original_name || 'Document'}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  }}
                />
              )}

              {isPdf && (
                <iframe
                  src={fileUrl}
                  className="w-full h-full bg-white rounded"
                  title={document.original_name || 'PDF'}
                />
              )}

              {!isImage && !isPdf && (
                <div className="text-white text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Aperçu non disponible pour ce type de fichier</p>
                  <button
                    onClick={handleDownload}
                    className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                  >
                    Télécharger le fichier
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}

      {/* Panneau latéral - Données extraites / Édition */}
      <div
        className={`${isManualEntry ? 'w-full max-w-xl mx-auto' : 'w-96'} bg-white flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec boutons d'action */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">
            {isManualEntry
              ? (document.merchant || 'Entrée manuelle')
              : (isEditing ? 'Modifier' : 'Données extraites')
            }
          </h3>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <Check className="w-4 h-4" />
                Sauvegardé
              </span>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={isManualEntry ? onClose : handleCancelEdit}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded transition-colors"
                >
                  {isManualEntry ? 'Fermer' : 'Annuler'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Sauvegarder
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Informations principales */}
          <div className="space-y-3">
            {/* Marchand */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Marchand</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData(prev => ({ ...prev, merchant: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nom du marchand"
                />
              ) : (
                <p className="text-slate-800 font-medium">{document.merchant || '-'}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-slate-800">{document.date || '-'}</p>
              )}
            </div>

            {/* Montant */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Montant</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              ) : (
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(document.total_amount)}
                </p>
              )}
            </div>

            {/* Type de document */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Type</label>
              {isEditing ? (
                <select
                  value={formData.doc_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, doc_type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="receipt">Ticket de caisse</option>
                  <option value="invoice">Facture</option>
                  <option value="payslip">Fiche de paie</option>
                  <option value="other">Autre</option>
                </select>
              ) : (
                <p className="text-slate-800 capitalize">{document.doc_type || '-'}</p>
              )}
            </div>

            {/* Revenu / Dépense */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Type de transaction</label>
              {isEditing ? (
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_income: false }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !formData.is_income
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    }`}
                  >
                    Dépense
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_income: true }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.is_income
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    }`}
                  >
                    Revenu
                  </button>
                </div>
              ) : (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-sm ${
                    document.is_income
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {document.is_income ? 'Revenu' : 'Dépense'}
                </span>
              )}
            </div>

            {/* Document récurrent */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Abonnement</label>
              {isEditing ? (
                <div className="mt-1 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Document récurrent</span>
                  </label>

                  {formData.is_recurring && (
                    <div className="pl-6 space-y-2">
                      <div>
                        <label className="text-xs text-slate-500">Fréquence</label>
                        <select
                          value={formData.recurring_frequency}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurring_frequency: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="monthly">Mensuel</option>
                          <option value="quarterly">Trimestriel</option>
                          <option value="yearly">Annuel</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Date de fin (optionnel)</label>
                        <input
                          type="date"
                          value={formData.recurring_end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurring_end_date: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : document.is_recurring ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm bg-blue-100 text-blue-700">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {document.recurring_frequency === 'monthly' ? 'Mensuel' :
                     document.recurring_frequency === 'quarterly' ? 'Trimestriel' :
                     document.recurring_frequency === 'yearly' ? 'Annuel' : document.recurring_frequency}
                  </span>
                  {document.recurring_end_date && (
                    <span className="text-xs text-slate-500">
                      jusqu'au {document.recurring_end_date}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Non récurrent</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase">Tags</label>
            {isEditing ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                      formData.tag_ids.includes(tag.id)
                        ? 'ring-2 ring-offset-1'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      ringColor: tag.color,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
                {availableTags.length === 0 && (
                  <p className="text-sm text-slate-400">Aucun tag disponible</p>
                )}
              </div>
            ) : document.tags && document.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {document.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mt-1">Aucun tag</p>
            )}
          </div>

          {/* Articles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500 uppercase">
                Articles ({isEditing
                  ? editableItems.filter(i => !i.isDeleted).length
                  : document.items?.length || 0})
              </label>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  Ajouter
                </button>
              )}
            </div>

            {isEditing ? (
              /* Mode édition des articles */
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {editableItems.map((item, index) => (
                  <div
                    key={item.id || `new-${index}`}
                    className={`p-2 rounded border ${
                      item.isDeleted
                        ? 'bg-red-50 border-red-200 opacity-60'
                        : item.isNew
                        ? 'bg-green-50 border-green-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {item.isDeleted ? (
                      /* Article marqué comme supprimé */
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-600 line-through">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRestoreItem(index)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Restaurer
                        </button>
                      </div>
                    ) : (
                      /* Article en édition */
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            placeholder="Nom de l'article"
                            className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-16">
                            <label className="text-[10px] text-slate-400">Qté</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-400">Prix unit.</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-400">Total</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.total_price}
                              onChange={(e) => handleItemChange(index, 'total_price', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {editableItems.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">
                    Aucun article. Cliquez sur "Ajouter" pour en créer.
                  </p>
                )}
              </div>
            ) : (
              /* Mode lecture des articles */
              document.items && document.items.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {document.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm p-2 bg-slate-50 rounded"
                    >
                      <div>
                        <p className="text-slate-800">{item.name}</p>
                        <p className="text-slate-500 text-xs">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-medium text-slate-800">
                        {formatCurrency(item.total_price)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Aucun article</p>
              )
            )}
          </div>

          {/* Confiance OCR */}
          {document.ocr_confidence !== undefined && document.ocr_confidence !== null && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">
                Confiance OCR
              </label>
              {(() => {
                // La confiance est stockée entre 0 et 1, on convertit en pourcentage
                const confidencePercent = document.ocr_confidence <= 1
                  ? Math.round(document.ocr_confidence * 100)
                  : Math.round(document.ocr_confidence);
                return (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          confidencePercent >= 80
                            ? 'bg-green-500'
                            : confidencePercent >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${confidencePercent}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-600">{confidencePercent}%</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Texte OCR brut (collapsible) */}
          {document.ocr_raw_text && !isEditing && (
            <details className="group">
              <summary className="text-xs font-medium text-slate-500 uppercase cursor-pointer hover:text-slate-700">
                Texte OCR brut
              </summary>
              <pre className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                {document.ocr_raw_text}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
