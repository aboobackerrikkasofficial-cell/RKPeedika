import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

/*
|--------------------------------------------------------------------------
| CATEGORY SCROLLER — compact horizontal scroll chips with icon circles
|
| On mobile: horizontally scrollable row of icon + label chips
| On desktop: same (wider screen means more visible at once)
|--------------------------------------------------------------------------
*/

const API_URL =
  import.meta.env.VITE_API_URL || 'https://rkpeedika.onrender.com/api';
const BACKEND_URL = API_URL.replace(/\/api\/?$/, '');

function getCategoryImageUrl(image) {
  if (!image) return null;
  const value = String(image).trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }
  const cleanPath = value.startsWith('/') ? value : `/${value}`;
  return `${BACKEND_URL}${cleanPath}`;
}

// Emoji fallbacks for categories when no image is available
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

function getCategoryEmoji(name) {
  if (!name) return '📦';
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '📦';
}

export default function CategoryList() {
  const {
    categories,
    setSelectedCategory,
    selectedCategory,
    setCurrentView,
    setSearchQuery,
  } = useContext(AppContext);

  const handleCategoryClick = (catName) => {
    setSelectedCategory(catName);
    setSearchQuery('');
    setCurrentView('products');
  };

  if (!categories || categories.length === 0) return null;

  return (
    <section aria-label="Product categories" className="relative border-b border-gray-100 bg-white overflow-hidden">
      {/* Subtle Background Image Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ 
          backgroundImage: "url('/images/promo_indian_market.jpg')", 
          opacity: 0.12 
        }} 
      />
      {/* Semi-transparent overlay to ensure contrast */}
      <div className="absolute inset-0 bg-white/45 pointer-events-none" />

      <div className="relative z-10">
        {/* Section header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1 md:px-6">
          <h2 className="text-[14px] font-extrabold text-[#222222] tracking-tight">Shop by Category</h2>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setCurrentView('products');
            }}
            className="text-[12px] font-bold text-[#0B1B2B]"
          >
            View All
          </button>
        </div>

        {/* Horizontal scroll chip row */}
        <div className="category-scroller">
          {/* "All" chip */}
          <button
            onClick={() => {
              setSelectedCategory('All');
              setCurrentView('products');
              setSearchQuery('');
            }}
            className={`category-chip${selectedCategory === 'All' ? ' active' : ''}`}
            aria-label="All categories"
          >
            <span className="category-chip-icon">
              <span style={{ fontSize: 22 }}>🛍️</span>
            </span>
            <span className="category-chip-label">All</span>
          </button>

          {categories.map((cat, index) => {
            const isActive = selectedCategory === cat.name;
            const imageUrl = getCategoryImageUrl(cat.image);
            const emoji = getCategoryEmoji(cat.name);

            return (
              <button
                key={cat.id || index}
                onClick={() => handleCategoryClick(cat.name)}
                className={`category-chip${isActive ? ' active' : ''}`}
                aria-label={cat.name}
                aria-pressed={isActive}
              >
                <span className="category-chip-icon">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      display: imageUrl ? 'none' : 'flex',
                      fontSize: 22,
                    }}
                  >
                    {emoji}
                  </span>
                </span>
                <span className="category-chip-label">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
