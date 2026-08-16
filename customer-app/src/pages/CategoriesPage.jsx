import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ChevronRight } from 'lucide-react';

export default function CategoriesPage() {
  const { categories, setSelectedCategory, setCurrentView, setSearchQuery } = useContext(AppContext);

  const handleCategoryClick = (categoryName) => {
    setSelectedCategory(categoryName);
    setSearchQuery('');
    setCurrentView('home');
  };

  // Emoji mapping for categories
  const CATEGORY_EMOJI = {
    'kitchen': '🍳',
    'cleaning': '🧹',
    'home': '🏠',
    'bathroom': '🛁',
    'car': '🚗',
    'shoe': '👟',
    'garden': '🌿',
    'health': '💊',
    'beauty': '💄',
    'electronics': '📱',
    'fashion': '👗',
    'sports': '⚽',
    'toys': '🧸',
    'books': '📚',
    'food': '🥗',
    'offers': '🏷️',
    'automotive': '🚗',
    'outdoor': '🌳',
    'personal': '🧴',
  };

  const getEmoji = (name) => {
    if (!name) return '📦';
    const lower = name.toLowerCase();
    for (const [key, val] of Object.entries(CATEGORY_EMOJI)) {
      if (lower.includes(key)) return val;
    }
    return '📦';
  };

  return (
    <div className="w-full min-h-screen bg-[#f8f8f8] pb-24 font-sans">
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-base font-black text-charcoal tracking-tight">Categories</h1>
      </div>

      <div className="p-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
          <button
            onClick={() => handleCategoryClick('All')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50/50 text-left transition-colors min-h-[52px]"
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">🛍️</span>
              <span className="text-sm font-bold text-charcoal">All Products</span>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-gray-400" />
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.name)}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50/50 text-left transition-colors min-h-[52px]"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getEmoji(cat.name)}</span>
                <span className="text-sm font-bold text-charcoal">{cat.name}</span>
              </div>
              <ChevronRight className="h-4.5 w-4.5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
