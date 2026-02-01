/**
 * Composant DocumentViewer - Visionneuse de documents
 *
 * Affiche les images et PDFs dans une modal avec:
 * - Zoom avant/arrière
 * - Navigation (pour les PDFs multi-pages via le navigateur natif)
 * - Affichage des données extraites à côté
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
} from 'lucide-react';
import { documents as documentsApi } from '../services/api';
import type { Document } from '../types';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Détermine si c'est un PDF ou une image
  const isPdf = document.file_type?.includes('pdf') || document.original_name?.toLowerCase().endsWith('.pdf');
  const isImage = document.file_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(document.original_name || '');

  // Charger le fichier
  useEffect(() => {
    const loadFile = async () => {
      if (!document.file_path) {
        setError('Ce document n\'a pas de fichier associé');
        setIsLoading(false);
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

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 25, 300));
      if (e.key === '-') setZoom((z) => Math.max(z - 25, 25));
      if (e.key === '0') setZoom(100);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = document.original_name || 'document';
      link.click();
    }
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
      {/* Zone principale - le document */}
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

      {/* Panneau latéral - Données extraites */}
      <div
        className="w-80 bg-white flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Données extraites</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Informations principales */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Marchand</label>
              <p className="text-slate-800 font-medium">{document.merchant || '-'}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Date</label>
              <p className="text-slate-800">{document.date || '-'}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Montant</label>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(document.total_amount)}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Type</label>
              <p className="text-slate-800 capitalize">{document.doc_type || '-'}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">
                {document.is_income ? 'Revenu' : 'Dépense'}
              </label>
              <span
                className={`inline-block px-2 py-0.5 rounded text-sm ${
                  document.is_income
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {document.is_income ? 'Revenu' : 'Dépense'}
              </span>
            </div>
          </div>

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Tags</label>
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
            </div>
          )}

          {/* Articles */}
          {document.items && document.items.length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-2 block">
                Articles ({document.items.length})
              </label>
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
            </div>
          )}

          {/* Confiance OCR */}
          {document.ocr_confidence !== undefined && document.ocr_confidence !== null && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">
                Confiance OCR
              </label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      document.ocr_confidence >= 80
                        ? 'bg-green-500'
                        : document.ocr_confidence >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${document.ocr_confidence}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600">{document.ocr_confidence}%</span>
              </div>
            </div>
          )}

          {/* Texte OCR brut (collapsible) */}
          {document.ocr_raw_text && (
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
