/**
 * Composant Toast pour afficher la progression des uploads
 * Affiché en bas à droite de l'écran
 */

import React, { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useUpload, UploadItem } from '../contexts/UploadContext';
import clsx from 'clsx';

// ============================================
// Composant UploadToastItem
// ============================================

interface UploadToastItemProps {
  item: UploadItem;
  onRemove: (id: number) => void;
}

const UploadToastItem: React.FC<UploadToastItemProps> = ({ item, onRemove }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss après 5 secondes pour les succès
  useEffect(() => {
    if (item.status === 'completed') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove(item.id), 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [item.status, item.id, onRemove]);

  const getStatusIcon = () => {
    switch (item.status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'pending':
        return 'En attente...';
      case 'processing':
        return 'Analyse en cours...';
      case 'completed':
        return 'Traitement terminé';
      case 'error':
        return item.error || 'Erreur';
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'pending':
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg border shadow-sm transition-all duration-300',
        getStatusColor(),
        !isVisible && 'opacity-0 transform translate-x-full'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <p className="text-sm font-medium text-slate-800 truncate">
            {item.filename}
          </p>
        </div>
        <p className={clsx(
          'text-xs mt-0.5',
          item.status === 'error' ? 'text-red-600' : 'text-slate-500'
        )}>
          {getStatusText()}
        </p>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================
// Composant UploadToast (Container)
// ============================================

const UploadToast: React.FC = () => {
  const { uploadQueue, removeFromQueue, clearCompleted } = useUpload();
  const [isExpanded, setIsExpanded] = useState(true);

  // Ne rien afficher si la queue est vide
  if (uploadQueue.length === 0) {
    return null;
  }

  const pendingCount = uploadQueue.filter(
    (item) => item.status === 'pending' || item.status === 'processing'
  ).length;

  const completedCount = uploadQueue.filter(
    (item) => item.status === 'completed'
  ).length;

  const errorCount = uploadQueue.filter(
    (item) => item.status === 'error'
  ).length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-white rounded-t-lg border border-b-0 border-slate-200 shadow-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          )}
          <span className="text-sm font-medium text-slate-800">
            Uploads
          </span>
          <div className="flex items-center gap-1 text-xs">
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                {pendingCount} en cours
              </span>
            )}
            {completedCount > 0 && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                {completedCount}
              </span>
            )}
            {errorCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                {errorCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(completedCount > 0 || errorCount > 0) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearCompleted();
              }}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 hover:bg-slate-100 rounded"
            >
              Effacer
            </button>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Liste des uploads */}
      {isExpanded && (
        <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2 space-y-2">
            {uploadQueue.map((item) => (
              <UploadToastItem
                key={item.id}
                item={item}
                onRemove={removeFromQueue}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadToast;
