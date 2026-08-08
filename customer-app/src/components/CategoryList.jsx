import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function CategoryList() {
  const { categories, setSelectedCategory, selectedCategory, setCurrentView, setSearchQuery } = useContext(AppContext);

  // Ordered category list with proper images from DB
  // The seed data provides: Kitchen & Dining, Cleaning Essentials, Garden & Outdoor, Automotive Accessories, Health & Personal Care
  // with images at /images/category_kitchen.jpg, /images/category_cleaning.jpg, etc.

  const handleCategoryClick = (catName) => {
    setSelectedCategory(catName);
    setSearchQuery('');
    setCurrentView('products');
  };

  if (categories.length === 0) return null;

  return (
    <div className="w-full py-6 bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-charcoal tracking-tight">Popular Categories</h3>
          <button 
            onClick={() => { setSelectedCategory("All"); setCurrentView('products'); }}
            className="text-xs font-semibold text-[#F7941D] hover:underline"
          >
            View All
          </button>
        </div>

        {/* Scrollable grid container */}
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((cat, index) => {
            const isActive = selectedCategory === cat.name;
            return (
              <div 
                key={cat.id || index}
                onClick={() => handleCategoryClick(cat.name)}
                className={`flex-none w-[220px] md:w-[280px] cursor-pointer rounded-premium overflow-hidden bg-white border border-gray-100 shadow-premium transition-premium group ${
                  isActive ? 'ring-2 ring-[#F7941D] border-transparent' : 'hover:shadow-premiumHover hover:border-gray-200'
                }`}
              >
                <div className="h-[140px] md:h-[160px] overflow-hidden relative bg-gray-50">
                  <img 
                    src={cat.image || `/images/category_kitchen.jpg`} 
                    alt={cat.name} 
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-charcoal/10 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-200">Collection</p>
                    <h4 className="text-sm md:text-base font-bold leading-tight">{cat.name}</h4>
                  </div>
                </div>
                <div className="p-3 text-xs text-gray-500 font-medium">
                  {cat.description || 'Premium quality products'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
