/**
 * Page Documents
 * Liste des documents avec zone de drag & drop pour upload
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  File,
  Image,
  FileSpreadsheet,
} from 'lucide-react';
import { documents as documentsApi, tags as tagsApi } from '../services/api';
import { Document, Tag } from '../types';
import clsx from 'clsx';

// ============================================
// Composant DocumentsPage
// ============================================

const DocumentsPage: React.FC = () => {
  // État des documents
  const [documentsList, setDocumentsList] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État de l'upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // État des tags (pour affichage)
  const [tagsList, setTagsList] = useState<Tag[]>([]);

  // Document en cours de suppression
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /**
   * Charge la liste des documents
   */
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await documentsApi.list();
      setDocumentsList(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Charge la liste des tags
   */
  const loadTags = useCallback(async () => {
    try {
      const data = await tagsApi.list();
      setTagsList(data);
    } catch (err) {
      console.error('Erreur lors du chargement des tags:', err);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    loadDocuments();
    loadTags();
  }, [loadDocuments, loadTags]);

  /**
   * Gère le drop de fichiers
   */
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      setUploadProgress(null);
      setUploadSuccess(null);
      setError(null);

      let successCount = 0;
      let errorCount = 0;

      for (const file of acceptedFiles) {
        try {
          setUploadProgress(`Upload de ${file.name}...`);
          await documentsApi.upload(file);
          successCount++;
        } catch (err: any) {
          console.error(`Erreur lors de l'upload de ${file.name}:`, err);
          errorCount++;
        }
      }

      setIsUploading(false);
      setUploadProgress(null);

      if (successCount > 0) {
        setUploadSuccess(
          `${successCount} fichier(s) uploadé(s) avec succès${
            errorCount > 0 ? ` (${errorCount} erreur(s))` : ''
          }`
        );
        // Recharge la liste
        loadDocuments();
        // Efface le message de succès après 3 secondes
        setTimeout(() => setUploadSuccess(null), 3000);
      } else if (errorCount > 0) {
        setError(`Erreur lors de l'upload de ${errorCount} fichier(s)`);
      }
    },
    [loadDocuments]
  );

  /**
   * Configuration de react-dropzone
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    disabled: isUploading,
  });

  /**
   * Supprime un document
   */
  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce document ?')) {
      return;
    }

    try {
      setDeletingId(id);
      await documentsApi.delete(id);
      // Retire le document de la liste locale
      setDocumentsList((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Retourne l'icône appropriée selon le type de fichier
   */
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('image')) return Image;
    if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv'))
      return FileSpreadsheet;
    return File;
  };

  /**
   * Formate la taille du fichier
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Formate le montant
   */
  const formatAmount = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return '--';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Header de la page */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-600 mt-1">
            Gérez vos documents financiers
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {documentsList.length} document(s)
        </div>
      </div>

      {/* ============================================ */}
      {/* Zone de Drag & Drop */}
      {/* ============================================ */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50',
          isUploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="mt-4 text-sm text-slate-600">{uploadProgress}</p>
            </>
          ) : (
            <>
              <Upload
                className={clsx(
                  'w-12 h-12',
                  isDragActive ? 'text-blue-500' : 'text-slate-400'
                )}
              />
              <p className="mt-4 text-sm text-slate-600">
                {isDragActive ? (
                  <span className="text-blue-600 font-medium">
                    Déposez les fichiers ici...
                  </span>
                ) : (
                  <>
                    <span className="text-blue-600 font-medium">
                      Cliquez pour uploader
                    </span>{' '}
                    ou glissez-déposez vos fichiers
                  </>
                )}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                PDF, Images, Excel, CSV (max 10 MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* Messages de feedback */}
      {/* ============================================ */}
      {uploadSuccess && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
          <span className="text-sm text-green-700">{uploadSuccess}</span>
          <button
            onClick={() => setUploadSuccess(null)}
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
      {/* Liste des documents */}
      {/* ============================================ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-600">Chargement des documents...</span>
        </div>
      ) : documentsList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-slate-800">
            Aucun document
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Commencez par uploader votre premier document
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* En-tête du tableau */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Document</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Montant</div>
            <div className="col-span-3">Tags</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Liste des documents */}
          <div className="divide-y divide-slate-200">
            {documentsList.map((doc) => {
              const FileIcon = getFileIcon(doc.file_type);
              const isDeleting = deletingId === doc.id;

              return (
                <div
                  key={doc.id}
                  className={clsx(
                    'px-6 py-4 hover:bg-slate-50 transition-colors',
                    isDeleting && 'opacity-50'
                  )}
                >
                  <div className="sm:grid sm:grid-cols-12 gap-4 items-center">
                    {/* Nom du fichier */}
                    <div className="col-span-4 flex items-center min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileIcon className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="ml-3 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {doc.original_filename}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(doc.file_size)}
                        </p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 mt-2 sm:mt-0">
                      <p className="text-sm text-slate-600">
                        {doc.document_date
                          ? format(new Date(doc.document_date), 'dd MMM yyyy', {
                              locale: fr,
                            })
                          : format(new Date(doc.upload_date), 'dd MMM yyyy', {
                              locale: fr,
                            })}
                      </p>
                      <p className="text-xs text-slate-400 sm:hidden">Date</p>
                    </div>

                    {/* Montant */}
                    <div className="col-span-2 mt-2 sm:mt-0">
                      <p
                        className={clsx(
                          'text-sm font-medium',
                          doc.amount ? 'text-slate-800' : 'text-slate-400'
                        )}
                      >
                        {formatAmount(doc.amount)}
                      </p>
                      <p className="text-xs text-slate-400 sm:hidden">Montant</p>
                    </div>

                    {/* Tags */}
                    <div className="col-span-3 mt-2 sm:mt-0">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags && doc.tags.length > 0 ? (
                          doc.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">
                            Aucun tag
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 mt-3 sm:mt-0 flex justify-end">
                      <button
                        onClick={() => handleDelete(doc.id)}
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
