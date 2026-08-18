import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Search, Heart, ShoppingCart, User, X, ArrowLeft, Mic, Camera } from 'lucide-react';

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

  const getFilteredSuggestions = (query) => {
    if (!query || query.trim().length === 0) return [];
    const q = query.toLowerCase();
    return products
      .filter((p) => {
        const catName = typeof p.category === 'object' ? p.category?.name || '' : p.category || '';
        return [
          p.name || '',
          catName,
          p.description || '',
          p.brand || p.seller || '',
          p.tagline || '',
        ].some((f) => f.toLowerCase().includes(q));
      })
      .slice(0, 6);
  };

  const suggestions = getFilteredSuggestions(searchQuery);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowSuggestions(val.trim().length > 0);
    if (val.trim().length > 0 && currentView !== 'products' && currentView !== 'home') {
      setCurrentView('home');
    }
  };

  const handleSearchSubmit = (value) => {
    setSearchQuery(value);
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    setCurrentView('home');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    setCurrentView('home');
  };

  if (currentView === 'admin') return null;

  return (
    <>
      {/* Announcement Bar (Marquee) */}
      <div className="w-full bg-[#071320] py-1.5 text-[10px] font-extrabold text-white tracking-wide uppercase overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-[marquee_10s_linear_infinite]">
          EASY EXCHANGE WITHIN 5 DAYS &nbsp; • &nbsp; COD AVAILABLE ALL OVER INDIA &nbsp; • &nbsp; EASY EXCHANGE WITHIN 5 DAYS &nbsp; • &nbsp; COD AVAILABLE ALL OVER INDIA &nbsp; • &nbsp; EASY EXCHANGE WITHIN 5 DAYS &nbsp; • &nbsp; COD AVAILABLE ALL OVER INDIA
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-[#0B1B2B] border-b border-[#071320] shadow-sm font-sans">
        {/* Main Header Content */}
        <div className="flex items-center justify-between px-4 py-2.5 md:px-8 md:py-3">
          
          {/* Logo / Store Name */}
          <button
            onClick={() => {
              setCurrentView('home');
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="flex items-center gap-2 focus:outline-none cursor-pointer"
            aria-label="Go to home"
          >
            {storeSettings?.storeLogo ? (
              <img
                src={storeSettings.storeLogo}
                alt={storeSettings.storeName || 'RK Peedika'}
                className="h-8 w-auto object-contain rounded-md"
              />
            ) : (
              <span className="text-xl md:text-2xl font-black tracking-tight text-white leading-none">
                {storeSettings?.storeName || 'RK Peedika'}
              </span>
            )}
          </button>

          {/* Desktop Search Bar (Hidden on mobile) */}
          <div className="hidden md:flex mx-6 flex-1 max-w-lg items-center gap-2 rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-4 py-1.5 focus-within:border-[#F5A623] focus-within:bg-white transition-all relative shadow-sm">
            <Search size={16} className="text-[#0B1B2B] shrink-0" />
            <input
              ref={desktopInputRef}
              type="text"
              placeholder="Search for products..."
              className="flex-1 bg-transparent text-xs text-charcoal outline-none placeholder:text-gray-400 min-w-0 font-medium"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit(searchQuery);
              }}
              onFocus={() => setShowSuggestions(searchQuery.trim().length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <div className="flex items-center gap-2 text-gray-400">
              <Mic size={16} className="cursor-pointer hover:text-[#0B1B2B] transition-colors" />
            </div>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}

            {/* Desktop search suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EDEDED] rounded-xl shadow-lg z-50 overflow-hidden">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => handleSearchSubmit(p.name)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#0B1B2B]/10/30 text-left cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-charcoal truncate">{p.name}</span>
                    <span className="text-[9px] text-[#0B1B2B] bg-[#0B1B2B]/10 px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ml-2">
                      {typeof p.category === 'object' ? p.category?.name : p.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Header Action Icons */}
          <div className="flex items-center space-x-1">
            {/* Wishlist */}
            <button
              onClick={() => {
                if (!userProfile) {
                  showToast('🔑 Please sign in to access your wishlist', 'warning');
                  setCurrentView('profile');
                } else {
                  setCurrentView('wishlist');
                }
              }}
              className="flex rounded-full p-2 text-white/90 hover:text-[#F5A623] transition-colors min-h-[44px] min-w-[44px] items-center justify-center cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart size={24} className={wishlist?.length > 0 ? "fill-[#E14B4B] text-[#E14B4B]" : ""} />
            </button>

            {/* Profile - Hidden on Mobile (Since bottom nav handles it) */}
            <button
              onClick={() => setCurrentView('profile')}
              className="hidden md:flex rounded-full p-2 text-white/90 hover:text-[#F5A623] transition-colors min-h-[44px] min-w-[44px] items-center justify-center cursor-pointer"
              aria-label="Profile"
            >
              <User size={24} />
            </button>

            {/* Cart Icon */}
            <button
              onClick={() => setCurrentView('cart')}
              className="relative flex items-center justify-center p-2 text-white/90 hover:text-[#F5A623] transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
              aria-label="Cart"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F5A623] text-[10px] font-black text-white shadow shadow-amber-500/20">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Row (Mobile only) */}
        <div className="md:hidden px-4 pb-3 pt-1">
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="w-full flex items-center gap-2.5 rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-4 py-2 text-left focus:outline-none shadow-sm cursor-pointer"
            style={{ minHeight: 48 }}
            aria-label="Search products"
          >
            <Search size={18} className="text-[#0B1B2B] shrink-0" />
            <span className="flex-grow text-sm text-gray-450 truncate font-semibold">
              {searchQuery || 'Search for products...'}
            </span>
            <div className="flex items-center gap-2 text-gray-400">
              <Mic size={18} />
            </div>
            {searchQuery && (
              <X
                size={18}
                className="text-gray-400 ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSearch();
                }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Search Full Screen Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col font-sans">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-3 py-3.5 border-b border-gray-100">
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setShowSuggestions(false);
              }}
              className="p-1.5 rounded-full text-gray-500 hover:bg-gray-50 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close search"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 flex items-center gap-2 rounded-premium border border-[#0B1B2B] bg-gray-50 px-3 py-2">
              <Search size={14} className="text-[#0B1B2B] shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search for products..."
                className="flex-1 bg-transparent text-xs text-charcoal outline-none placeholder:text-gray-400"
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
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Suggestions List / Popular Searches */}
          <div className="flex-1 overflow-y-auto bg-white p-4">
            {searchQuery.trim().length > 0 ? (
              <div className="space-y-1">
                {suggestions.length > 0 ? (
                  suggestions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSearchSubmit(p.name)}
                      className="w-full flex items-center justify-between py-3 border-b border-gray-50 text-left active:bg-gray-50"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Search size={12} className="text-gray-300 shrink-0" />
                        <span className="text-xs text-charcoal font-semibold truncate">{p.name}</span>
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase shrink-0 ml-2">
                        {typeof p.category === 'object' ? p.category?.name : p.category}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400 font-bold">
                    No results for "{searchQuery}"
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                    Popular Searches
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCHES.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearchSubmit(term)}
                        className="px-3 py-1.5 bg-gray-50 rounded-full text-xs text-gray-600 font-bold hover:bg-[#0B1B2B]/10/50 hover:text-[#0B1B2B] transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {categories.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
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
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl text-xs font-semibold text-charcoal text-left active:bg-gray-100"
                        >
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
