import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  X,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

/*
|--------------------------------------------------------------------------
| HEADER — Mobile-first 3-row layout
|
|  MOBILE:
|  Row 1: [Logo]                    [♥] [👤] [🛒 count]
|  Row 2: [🔍 Search products...          ] [×]
|  Row 3: [ All | Kitchen | Cleaning | Home | ... ] ← horizontal scroll chips
|
|  DESKTOP:
|  Row 1: [Logo]  [🔍 Search...     ]  [♥] [👤] [🛒 Checkout]
|  Row 2: [ All | Kitchen | Cleaning | Home | ... ]
|--------------------------------------------------------------------------
*/

const POPULAR_SEARCHES = [
  'Kitchen cleaner',
  'Spray bottle',
  'Car cleaner',
  'Home essentials',
  'Cleaning supplies',
];

export default function Header() {
  const {
    currentView,
    setCurrentView,
    cart,
    wishlist,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    products,
    storeSettings,
    userProfile,
    categories,
    showToast,
  } = useContext(AppContext);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef(null);
  const desktopInputRef = useRef(null);

  const cartCount = cart.reduce((t, i) => t + i.quantity, 0);

  // Focus mobile search input when overlay opens
  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [mobileSearchOpen]);

  /* -----------------------------------------------------------------------
     PRODUCT SEARCH SUGGESTIONS
  ----------------------------------------------------------------------- */
  const getFilteredSuggestions = (query) => {
    if (!query || query.trim().length === 0) return [];
    const q = query.toLowerCase();
    return products
      .filter((p) => {
        const catName =
          typeof p.category === 'object' ? p.category?.name || '' : p.category || '';
        return [
          p.name || '',
          catName,
          p.description || '',
          p.brand || p.seller || '',
          p.tagline || '',
          p.tags || '',
          p.subcategory || '',
        ].some((f) => f.toLowerCase().includes(q));
      })
      .slice(0, 6);
  };

  const suggestions = getFilteredSuggestions(searchQuery);

  /* -----------------------------------------------------------------------
     HANDLERS
  ----------------------------------------------------------------------- */
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowSuggestions(val.trim().length > 0);
    if (val.trim().length > 0 && currentView !== 'products') {
      setCurrentView('products');
    }
  };

  const handleSearchSubmit = (value) => {
    setSearchQuery(value);
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    setCurrentView('products');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    if (currentView !== 'products') setCurrentView('products');
  };

  /* -----------------------------------------------------------------------
     DON'T SHOW HEADER ON ADMIN VIEW
  ----------------------------------------------------------------------- */
  if (currentView === 'admin') return null;

  /* -----------------------------------------------------------------------
     RENDER
  ----------------------------------------------------------------------- */
  return (
    <>
      {/* ================================================================
          ANNOUNCEMENT BAR
      ================================================================ */}
      {storeSettings?.announcementBar && (
        <div className="w-full bg-[#1C1917] px-4 py-1.5 text-center text-[11px] font-medium text-white tracking-wide">
          {storeSettings.announcementBar}
        </div>
      )}

      {/* ================================================================
          HEADER
      ================================================================ */}
      <header
        className="sticky top-0 z-50 w-full bg-white border-b border-gray-100"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* ==============================================================
            ROW 1 — Logo + Actions
        ============================================================== */}
        <div className="flex items-center justify-between px-3 py-2 md:px-6 md:py-3">

          {/* LOGO */}
          <button
            onClick={() => {
              setCurrentView('home');
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="flex items-center gap-2 focus:outline-none"
            aria-label="Go to home"
          >
            {storeSettings?.storeLogo ? (
              <img
                src={storeSettings.storeLogo}
                alt={storeSettings.storeName || 'RK Peedika'}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-lg font-black tracking-tight text-[#222222] leading-none">
                {storeSettings?.storeName || 'RK Peedika'}
              </span>
            )}
          </button>

          {/* DESKTOP SEARCH (hidden on mobile — shown in Row 2) */}
          <div className="hidden md:flex mx-4 flex-1 max-w-xl items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[#f7941d] focus-within:ring-2 focus-within:ring-[#f7941d]/15 transition-all relative">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              ref={desktopInputRef}
              type="text"
              placeholder="Search for products..."
              className="flex-1 bg-transparent text-sm text-[#222222] outline-none placeholder:text-gray-400 min-w-0"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit(searchQuery);
              }}
              onFocus={() => setShowSuggestions(searchQuery.trim().length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

            {/* Desktop suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => handleSearchSubmit(p.name)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 text-left"
                  >
                    <span className="text-sm text-[#222222] truncate">{p.name}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase shrink-0 ml-2">
                      {typeof p.category === 'object' ? p.category?.name : p.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-1">

            {/* Wishlist */}
            <button
              onClick={() => {
                if (!userProfile) {
                  showToast('⚠ Please log in to use Wishlist', 'warning');
                } else {
                  setCurrentView('wishlist');
                }
              }}
              className={`relative rounded-full p-2 transition-colors ${
                currentView === 'wishlist' ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart size={20} strokeWidth={1.8} />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#f7941d] text-[9px] font-bold text-white">
                  {wishlist.length > 9 ? '9+' : wishlist.length}
                </span>
              )}
            </button>

            {/* Account */}
            <button
              onClick={() => setCurrentView('profile')}
              className={`rounded-full p-2 transition-colors ${
                currentView === 'profile'
                  ? 'text-[#f7941d]'
                  : 'text-gray-500 hover:text-[#f7941d]'
              }`}
              aria-label="My Account"
              title="My Account"
            >
              <User size={20} strokeWidth={1.8} />
            </button>

            {/* Cart */}
            <button
              onClick={() => setCurrentView('checkout')}
              className="relative flex items-center gap-1.5 rounded-xl bg-[#f7941d] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e07d10] focus:outline-none"
              aria-label={`Cart (${cartCount} items)`}
              title="Cart"
            >
              <ShoppingCart size={18} strokeWidth={2} />
              <span className="hidden md:inline text-sm">Cart</span>
              {cartCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#f7941d] shadow-sm">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ==============================================================
            ROW 2 — MOBILE SEARCH BAR (full-width, mobile only)
        ============================================================== */}
        <div className="md:hidden px-3 pb-2">
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="w-full flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-left focus:outline-none"
            aria-label="Search products"
          >
            <Search size={16} className="text-gray-400 shrink-0" />
            <span className="flex-1 text-sm text-gray-400 truncate">
              {searchQuery || 'Search products...'}
            </span>
            {searchQuery && (
              <X
                size={14}
                className="text-gray-400"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSearch();
                }}
              />
            )}
          </button>
        </div>

        {/* ==============================================================
            ROW 3 — CATEGORY NAV (horizontal scroll chips)
        ============================================================== */}
        {currentView !== 'profile' && currentView !== 'checkout' && (
          <nav
            className="border-t border-gray-100 bg-white overflow-x-auto no-scrollbar"
            aria-label="Product categories"
          >
            <div className="flex items-center gap-0 px-3 py-1.5 min-w-max">
              {['All', ...categories.map((c) => c.name)].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-full mr-1.5 transition-all focus:outline-none ${
                      isActive
                        ? 'bg-[#f7941d] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              {/* Trust indicator */}
              <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 ml-3 whitespace-nowrap border-l border-gray-200 pl-3">
                <ShieldCheck size={12} className="text-[#f7941d]" />
                Verified Sellers
              </span>
            </div>
          </nav>
        )}
      </header>

      {/* ================================================================
          MOBILE SEARCH OVERLAY (full screen)
      ================================================================ */}
      {mobileSearchOpen && (
        <div className="search-overlay">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setShowSuggestions(false);
              }}
              className="p-1.5 rounded-full text-gray-500 focus:outline-none"
              aria-label="Close search"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-[#f7941d] bg-gray-50 px-3 py-2">
              <Search size={16} className="text-[#f7941d] shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search products..."
                className="flex-1 bg-transparent text-sm text-[#222222] outline-none placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setShowSuggestions(val.trim().length > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit(searchQuery);
                }}
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="text-gray-400 focus:outline-none"
                  aria-label="Clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Suggestions / Recent */}
          <div className="flex-1 overflow-y-auto bg-white">
            {/* Show live suggestions when typing */}
            {searchQuery.trim().length > 0 ? (
              <div>
                {suggestions.length > 0 ? (
                  suggestions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSearchSubmit(p.name)}
                      className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 text-left active:bg-gray-50"
                    >
                      <span className="flex items-center gap-2">
                        <Search size={14} className="text-gray-300 shrink-0" />
                        <span className="text-sm text-[#222222]">{p.name}</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase">
                        {typeof p.category === 'object' ? p.category?.name : p.category}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-gray-400">
                    No results for "{searchQuery}"
                  </div>
                )}
              </div>
            ) : (
              /* Popular searches */
              <div className="p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Popular Searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSearchSubmit(term)}
                      className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 font-medium hover:bg-orange-50 hover:text-[#f7941d] transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>

                {/* Categories quick-jump */}
                {categories.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Browse Categories
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            handleCategoryClick(cat.name);
                            setMobileSearchOpen(false);
                          }}
                          className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 text-left active:bg-gray-100"
                        >
                          {cat.image && (
                            <img
                              src={cat.image}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          )}
                          <span className="truncate">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
