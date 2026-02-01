/**
 * Composant de filtres pour la page Articles
 * Permet de filtrer par recherche, prix, dates, marchand et tags
 */

import React, { useState, useEffect } from 'react';
import { ItemFilters as ItemFiltersType, Tag } from '../types';
import { tags as apiTags } from '../services/api';
import { Search, SlidersHorizontal, X, Calendar, DollarSign, Store } from 'lucide-react';

interface ItemFiltersProps {
  filters: Partial<ItemFiltersType>;
  onFiltersChange: (newFilters: Partial<ItemFiltersType>) => void;
}

const ItemFilters: React.FC<ItemFiltersProps> = ({ filters, onFiltersChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  useEffect(() => {
    apiTags.list().then(setAvailableTags).catch(console.error);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFiltersChange({ ...filters, [name]: value });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
      {/* Barre de recherche principale et bouton de filtres */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            name="search"
            placeholder="Rechercher un article..."
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
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 border rounded-lg text-red-600 hover:bg-red-50"
          >
            <X size={20} />
            <span>Effacer</span>
          </button>
        )}
      </div>

      {/* Panneau de filtres avancés */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] mt-4 pt-4 border-t' : 'max-h-0'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Marchand */}
          <div className="space-y-1">
            <label htmlFor="merchant" className="text-sm font-medium text-gray-700 flex items-center">
              <Store size={16} className="mr-2" /> Marchand
            </label>
            <input
              id="merchant"
              name="merchant"
              type="text"
              placeholder="Ex: Carrefour"
              value={filters.merchant || ''}
              onChange={handleInputChange}
              className="w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Plage de dates */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <Calendar size={16} className="mr-2" /> Plage de dates
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                name="start_date"
                value={filters.start_date || ''}
                onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm"
              />
              <span>-</span>
              <input
                type="date"
                name="end_date"
                value={filters.end_date || ''}
                onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>

          {/* Plage de prix */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <DollarSign size={16} className="mr-2" /> Plage de prix
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                name="min_price"
                placeholder="Min"
                step="0.01"
                value={filters.min_price ?? ''}
                onChange={handlePriceChange}
                className="w-full border-gray-300 rounded-md shadow-sm"
              />
              <span>-</span>
              <input
                type="number"
                name="max_price"
                placeholder="Max"
                step="0.01"
                value={filters.max_price ?? ''}
                onChange={handlePriceChange}
                className="w-full border-gray-300 rounded-md shadow-sm"
              />
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
              {availableTags.length === 0 && (
                <span className="text-sm text-gray-400">Aucun tag disponible</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemFilters;
