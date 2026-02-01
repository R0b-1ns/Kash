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
  Pencil,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  Plus,
  Search,
} from 'lucide-react';
import { documents as documentsApi, tags as tagsApi } from '../services/api';
import { DocumentListItem, Tag, Document, DocumentFilters as DocumentFiltersType } from '../types';
import clsx from 'clsx';
import DocumentViewer from '../components/DocumentViewer';
import DocumentFilters from '../components/DocumentFilters';
import { useDebounce } from '../hooks/useDebounce';
import { useUpload } from '../contexts/UploadContext';

const DocumentsPage: React.FC = () => {
  const [documentsList, setDocumentsList] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  // Contexte d'upload asynchrone
  const { addUpload, uploadQueue, setOnDocumentReady } = useUpload();
  const [isDropping, setIsDropping] = useState(false); // Juste pendant l'envoi HTTP initial
  const processingCount = uploadQueue.filter(item => item.status === 'pending' || item.status === 'processing').length;

  const [sortBy, setSortBy] = useState<'date' | 'total_amount' | 'merchant' | 'created_at'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);
  
  const [tagsList, setTagsList] = useState<Tag[]>([]);

  // Manual Entry Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    total_amount: '',
    currency: 'EUR',
    is_income: false,
    doc_type: 'other' as 'receipt' | 'invoice' | 'payslip' | 'other',
    tag_ids: [] as number[],
    notes: '',
  });
  const [isCreatingManual, setIsCreatingManual] = useState(false);


  // State for filters
  const [filters, setFilters] = useState<Partial<DocumentFiltersType>>({});
  
  // Debounce search terms
  const debouncedSearch = useDebounce(filters.search, 300);
  const debouncedOcrSearch = useDebounce(filters.ocr_search, 500);

  const activeFilterCount = Object.values(filters).filter(v => v !== null && v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)).length;

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const effectiveFilters = {
        ...filters,
        search: debouncedSearch,
        ocr_search: debouncedOcrSearch,
        order_by: sortBy,
        order_dir: sortDir,
      };

      const data = await documentsApi.list(effectiveFilters);
      setDocumentsList(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des documents');
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, sortDir, filters.start_date, filters.end_date, filters.min_amount, filters.max_amount, filters.tag_ids, filters.is_income, filters.doc_type, debouncedSearch, debouncedOcrSearch]);

  const loadTags = useCallback(async () => {
    try {
      const data = await tagsApi.list();
      setTagsList(data);
    } catch (err) {
      console.error('Erreur lors du chargement des tags:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadTags();
  }, [loadDocuments, loadTags]);

  // Callback quand un document est prêt (traitement terminé)
  useEffect(() => {
    setOnDocumentReady(() => {
      // Recharger la liste quand un document est terminé
      loadDocuments();
    });

    return () => {
      setOnDocumentReady(undefined);
    };
  }, [setOnDocumentReady, loadDocuments]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setError(null);
      setIsDropping(true);

      // Upload tous les fichiers en parallèle (chaque upload retourne immédiatement)
      await Promise.all(acceptedFiles.map(file => addUpload(file)));

      setIsDropping(false);
    },
    [addUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    disabled: isDropping, // Désactivé seulement pendant l'envoi HTTP initial
  });

  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce document ?')) return;
    try {
      setDeletingId(id);
      await documentsApi.delete(id);
      setDocumentsList((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      setDuplicatingId(id);
      await documentsApi.duplicate(id);
      loadDocuments();
      setUploadSuccess('Document dupliqué avec succès');
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la duplication');
    } finally {
      setDuplicatingId(null);
    }
  };
  
  const handleView = async (id: number) => {
    try {
      setIsLoadingViewer(true);
      const doc = await documentsApi.get(id);
      setViewingDocument(doc);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du document');
    } finally {
      setIsLoadingViewer(false);
    }
  };
  
  const handleSort = (column: 'date' | 'total_amount' | 'merchant' | 'created_at') => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const toggleManualTag = (tagId: number) => {
    setManualForm((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  const handleCloseManual = () => {
    setShowManualModal(false);
    setManualForm({
      date: new Date().toISOString().split('T')[0],
      merchant: '',
      total_amount: '',
      currency: 'EUR',
      is_income: false,
      doc_type: 'other',
      tag_ids: [],
      notes: '',
    });
  };

  const handleCreateManual = async () => {
    if (!manualForm.merchant.trim() || !manualForm.total_amount || !manualForm.date) {
      setError('Marchand, montant et date sont obligatoires.');
      return;
    }
    try {
      setIsCreatingManual(true);
      setError(null);
      await documentsApi.createManual({
        ...manualForm,
        total_amount: parseFloat(manualForm.total_amount),
        notes: manualForm.notes.trim() || undefined,
      });
      await loadDocuments();
      handleCloseManual();
      setUploadSuccess('Entrée manuelle créée avec succès');
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la création manuelle');
    } finally {
      setIsCreatingManual(false);
    }
  };
  
  const SortIcon: React.FC<{ column: 'date' | 'total_amount' | 'merchant' | 'created_at' }> = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    return sortDir === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const getFileIcon = (fileType: string | undefined | null) => {
    if (!fileType) return FileText;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('image')) return Image;
    if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv'))
      return FileSpreadsheet;
    return File;
  };
  
  const formatAmount = (amount: number | undefined | null, currency: string = 'EUR'): string => {
    if (amount === undefined || amount === null) return '--';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency }).format(amount);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-600 mt-1">Gérez et recherchez vos documents financiers.</p>
        </div>
        <div className="text-sm text-slate-500">{documentsList.length} document(s) affiché(s)</div>
      </div>

      <div className="flex gap-4">
        <div {...getRootProps()} className={clsx('flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors', isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50', isDropping && 'opacity-50 cursor-wait')}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            {isDropping ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="mt-4 text-sm text-blue-600 font-medium">Envoi des fichiers...</p>
              </>
            ) : (
              <>
                <Upload className={clsx('w-12 h-12', isDragActive ? 'text-blue-500' : 'text-slate-400')} />
                <p className="mt-4 text-sm text-slate-600">
                  {isDragActive ? (
                    <span className="text-blue-600 font-medium">Déposez les fichiers ici...</span>
                  ) : (
                    <>
                      <span className="text-blue-600 font-medium">Cliquez ou glissez</span>
                      <span> pour uploader</span>
                    </>
                  )}
                </p>
                <p className="mt-2 text-xs text-slate-400">PDF, Images (multi-upload supporté)</p>
                {processingCount > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{processingCount} document(s) en traitement</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowManualModal(true)}
          className="flex flex-col items-center justify-center w-32 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer transition-colors hover:border-green-400 hover:bg-green-50"
        >
          <Plus className="w-8 h-8 text-green-500" />
          <span className="mt-2 text-sm font-medium text-slate-600">
            Entrée manuelle
          </span>
        </button>
      </div>
      
      {uploadSuccess && <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg"><CheckCircle className="w-5 h-5 text-green-500 mr-3"/><span className="text-sm text-green-700">{uploadSuccess}</span><button onClick={() => setUploadSuccess(null)} className="ml-auto p-1"><X className="w-4 h-4"/></button></div>}
      {error && <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg"><AlertCircle className="w-5 h-5 text-red-500 mr-3"/><span className="text-sm text-red-700">{error}</span><button onClick={() => setError(null)} className="ml-auto p-1"><X className="w-4 h-4"/></button></div>}

      <DocumentFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /><span className="ml-3 text-slate-600">Chargement...</span></div>
      ) : documentsList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
          <Search className="w-16 h-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-slate-800">{activeFilterCount > 0 ? "Aucun résultat" : "Aucun document"}</h3>
          <p className="mt-2 text-sm text-slate-500">{activeFilterCount > 0 ? "Essayez de modifier vos filtres." : "Commencez par uploader un document."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase">
            <button onClick={() => handleSort('merchant')} className="col-span-4 flex items-center gap-1 hover:text-slate-700">Document <SortIcon column="merchant" /></button>
            <button onClick={() => handleSort('date')} className="col-span-2 flex items-center gap-1 hover:text-slate-700">Date <SortIcon column="date" /></button>
            <button onClick={() => handleSort('total_amount')} className="col-span-2 flex items-center gap-1 hover:text-slate-700">Montant <SortIcon column="total_amount" /></button>
            <div className="col-span-3">Tags</div>
            <div className="col-span-1">Actions</div>
          </div>

          <div className="divide-y divide-slate-200">
            {documentsList.map((doc) => {
              const IconComponent = getFileIcon(doc.file_type);
              return (
              <div key={doc.id} className={clsx('px-6 py-4 hover:bg-slate-50', deletingId === doc.id && 'opacity-50')}>
                <div className="sm:grid sm:grid-cols-12 gap-4 items-center">
                  <div className={clsx("col-span-4 flex items-center", doc.file_path && "cursor-pointer group")} onClick={() => doc.file_path && handleView(doc.id)}>
                    <div className={clsx("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center", doc.original_name ? "bg-slate-100 group-hover:bg-blue-100" : "bg-green-100")}>
                      {doc.original_name ? <IconComponent className="w-5 h-5 text-slate-500 group-hover:text-blue-600" /> : <Pencil className="w-5 h-5 text-green-600" />}
                    </div>
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600">{doc.merchant || doc.original_name || 'Entrée manuelle'}</p>
                      <p className="text-xs text-slate-500">{doc.doc_type || 'Document'}</p>
                    </div>
                  </div>

                  <div className="col-span-2 mt-2 sm:mt-0"><p className="text-sm text-slate-600">{doc.date ? format(new Date(doc.date), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</p></div>
                  <div className="col-span-2 mt-2 sm:mt-0"><p className={clsx('text-sm font-medium', doc.is_income ? 'text-green-600' : 'text-slate-800')}>{formatAmount(doc.total_amount, doc.currency)}</p></div>
                  <div className="col-span-3 mt-2 sm:mt-0"><div className="flex flex-wrap gap-1">{(doc.tags || []).map(tag => <span key={tag.id} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>{tag.name}</span>)}</div></div>
                  <div className="col-span-1 mt-3 sm:mt-0 flex justify-end gap-1">
                    {doc.file_path && <button onClick={() => handleView(doc.id)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg"><Eye className="w-4 h-4" /></button>}
                    <button onClick={() => handleDuplicate(doc.id)} className="p-2 text-slate-400 hover:text-green-600 rounded-lg" disabled={duplicatingId === doc.id}>{duplicatingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Copy className="w-4 h-4" />}</button>
                    <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg" disabled={deletingId === doc.id}>{deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}</button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
      
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Nouvelle entrée manuelle</h2>
              <button onClick={handleCloseManual} className="p-2"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
                {/* Form fields */}
                <input type="text" placeholder="Marchand" value={manualForm.merchant} onChange={e => setManualForm({...manualForm, merchant: e.target.value})} className="w-full p-2 border rounded"/>
                <input type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} className="w-full p-2 border rounded"/>
                <input type="number" placeholder="Montant" value={manualForm.total_amount} onChange={e => setManualForm({...manualForm, total_amount: e.target.value})} className="w-full p-2 border rounded"/>
                <div className="flex flex-wrap gap-2">
                  {tagsList.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleManualTag(tag.id)}
                      className={clsx(
                        'px-3 py-1 rounded-full text-sm',
                        manualForm.tag_ids.includes(tag.id) ? 'bg-blue-500 text-white' : 'bg-gray-200'
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-4">
              <button onClick={handleCloseManual} className="px-4 py-2 rounded">Annuler</button>
              <button onClick={handleCreateManual} disabled={isCreatingManual} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300">
                {isCreatingManual ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingDocument && <DocumentViewer document={viewingDocument} onClose={() => setViewingDocument(null)} onUpdate={(updatedDoc) => { setDocumentsList(prev => prev.map(d => d.id === updatedDoc.id ? { ...d, ...updatedDoc } : d)); loadDocuments(); }} />}
    </div>
  );
};

export default DocumentsPage;
