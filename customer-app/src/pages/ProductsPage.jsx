import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { Filter, ChevronDown, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function ProductsPage() {
  const { 
    products, 
    categories, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory,
    currentView
  } = useContext(AppContext);

  // Filters State
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // newest | bestselling | rated | price-asc | price-desc
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const ITEMS_PER_PAGE = 8;

  // Sync local search input with global context search
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Sync category state when changed from header
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Handle local typing search changes (debounced globally, but instantly local)
  const handleLocalSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    setSearchQuery(val); // Context will debounce this
    setCurrentPage(1);
  };

  // Get dynamic price range limits from active products
  const maxProductPrice = useMemo(() => {
    if (products.length === 0) return 5000;
    return Math.max(...products.map(p => p.price));
  }, [products]);

  useEffect(() => {
    if (maxProductPrice > 0) {
      setMaxPrice(maxProductPrice);
    }
  }, [maxProductPrice]);

  // Extract subcategories from products based on selected category
  const availableSubcategories = useMemo(() => {
    const subs = new Set();
    products.forEach(p => {
      const pCatName = typeof p.category === 'object' ? p.category?.name : p.category;
      if ((selectedCategory === 'All' || pCatName === selectedCategory) && p.subcategory) {
        subs.add(p.subcategory);
      }
    });
    return Array.from(subs);
  }, [products, selectedCategory]);

  // Reset subcategory selection when category changes
  useEffect(() => {
    setSelectedSubcategories([]);
  }, [selectedCategory]);

  // Normalization for production-grade search
  const normalizeText = (text) => {
    if (!text) return "";
    return text.toLowerCase().trim().replace(/\s+/g, " ").replace(/s\b/g, "");
  };

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search Query filter (matches against name, desc, brand, specs, tags, etc.)
    if (searchQuery.trim()) {
      const normQuery = normalizeText(searchQuery);
      const keywords = normQuery.split(" ").filter(Boolean);

      result = result.filter(product => {
        const pCatName = typeof product.category === 'object' ? product.category?.name : product.category;
        
        let specsText = "";
        try {
          const parsed = typeof product.specifications === 'string' 
            ? JSON.parse(product.specifications) 
            : product.specifications;
          if (parsed && typeof parsed === 'object') {
            specsText = Object.entries(parsed).map(([k, v]) => `${k} ${v}`).join(" ");
          }
        } catch (e) {}

        let highlightsText = "";
        try {
          const parsed = typeof product.highlights === 'string' 
            ? JSON.parse(product.highlights) 
            : product.highlights;
          if (Array.isArray(parsed)) highlightsText = parsed.join(" ");
        } catch (e) {}

        const searchTarget = normalizeText([
          product.name,
          pCatName || "",
          product.subcategory || "",
          product.brand || product.seller || "",
          product.description || "",
          product.tagline || "",
          highlightsText,
          specsText,
          product.tags || "",
          product.sku || "",
          product.collections || ""
        ].join(" "));

        return keywords.every(kw => searchTarget.includes(kw));
      });
    }

    // 2. Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(product => {
        const pCatName = typeof product.category === 'object' ? product.category?.name : product.category;
        return pCatName === selectedCategory;
      });
    }

    // 3. Subcategory filter
    if (selectedSubcategories.length > 0) {
      result = result.filter(product => selectedSubcategories.includes(product.subcategory));
    }

    // 4. Price range filter
    result = result.filter(product => product.price <= maxPrice);

    // 5. Availability filter
    if (inStockOnly) {
      result = result.filter(product => product.inStock);
    }

    // 6. Sorting Logic
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'bestselling') {
      result.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
    } else if (sortBy === 'rated') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedSubcategories, maxPrice, inStockOnly, sortBy]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  
  // Adjust currentPage if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredProducts, totalPages, currentPage]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const toggleSubcategory = (sub) => {
    setSelectedSubcategories(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 font-sans">
      
      {/* Header section with category title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-charcoal tracking-tight">{selectedCategory === 'All' ? 'Our Marketplace' : selectedCategory}</h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">Showing {filteredProducts.length} premium Indian goods matching filters</p>
        </div>

        {/* Sorting controls & Toggle mobile filter */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMobileFilters(true)}
            className="flex md:hidden items-center gap-1.5 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-charcoal hover:border-[#F7941D]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#F7941D]" /> Filter
          </button>
          
          <div className="flex items-center gap-2 border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <select 
              value={sortBy} 
              onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }} 
              className="bg-transparent text-xs font-bold text-charcoal outline-none border-none cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="bestselling">Sort: Best Selling</option>
              <option value="rated">Sort: Highest Rated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-8 relative items-start">
        
        {/* SIDEBAR FILTER PANEL - Desktop */}
        <aside className="w-64 hidden md:block shrink-0 bg-white border border-gray-100 rounded-xl p-5 space-y-6 shadow-sm sticky top-28">
          
          {/* Active category details */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-charcoal mb-3 flex items-center justify-between">
              <span>Categories</span>
              {(selectedCategory !== 'All' || searchQuery) && (
                <button onClick={handleClearFilters} className="text-[10px] text-red-500 font-bold hover:underline">Reset</button>
              )}
            </h3>
            <ul className="space-y-2 text-xs font-semibold text-gray-500">
              <li 
                onClick={() => setSelectedCategory('All')} 
                className={`cursor-pointer hover:text-[#F7941D] flex items-center justify-between ${selectedCategory === 'All' ? 'text-[#F7941D] font-bold' : ''}`}
              >
                <span>All Products</span>
              </li>
              {categories.map(cat => (
                <li 
                  key={cat.id} 
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`cursor-pointer hover:text-[#F7941D] flex items-center justify-between ${selectedCategory === cat.name ? 'text-[#F7941D] font-bold' : ''}`}
                >
                  <span>{cat.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Subcategories (if available) */}
          {availableSubcategories.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-charcoal mb-3">Subcategories</h3>
              <div className="space-y-2.5">
                {availableSubcategories.map(sub => (
                  <label key={sub} className="flex items-center space-x-2 text-xs font-semibold text-gray-500 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedSubcategories.includes(sub)} 
                      onChange={() => toggleSubcategory(sub)}
                      className="rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]" 
                    />
                    <span>{sub}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-charcoal mb-3 flex justify-between">
              <span>Max Price</span>
              <span className="text-[#F7941D] font-black">₹{maxPrice}</span>
            </h3>
            <input 
              type="range" 
              min="0" 
              max={maxProductPrice || 5000} 
              value={maxPrice} 
              onChange={e => { setMaxPrice(Number(e.target.value)); setCurrentPage(1); }}
              className="w-full accent-[#F7941D]" 
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
              <span>₹0</span>
              <span>₹{maxProductPrice || 5000}</span>
            </div>
          </div>

          {/* Availability checkbox */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-charcoal mb-3">Stock Status</h3>
            <label className="flex items-center space-x-2 text-xs font-semibold text-gray-500 cursor-pointer">
              <input 
                type="checkbox" 
                checked={inStockOnly} 
                onChange={e => { setInStockOnly(e.target.checked); setCurrentPage(1); }} 
                className="rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </aside>

        {/* PRODUCTS GRID & LISTING AREA */}
        <div className="flex-1 space-y-6">
          
          {/* Active Search & Filters badges */}
          {(selectedSubcategories.length > 0 || inStockOnly || maxPrice < maxProductPrice || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
              <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider mr-1">Active filters:</span>
              
              {searchQuery && (
                <span className="bg-white border border-gray-200 px-2.5 py-1 rounded-full text-charcoal font-semibold flex items-center gap-1.5 shadow-sm">
                  Search: "{searchQuery}" <X onClick={() => { setSearchQuery(''); setLocalSearch(''); }} className="h-3 w-3 text-red-500 cursor-pointer" />
                </span>
              )}
              {selectedSubcategories.map(sub => (
                <span key={sub} className="bg-white border border-gray-200 px-2.5 py-1 rounded-full text-charcoal font-semibold flex items-center gap-1.5 shadow-sm">
                  {sub} <X onClick={() => toggleSubcategory(sub)} className="h-3 w-3 text-red-500 cursor-pointer" />
                </span>
              ))}
              {inStockOnly && (
                <span className="bg-white border border-gray-200 px-2.5 py-1 rounded-full text-charcoal font-semibold flex items-center gap-1.5 shadow-sm">
                  In Stock Only <X onClick={() => setInStockOnly(false)} className="h-3 w-3 text-red-500 cursor-pointer" />
                </span>
              )}
              {maxPrice < maxProductPrice && (
                <span className="bg-white border border-gray-200 px-2.5 py-1 rounded-full text-charcoal font-semibold flex items-center gap-1.5 shadow-sm">
                  Max: ₹{maxPrice} <X onClick={() => setMaxPrice(maxProductPrice)} className="h-3 w-3 text-red-500 cursor-pointer" />
                </span>
              )}

              <button 
                onClick={handleClearFilters}
                className="text-red-500 font-bold hover:underline ml-auto pl-2 text-[11px]"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Main Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-gray-200 rounded-premium bg-white">
              <SlidersHorizontal className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-charcoal">No Products Match Filters</h3>
              <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">Try relaxing your search terms, categories, or price slider parameters.</p>
              <button 
                onClick={handleClearFilters}
                className="mt-4 bg-[#F7941D] hover:bg-[#E07D10] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow shadow-orange-500/10 min-h-[40px]"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* PAGINATION SECTION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-3 pt-8 border-t border-gray-50">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 border border-gray-200 rounded-xl text-charcoal hover:border-[#F7941D] hover:bg-orange-50/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 w-9 rounded-xl text-xs font-bold border transition ${
                    currentPage === page
                      ? 'bg-[#F7941D] border-[#F7941D] text-white shadow-sm'
                      : 'border-gray-200 text-charcoal hover:border-[#F7941D]'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 border border-gray-200 rounded-xl text-charcoal hover:border-[#F7941D] hover:bg-orange-50/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE DRAWER FILTERS MODAL */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm md:hidden">
          <div className="w-80 bg-white h-full p-6 space-y-6 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-sm font-black uppercase tracking-wider text-charcoal flex items-center gap-1">
                  <Filter className="h-4 w-4 text-[#F7941D]" /> Filter Options
                </h3>
                <button onClick={() => setShowMobileFilters(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Categories list in Mobile */}
              <div className="pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">Categories</h4>
                <ul className="space-y-2 text-xs font-semibold text-gray-500">
                  <li 
                    onClick={() => { setSelectedCategory('All'); setCurrentPage(1); }} 
                    className={`cursor-pointer ${selectedCategory === 'All' ? 'text-[#F7941D] font-bold' : ''}`}
                  >
                    All Products
                  </li>
                  {categories.map(cat => (
                    <li 
                      key={cat.id} 
                      onClick={() => { setSelectedCategory(cat.name); setCurrentPage(1); }}
                      className={`cursor-pointer ${selectedCategory === cat.name ? 'text-[#F7941D] font-bold' : ''}`}
                    >
                      {cat.name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Subcategories in Mobile */}
              {availableSubcategories.length > 0 && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">Subcategories</h4>
                  <div className="space-y-2.5">
                    {availableSubcategories.map(sub => (
                      <label key={sub} className="flex items-center space-x-2 text-xs font-semibold text-gray-500 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedSubcategories.includes(sub)} 
                          onChange={() => toggleSubcategory(sub)}
                          className="rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]" 
                        />
                        <span>{sub}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price slider in Mobile */}
              <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                <div className="flex justify-between text-xs font-bold text-charcoal">
                  <span>Max Price</span>
                  <span className="text-[#F7941D]">₹{maxPrice}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={maxProductPrice || 5000} 
                  value={maxPrice} 
                  onChange={e => { setMaxPrice(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full accent-[#F7941D]" 
                />
              </div>

              {/* Stock Status in Mobile */}
              <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">Stock Status</h4>
                <label className="flex items-center space-x-2 text-xs font-semibold text-gray-500 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={inStockOnly} 
                    onChange={e => { setInStockOnly(e.target.checked); setCurrentPage(1); }} 
                    className="rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            </div>

            <button 
              onClick={() => setShowMobileFilters(false)}
              className="w-full bg-[#F7941D] hover:bg-[#E07D10] text-white py-3 rounded-xl text-xs font-bold transition shadow shadow-orange-500/10 min-h-[44px]"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
