import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import {
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  RefreshCcw,
  Terminal,
} from 'lucide-react';

/*
|--------------------------------------------------------------------------
| PRODUCTS PAGE — Mobile-first search results and browse
|
| Mobile layout:
|  ┌───────────────────────────────────────────────┐
|  │ [⊞ Filter]  [↕ Sort ▾]  [Price ▾]  · 24 items│
|  ├───────────────────────────────────────────────┤
|  │ Product grid (2 cols on mobile, 3-4 desktop)  │
|  ├───────────────────────────────────────────────┤
|  │ Pagination                                    │
|  └───────────────────────────────────────────────┘
|
| Filter opens as a BOTTOM SHEET on mobile (native-app feel)
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

export default function ProductsPage() {
  const {
    products,
    isProductsLoading,
    productsError,
    refetchProducts,
    rawApiResponse,
    isServerWakingUp,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useContext(AppContext);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);
  useEffect(() => { setCurrentPage(1); }, [selectedCategory]);

  const handleLocalSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const maxProductPrice = useMemo(() => {
    if (!products.length) return 5000;
    return Math.max(...products.map((p) => p.price));
  }, [products]);

  useEffect(() => {
    if (maxProductPrice > 0) setMaxPrice(maxProductPrice);
  }, [maxProductPrice]);

  const availableSubcategories = useMemo(() => {
    const subs = new Set();
    products.forEach((p) => {
      const pCatName = typeof p.category === 'object' ? p.category?.name : p.category;
      if ((selectedCategory === 'All' || pCatName === selectedCategory) && p.subcategory) {
        subs.add(p.subcategory);
      }
    });
    return Array.from(subs);
  }, [products, selectedCategory]);

  useEffect(() => { setSelectedSubcategories([]); }, [selectedCategory]);

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/s\b/g, '');
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const normQuery = normalizeText(searchQuery);
      const keywords = normQuery.split(' ').filter(Boolean);
      result = result.filter((product) => {
        const pCatName = typeof product.category === 'object' ? product.category?.name : product.category;
        let specsText = '';
        try {
          const parsed = typeof product.specifications === 'string'
            ? JSON.parse(product.specifications)
            : product.specifications;
          if (parsed && typeof parsed === 'object') {
            specsText = Object.entries(parsed).map(([k, v]) => `${k} ${v}`).join(' ');
          }
        } catch {}

        let highlightsText = '';
        try {
          const parsed = typeof product.highlights === 'string'
            ? JSON.parse(product.highlights)
            : product.highlights;
          if (Array.isArray(parsed)) highlightsText = parsed.join(' ');
        } catch {}

        const searchTarget = normalizeText([
          product.name, pCatName || '', product.subcategory || '',
          product.brand || product.seller || '', product.description || '',
          product.tagline || '', highlightsText, specsText,
          product.tags || '', product.sku || '', product.collections || '',
        ].join(' '));

        return keywords.every((kw) => searchTarget.includes(kw));
      });
    }

    if (selectedCategory !== 'All') {
      result = result.filter((p) => {
        const pCatName = typeof p.category === 'object' ? p.category?.name : p.category;
        return pCatName === selectedCategory;
      });
    }

    if (selectedSubcategories.length > 0) {
      result = result.filter((p) => selectedSubcategories.includes(p.subcategory));
    }

    result = result.filter((p) => p.price <= maxPrice);

    if (inStockOnly) result = result.filter((p) => p.inStock);

    if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === 'bestselling') result.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
    else if (sortBy === 'rated') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);

    return result;
  }, [products, searchQuery, selectedCategory, selectedSubcategories, maxPrice, inStockOnly, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredProducts, totalPages, currentPage]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const toggleSubcategory = (sub) => {
    setSelectedSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedSubcategories([]);
    setMaxPrice(maxProductPrice);
    setInStockOnly(false);
    setSelectedCategory('All');
    setSearchQuery('');
    setLocalSearch('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const activeFilterCount = [
    selectedSubcategories.length > 0,
    inStockOnly,
    maxPrice < maxProductPrice,
    selectedCategory !== 'All',
  ].filter(Boolean).length;

  const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'bestselling', label: 'Best Selling' },
    { value: 'rated', label: 'Highest Rated' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];

  /* ------------------------------------------------------------------
     SHARED FILTER PANEL CONTENT (used in desktop sidebar + mobile sheet)
  ------------------------------------------------------------------ */
  const FilterPanelContent = ({ onApply }) => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Categories */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#222222] mb-2.5">
            Categories
          </h4>
          <div className="space-y-1.5">
            {['All', ...categories.map((c) => c.name)].map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  selectedCategory === cat
                    ? 'bg-[#0B1B2B]/10 text-[#0B1B2B] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{cat === 'All' ? 'All Products' : cat}</span>
                {selectedCategory === cat && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Subcategories */}
        {availableSubcategories.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#222222] mb-2.5">
              Subcategories
            </h4>
            <div className="space-y-2">
              {availableSubcategories.map((sub) => (
                <label key={sub} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSubcategories.includes(sub)}
                    onChange={() => toggleSubcategory(sub)}
                    className="rounded border-gray-300 text-[#0B1B2B] focus:ring-[#0B1B2B] accent-[#0B1B2B]"
                  />
                  <span className="text-sm text-gray-600">{sub}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Price Range */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#222222]">
              Max Price
            </h4>
            <span className="text-sm font-bold text-[#0B1B2B]">₹{maxPrice.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min="0"
            max={maxProductPrice || 5000}
            value={maxPrice}
            onChange={(e) => { setMaxPrice(Number(e.target.value)); setCurrentPage(1); }}
            className="w-full accent-[#0B1B2B]"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
            <span>₹0</span>
            <span>₹{(maxProductPrice || 5000).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Availability */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#222222] mb-2.5">
            Availability
          </h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }}
              className="rounded border-gray-300 accent-[#0B1B2B]"
            />
            <span className="text-sm text-gray-600">In Stock Only</span>
          </label>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-100 p-4 flex gap-3">
        <button
          onClick={handleClearFilters}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Clear All
        </button>
        <button
          onClick={onApply}
          className="flex-1 py-2.5 bg-[#0B1B2B] rounded-xl text-sm font-semibold text-white hover:bg-[#071320]"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-[#f8f8f8] page-content-mobile">

      {/* ============================================================
          STICKY TOP FILTER BAR WITH CATEGORY SWITCHER (mobile-first)
      ============================================================ */}
      <div className="relative bg-white border-b border-gray-100 z-30">
        {/* Category Scroller Switcher */}
        <div className="category-scroller px-3 pt-2 pb-1 bg-white">
          {/* "All" chip */}
          <button
            onClick={() => {
              setSelectedCategory('All');
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
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setSearchQuery('');
                }}
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

        {/* Filter and Sort Row (Below Category Switch) */}
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 bg-white">
          {/* Mobile Filter / Sort chips row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full md:w-auto">
            {/* Filter button */}
            <button
              onClick={() => setShowFilterSheet(true)}
              className={`flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors md:hidden ${
                activeFilterCount > 0
                  ? 'border-[#0B1B2B] bg-[#0B1B2B]/10 text-[#0B1B2B]'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <Filter size={12} />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0B1B2B] text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort button */}
            <button
              onClick={() => setShowSortSheet(true)}
              className="flex items-center gap-1.5 shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-600 md:hidden"
            >
              <ArrowUpDown size={12} />
              Sort
            </button>

            {/* Subtle product count display */}
            <span className="text-[10px] text-gray-500 font-bold shrink-0 bg-gray-100/70 px-2.5 py-1.5 rounded-full">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </span>

            {/* Active filter chips (mobile/desktop unified) */}
            {searchQuery && (
              <span className="flex items-center gap-1 shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                "{searchQuery}"
                <button onClick={() => { setSearchQuery(''); setLocalSearch(''); }}>
                  <X size={10} className="text-gray-400" />
                </button>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="flex items-center gap-1 shrink-0 rounded-full bg-[#0B1B2B]/10 px-2.5 py-1 text-[10px] font-bold text-[#0B1B2B]">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('All')}>
                  <X size={10} />
                </button>
              </span>
            )}
            {inStockOnly && (
              <span className="flex items-center gap-1 shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-600">
                In Stock
                <button onClick={() => setInStockOnly(false)}>
                  <X size={10} />
                </button>
              </span>
            )}
          </div>

          {/* Desktop sort / reset filters (visible md+) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ArrowUpDown size={13} />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-bold text-[#222222] outline-none cursor-pointer border-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-red-500 font-semibold hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          MAIN CONTENT
      ============================================================ */}
      <div className="flex gap-5 max-w-7xl mx-auto px-2 py-4 md:px-6 items-start">

        {/* DESKTOP SIDEBAR FILTER */}
        <aside className="hidden md:block w-56 shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm sticky top-44">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#222222] flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-[#0B1B2B]" />
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-[10px] text-red-500 font-semibold hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          <FilterPanelContent onApply={() => {}} />
        </aside>

        {/* PRODUCT GRID */}
        <div className="flex-1 min-w-0">
          {/* 1. LOADING STATE */}
          {isProductsLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-xs">
                <RefreshCcw size={15} className="animate-spin text-amber-600 shrink-0" />
                <span>
                  {isServerWakingUp
                    ? 'Waking up the server, this may take a moment...'
                    : 'Fetching products...'}
                </span>
              </div>
              <div className="product-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl shadow-sm border border-[#EDEDED] overflow-hidden">
                    <div className="aspect-square w-full bg-gray-200"></div>
                    <div className="p-3 min-h-[140px] flex flex-col justify-start">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/3 mt-auto"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : productsError ? (
            /* 2. ERROR STATE (with Retry Button & Debug Banner) */
            <div className="space-y-3">
              <div className="text-center py-12 px-4 border border-red-200 rounded-xl bg-red-50/90 shadow-sm">
                <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
                <h3 className="text-sm font-bold text-red-900">Failed to Load Products</h3>
                <p className="text-xs text-red-700 mt-1 max-w-sm mx-auto">
                  {productsError}
                </p>
                <p className="text-[11px] text-gray-500 mt-2 max-w-xs mx-auto">
                  Render free tier instances sleep after 15 minutes of inactivity. Please allow a few seconds and try again.
                </p>
                <button
                  onClick={() => refetchProducts()}
                  className="mt-4 inline-flex items-center gap-2 bg-[#0B1B2B] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#122b44] transition-colors shadow-sm cursor-pointer"
                  style={{ minHeight: 44 }}
                >
                  <RefreshCcw size={14} />
                  Retry Loading
                </button>
              </div>

              {/* Debug Banner showing raw API response */}
              {rawApiResponse && (
                <div className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 p-3.5 text-xs font-mono shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Terminal size={14} /> Raw API Debug Response (/products)
                    </span>
                    <span className="text-[10px] text-slate-400">{rawApiResponse.timestamp}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div><span className="text-slate-400">Status:</span> <span className={rawApiResponse.error ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{rawApiResponse.status} ({rawApiResponse.statusText})</span></div>
                    <div><span className="text-slate-400">Duration:</span> {rawApiResponse.durationMs}ms</div>
                    <div><span className="text-slate-400">Is Array:</span> {Array.isArray(rawApiResponse.data) ? 'Yes' : 'No'}</div>
                    <div><span className="text-slate-400">Items:</span> {Array.isArray(rawApiResponse.data) ? rawApiResponse.data.length : 'N/A'}</div>
                  </div>
                  {rawApiResponse.error && (
                    <div className="text-red-300 bg-red-950/60 p-2 rounded border border-red-800 text-[11px] overflow-x-auto">
                      Error Detail: {rawApiResponse.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : filteredProducts.length === 0 ? (
            /* 3. EMPTY STATE (Only shown when API fetch succeeded AND product array is empty or no filter match) */
            <div className="space-y-3">
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white shadow-xs">
                <SlidersHorizontal size={36} className="mx-auto mb-3 text-gray-300" />
                <h3 className="text-sm font-bold text-[#222222]">No Products Found</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  {activeFilterCount > 0 || localSearch
                    ? 'Try relaxing your filters or search for something else.'
                    : 'There are currently no active products in the database.'}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 bg-[#0B1B2B] text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer"
                    style={{ minHeight: 44 }}
                  >
                    Reset All Filters
                  </button>
                )}
              </div>

              {/* Debug Banner showing raw API response */}
              {rawApiResponse && (
                <div className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 p-3.5 text-xs font-mono shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Terminal size={14} /> Raw API Debug Response (/products)
                    </span>
                    <span className="text-[10px] text-slate-400">{rawApiResponse.timestamp}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-slate-400">Status:</span> <span className="text-green-400 font-bold">{rawApiResponse.status} ({rawApiResponse.statusText})</span></div>
                    <div><span className="text-slate-400">Duration:</span> {rawApiResponse.durationMs}ms</div>
                    <div><span className="text-slate-400">Is Array:</span> {Array.isArray(rawApiResponse.data) ? 'Yes' : 'No'}</div>
                    <div><span className="text-slate-400">Returned Items:</span> {Array.isArray(rawApiResponse.data) ? rawApiResponse.data.length : 0} items</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 4. SUCCESS STATE */
            <>
              <div className="product-grid">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage((p) => Math.max(p - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:border-[#0B1B2B] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let page;
                    if (totalPages <= 7) page = i + 1;
                    else if (currentPage <= 4) page = i + 1;
                    else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                    else page = currentPage - 3 + i;
                    return (
                      <button
                        key={page}
                        onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`h-9 w-9 rounded-lg text-xs font-semibold border transition ${
                          currentPage === page
                            ? 'bg-[#0B1B2B] border-[#0B1B2B] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-[#0B1B2B]'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage((p) => Math.min(p + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:border-[#0B1B2B] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================================
          MOBILE FILTER BOTTOM SHEET
      ============================================================ */}
      {showFilterSheet && (
        <>
          <div
            className="filter-sheet-overlay md:hidden"
            onClick={() => setShowFilterSheet(false)}
          />
          <div className="filter-sheet md:hidden" style={{ maxHeight: '80vh' }}>
            {/* Sheet handle */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-[#222222] flex items-center gap-2">
                <Filter size={15} className="text-[#0B1B2B]" />
                Filter Products
              </h3>
              <button
                onClick={() => setShowFilterSheet(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <FilterPanelContent onApply={() => setShowFilterSheet(false)} />
          </div>
        </>
      )}

      {/* ============================================================
          MOBILE SORT BOTTOM SHEET
      ============================================================ */}
      {showSortSheet && (
        <>
          <div
            className="filter-sheet-overlay md:hidden"
            onClick={() => setShowSortSheet(false)}
          />
          <div className="filter-sheet md:hidden" style={{ maxHeight: '55vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-[#222222]">Sort By</h3>
              <button
                onClick={() => setShowSortSheet(false)}
                className="p-1 rounded-full text-gray-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    setCurrentPage(1);
                    setShowSortSheet(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                    sortBy === option.value
                      ? 'bg-[#0B1B2B]/10 text-[#0B1B2B] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
