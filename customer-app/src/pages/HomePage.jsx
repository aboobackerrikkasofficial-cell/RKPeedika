import React, { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import { ShoppingBag, ChevronRight } from 'lucide-react';

/*
|--------------------------------------------------------------------------
| HOME PAGE — Mobile-First Layout
|
| Structure:
|  1. Compact hero banner (80-120px height max)
|  2. Category chips (horizontal scroll)
|  3. 2-Column Product Grid
|--------------------------------------------------------------------------
*/

export default function HomePage() {
  const {
    products,
    searchQuery,
    selectedCategory,
    setCurrentView,
  } = useContext(AppContext);

  /* ------------------------------------------------------------------
     NORMALIZE + FILTER
  ------------------------------------------------------------------ */
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text).toLowerCase().trim().replace(/\s+/g, ' ').replace(/s\b/g, '');
  };

  const parseJson = (value, fallback = null) => {
    if (!value) return fallback;
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const normalizedQuery = normalizeText(searchQuery);
    const keywords = normalizedQuery.split(' ').filter(Boolean);

    return products.filter((product) => {
      if (!product || product.status !== 'active') return false;
      const categoryName =
        typeof product.category === 'object'
          ? product.category?.name || ''
          : product.category || '';

      if (selectedCategory !== 'All' && categoryName !== selectedCategory) return false;
      if (!normalizedQuery) return true;

      const parsedSpecifications = parseJson(product.specifications, {});
      let specificationsText = '';
      if (parsedSpecifications && typeof parsedSpecifications === 'object' && !Array.isArray(parsedSpecifications)) {
        specificationsText = Object.entries(parsedSpecifications).map(([k, v]) => `${k} ${v}`).join(' ');
      }

      const parsedHighlights = parseJson(product.highlights, []);
      const highlightsText = Array.isArray(parsedHighlights) ? parsedHighlights.join(' ') : '';

      const searchTarget = normalizeText(
        [
          product.name, categoryName, product.subcategory, product.brand,
          product.seller, product.description, product.tagline,
          highlightsText, specificationsText, product.tags, product.sku, product.collections,
        ].filter(Boolean).join(' ')
      );

      return keywords.every((keyword) => searchTarget.includes(keyword));
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-[#f8f8f8] page-content-mobile pb-6 pt-1">

      {/* ============================================================
          CATEGORY CHIPS
      ============================================================ */}
      <CategoryList />

      {/* ============================================================
          PRODUCTS SECTION
      ============================================================ */}
      <section className="mt-2">
        <div className="section-heading px-3 md:px-6">
          <h2 className="text-sm font-extrabold text-charcoal tracking-wide uppercase">
            {selectedCategory !== 'All' ? selectedCategory : 'All Products'}
          </h2>
          <button
            onClick={() => setCurrentView('products')}
            className="flex items-center gap-0.5 text-xs text-[#f7941d] font-bold"
          >
            See all <ChevronRight size={12} />
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="mx-3 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
            <ShoppingBag size={32} className="mx-auto mb-2 text-gray-300" />
            <h4 className="text-sm font-bold text-[#222222]">No Products Found</h4>
            <p className="mt-1 text-xs text-gray-400">
              Try a different search or browse a category.
            </p>
          </div>
        ) : (
          <div className="px-3 md:px-6">
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}