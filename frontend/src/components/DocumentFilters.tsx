import React, { useState, useEffect } from 'react';
import { DocumentFilters as DocumentFiltersType, Tag } from '../types';
import { tags as apiTags } from '../services/api';
import { Search, SlidersHorizontal, X, Calendar, DollarSign, FileText, ScanText } from 'lucide-react';

interface DocumentFiltersProps {
  filters: Partial<DocumentFiltersType>;
  onFiltersChange: (newFilters: Partial<DocumentFiltersType>) => void;
}

const DocumentFilters: React.FC<DocumentFiltersProps> = ({ filters, onFiltersChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  useEffect(() => {
    // Charger les tags disponibles pour le sélecteur
    apiTags.list().then(setAvailableTags).catch(console.error);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFiltersChange({ ...filters, [name]: value });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Permettre de vider le champ
    if (value === '') {
      onFiltersChange({ ...filters, [name]: undefined });
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onFiltersChange({ ...filters, [name]: numValue });
    }
  };

  const handleTagClick = (tagId: number) => {
    const currentTags = filters.tag_ids || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    onFiltersChange({ ...filters, tag_ids: newTags });
  };

  const handleReset = () => {
    onFiltersChange({});
  };
  
  const getActiveFilterCount = () => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'tag_ids' && Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    }).length;
  };
  
  const activeFilterCount = getActiveFilterCount();

  const docTypes = ['receipt', 'invoice', 'payslip', 'other'];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
      {/* Barre de recherche principale et bouton de filtres */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            name="search"
            placeholder="Rechercher par marchand, lieu..."
            value={filters.search || ''}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 relative"
        >
          <SlidersHorizontal size={20} />
          <span>Filtres</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
            <button onClick={handleReset} className="flex items-center space-x-2 px-4 py-2 border rounded-lg text-red-600 hover:bg-red-50">
                <X size={20} />
                <span>Effacer</span>
            </button>
        )}
      </div>

      {/* Panneau de filtres avancés */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] mt-4 pt-4 border-t' : 'max-h-0'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Recherche OCR */}
            <div className="space-y-1">
                <label htmlFor="ocr_search" className="text-sm font-medium text-gray-700 flex items-center">
                    <ScanText size={16} className="mr-2"/> Contenu du document (OCR)
                </label>
                <input id="ocr_search" name="ocr_search" type="text" value={filters.ocr_search || ''} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm"/>
            </div>

            {/* Type Revenu/Dépense */}
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Type de transaction</label>
                <div className="flex items-center space-x-4">
                    <label><input type="radio" name="is_income" value="" checked={filters.is_income === undefined || filters.is_income === null} onChange={() => onFiltersChange({...filters, is_income: undefined})} className="mr-1"/> Tous</label>
                    <label><input type="radio" name="is_income" value="false" checked={filters.is_income === false} onChange={() => onFiltersChange({...filters, is_income: false})} className="mr-1"/> Dépenses</label>
                    <label><input type="radio" name="is_income" value="true" checked={filters.is_income === true} onChange={() => onFiltersChange({...filters, is_income: true})} className="mr-1"/> Revenus</label>
                </div>
            </div>

            {/* Type de document */}
            <div className="space-y-1">
                 <label htmlFor="doc_type" className="text-sm font-medium text-gray-700 flex items-center">
                    <FileText size={16} className="mr-2"/> Type de document
                </label>
                <select id="doc_type" name="doc_type" value={filters.doc_type || ''} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm">
                    <option value="">Tous les types</option>
                    {docTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>

            {/* Plage de dates */}
            <div className="space-y-1">
                 <label className="text-sm font-medium text-gray-700 flex items-center"><Calendar size={16} className="mr-2"/> Plage de dates</label>
                 <div className="flex items-center space-x-2">
                    <input type="date" name="start_date" value={filters.start_date || ''} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm"/>
                    <span>-</span>
                    <input type="date" name="end_date" value={filters.end_date || ''} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm"/>
                 </div>
            </div>

            {/* Plage de montants */}
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center"><DollarSign size={16} className="mr-2"/> Plage de montants</label>
                <div className="flex items-center space-x-2">
                    <input type="number" name="min_amount" placeholder="Min" value={filters.min_amount || ''} onChange={handleAmountChange} className="w-full border-gray-300 rounded-md shadow-sm"/>
                    <span>-</span>
                    <input type="number" name="max_amount" placeholder="Max" value={filters.max_amount || ''} onChange={handleAmountChange} className="w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
            </div>
            
            {/* Tags */}
            <div className="space-y-2 lg:col-span-3">
                <label className="text-sm font-medium text-gray-700">Tags</label>
                <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => handleTagClick(tag.id)}
                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                filters.tag_ids?.includes(tag.id)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            {tag.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentFilters;