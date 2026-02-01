/**
 * Contexte pour la gestion des uploads asynchrones
 * Gère la file d'attente des uploads et le polling des statuts
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { documents as documentsApi } from '../services/api';
import { Document, ProcessingStatus } from '../types';

// ============================================
// Types
// ============================================

export interface UploadItem {
  id: number;
  filename: string;
  status: ProcessingStatus;
  error?: string;
  document?: Document;
  addedAt: Date;
}

interface UploadContextType {
  uploadQueue: UploadItem[];
  addUpload: (file: File) => Promise<void>;
  removeFromQueue: (id: number) => void;
  clearCompleted: () => void;
  onDocumentReady?: (document: Document) => void;
  setOnDocumentReady: (callback: ((document: Document) => void) | undefined) => void;
}

// ============================================
// Contexte
// ============================================

const UploadContext = createContext<UploadContextType | null>(null);

// ============================================
// Provider
// ============================================

interface UploadProviderProps {
  children: React.ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const pollingIntervals = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const onDocumentReadyRef = useRef<((document: Document) => void) | undefined>();

  /**
   * Nettoie les intervalles de polling lors du démontage
   */
  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  /**
   * Démarre le polling pour un document
   */
  const startPolling = useCallback((documentId: number) => {
    // Ne pas démarrer si déjà en cours
    if (pollingIntervals.current.has(documentId)) return;

    const poll = async () => {
      try {
        const statusResponse = await documentsApi.getStatus(documentId);

        setUploadQueue((prev) =>
          prev.map((item) => {
            if (item.id !== documentId) return item;

            // Mettre à jour le statut
            const updated: UploadItem = {
              ...item,
              status: statusResponse.status,
              error: statusResponse.error,
              document: statusResponse.document,
            };

            // Si terminé (succès ou erreur), arrêter le polling
            if (statusResponse.status === 'completed' || statusResponse.status === 'error') {
              const interval = pollingIntervals.current.get(documentId);
              if (interval) {
                clearInterval(interval);
                pollingIntervals.current.delete(documentId);
              }

              // Callback si succès
              if (statusResponse.status === 'completed' && statusResponse.document) {
                onDocumentReadyRef.current?.(statusResponse.document);
              }
            }

            return updated;
          })
        );
      } catch (error) {
        console.error(`Erreur polling document ${documentId}:`, error);
        // En cas d'erreur réseau, on continue le polling
      }
    };

    // Polling toutes les 2 secondes
    const interval = setInterval(poll, 2000);
    pollingIntervals.current.set(documentId, interval);

    // Premier poll immédiat
    poll();
  }, []);

  /**
   * Ajoute un fichier à la file d'upload
   */
  const addUpload = useCallback(async (file: File) => {
    try {
      // Upload le fichier (retour immédiat avec status pending)
      const document = await documentsApi.upload(file);

      // Ajouter à la queue
      const uploadItem: UploadItem = {
        id: document.id,
        filename: file.name,
        status: document.processing_status || 'pending',
        addedAt: new Date(),
      };

      setUploadQueue((prev) => [...prev, uploadItem]);

      // Démarrer le polling
      startPolling(document.id);
    } catch (error: any) {
      console.error('Erreur upload:', error);
      // Créer une entrée en erreur
      const errorItem: UploadItem = {
        id: Date.now(), // ID temporaire
        filename: file.name,
        status: 'error',
        error: error.response?.data?.detail || 'Erreur lors de l\'upload',
        addedAt: new Date(),
      };
      setUploadQueue((prev) => [...prev, errorItem]);
    }
  }, [startPolling]);

  /**
   * Retire un item de la queue
   */
  const removeFromQueue = useCallback((id: number) => {
    // Arrêter le polling si en cours
    const interval = pollingIntervals.current.get(id);
    if (interval) {
      clearInterval(interval);
      pollingIntervals.current.delete(id);
    }

    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * Efface tous les items terminés (succès ou erreur)
   */
  const clearCompleted = useCallback(() => {
    setUploadQueue((prev) =>
      prev.filter((item) => item.status === 'pending' || item.status === 'processing')
    );
  }, []);

  /**
   * Définit le callback appelé quand un document est prêt
   */
  const setOnDocumentReady = useCallback((callback: ((document: Document) => void) | undefined) => {
    onDocumentReadyRef.current = callback;
  }, []);

  const value: UploadContextType = {
    uploadQueue,
    addUpload,
    removeFromQueue,
    clearCompleted,
    setOnDocumentReady,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

// ============================================
// Hook
// ============================================

export const useUpload = (): UploadContextType => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export default UploadContext;
