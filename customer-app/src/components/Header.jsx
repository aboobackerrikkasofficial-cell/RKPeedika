import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Search, 
  Mic, 
  Heart, 
  ShoppingBag, 
  User, 
  MapPin, 
  ChevronDown, 
  X,
  Volume2,
  CheckCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

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
    couponConfig,
    products,
    storeSettings,
    userProfile,
    categories,
    showToast
  } = useContext(AppContext);

  // Modals state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 0 && currentView !== 'products' && currentView !== 'product') {
      setCurrentView('products');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300">
        {/* Top Info Bar */}
        {storeSettings.announcementBar && (
          <div className="w-full bg-[#1C1917] px-4 py-1.5 text-center text-xs font-medium text-white tracking-wide">
            {storeSettings.announcementBar}
          </div>
        )}

        {/* Main Header Row */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          
          {/* Logo Section */}
          <div 
            onClick={() => { setCurrentView('home'); setSelectedCategory('All'); setSearchQuery(''); }}
            className="flex cursor-pointer items-center space-x-2"
          >
            <span className="text-2xl font-extrabold tracking-tight text-charcoal">
              {storeSettings?.storeName || "RK Peedika"}
            </span>
            <span className="hidden text-[10px] uppercase font-semibold text-gray-400 tracking-widest md:inline-block pt-1.5 pl-1.5 border-l border-gray-200">
              Smart Shopping for Everyday Needs
            </span>
          </div>

          {/* Search bar container */}
          <div className="mx-4 hidden max-w-lg flex-1 items-center rounded-premium border border-gray-200 bg-gray-50 px-3 py-1.5 transition-all focus-within:border-[#F7941D] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#F7941D]/20 md:flex relative">
            <button onClick={() => setCurrentView('products')} className="focus:outline-none">
              <Search className="h-4 w-4 text-gray-400 hover:text-[#F7941D] transition" />
            </button>
            <input 
              type="text" 
              placeholder="Search for daily essentials, gadgets, and more..."
              className="w-full bg-transparent px-3 text-sm text-charcoal outline-none placeholder:text-gray-400"
              value={searchQuery}
              onChange={(e) => {
                handleSearchChange(e);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrentView('products');
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                className="p-1 hover:bg-gray-200 rounded-full transition text-gray-400 hover:text-gray-600 focus:outline-none mr-1"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-premium rounded-premium overflow-hidden z-50">
                {products.filter(p => {
                  const q = searchQuery.toLowerCase();
                  const catName = typeof p.category === 'object' ? (p.category?.name || '') : (p.category || '');
                  // Search across: name, category, description, brand/seller, tags, specifications, collections
                  const searchFields = [
                    p.name || '',
                    catName,
                    p.description || '',
                    p.brand || p.seller || '',
                    p.tagline || '',
                    p.tags || '',
                    p.collections || '',
                    p.subcategory || '',
                    p.sku || ''
                  ];
                  // Parse specifications if JSON string
                  try {
                    const specs = typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications;
                    if (specs && typeof specs === 'object') {
                      searchFields.push(Object.entries(specs).map(([k,v]) => `${k} ${v}`).join(' '));
                    }
                  } catch (e) {}
                  // Parse highlights if JSON string
                  try {
                    const highlights = typeof p.highlights === 'string' ? JSON.parse(p.highlights) : p.highlights;
                    if (Array.isArray(highlights)) searchFields.push(highlights.join(' '));
                  } catch (e) {}
                  return searchFields.some(field => field.toLowerCase().includes(q));
                }).slice(0, 5).map(p => (
                  <div key={p.id} onClick={() => { setSearchQuery(p.name); setShowSuggestions(false); setCurrentView('products'); }} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-charcoal border-b border-gray-50 last:border-0 flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{typeof p.category === 'object' ? p.category?.name : p.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location and Badges Action Center */}
          <div className="flex items-center space-x-3 md:space-x-6">
            
            {/* Location Selector Removed */}
            {/* Actions: Wishlist & Profile & Cart */}
            <div className="flex items-center space-x-1 md:space-x-3">
              
              {/* Wishlist */}
              <button 
                onClick={() => {
                  if (!userProfile) {
                    showToast('⚠ Please log in to use Wishlist', 'warning');
                  } else {
                    setCurrentView("wishlist");
                  }
                }}
                className={`relative rounded-full p-2 hover:bg-gray-50 hover:text-red-500 transition-premium ${currentView === 'wishlist' ? 'text-red-500 bg-red-50' : 'text-gray-600'}`}
                title="Wishlist"
              >
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F7941D] text-[9px] font-bold text-white ring-2 ring-white">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Customer Account Profile Icon */}
              <button 
                onClick={() => setCurrentView('profile')}
                className={`relative rounded-full p-2 text-gray-600 hover:bg-gray-50 hover:text-[#F7941D] transition-premium ${currentView === 'profile' ? 'text-[#F7941D] bg-orange-50' : ''}`}
                title="My Account"
              >
                <User className="h-5 w-5" />
              </button>

              {/* Cart Toggle */}
              <button 
                onClick={() => setCurrentView('checkout')}
                className="relative flex items-center space-x-1.5 rounded-premium bg-[#F7941D] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#E07D10] transition-premium"
                title="Cart / Checkout"
              >
                <ShoppingBag className="h-4.5 w-4.5" />
                <span className="hidden md:inline">Checkout</span>
                {cart.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#F7941D] shadow-sm ml-0.5">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Categories secondary Menu */}
        {currentView !== 'profile' && (
          <nav className="border-t border-gray-100 bg-white">
            <div className="mx-auto flex max-w-7xl items-center space-x-8 px-4 py-2.5 text-sm md:px-8 overflow-x-auto no-scrollbar">
              {['All', ...categories.map(c => c.name)].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSearchQuery("");
                    if (currentView !== 'products') setCurrentView('products');
                  }}
                  className={`whitespace-nowrap pb-0.5 font-medium transition-premium border-b-2 ${
                    selectedCategory === cat 
                      ? 'text-[#F7941D] border-[#F7941D] font-semibold' 
                      : 'text-gray-500 border-transparent hover:text-charcoal hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
              
              {/* Small mobile search field inside nav */}
              <div className="flex-1 md:hidden"></div>
              <div className="flex items-center space-x-1 text-xs text-gray-400 font-medium whitespace-nowrap pl-4 border-l border-gray-200">
                <ShieldCheck className="h-3.5 w-3.5 text-[#F7941D]" />
                <span>100% Verified Sellers</span>
              </div>
            </div>
          </nav>
        )}
      </header>


    </>
  );
}
