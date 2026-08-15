import React, { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import CategoryList from '../components/CategoryList';
import MultilingualMarquee from '../components/MultilingualMarquee';
import TrustStrip from '../components/TrustStrip';
import ProductCard from '../components/ProductCard';
import { ShoppingBag, ChevronRight, Zap, Package, ShieldCheck, Truck } from 'lucide-react';

/*
|--------------------------------------------------------------------------
| HOME PAGE — Mobile-First Layout
|
| Structure (mobile-first order):
|  1. Multilingual marquee (offer strip)
|  2. Compact hero banner (mobile: 35vw tall, desktop: 280px)
|  3. Category chips (horizontal scroll)
|  4. Trust strip (horizontal scroll, compact)
|  5. Featured Products section (2-col grid)
|  6. View all button
|  7. Promo cards (3 value proposition cards)
|--------------------------------------------------------------------------
*/

export default function HomePage() {
  const {
    products,
    searchQuery,
    selectedCategory,
    setCurrentView,
    recentlyViewed,
    setSelectedProductId,
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
      if (!product) return false;
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

  // Featured: first 6 products from filtered set
  const featuredProducts = filteredProducts.slice(0, 6);
  // Best sellers: high-rated products (different slice)
  const bestSellers = filteredProducts
    .filter(p => (p.rating || 0) >= 4 || (p.purchaseCount || 0) > 50)
    .slice(0, 6);
  // Recently viewed
  const recentProducts = products
    .filter(p => recentlyViewed?.includes(p.id))
    .slice(0, 4);

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-[#f8f8f8] page-content-mobile">

      {/* ============================================================
          OFFER MARQUEE
      ============================================================ */}
      <MultilingualMarquee />

      {/* ============================================================
          COMPACT HERO BANNER (mobile-friendly)
          - On mobile: max 38vw tall (shows content quickly)
          - On desktop: taller with more content visible
      ============================================================ */}
      <section className="relative w-full overflow-hidden bg-gray-800" style={{ height: 'clamp(140px, 38vw, 260px)' }}>
        <img
          src="/images/hero_banner.jpg"
          alt="RK Peedika — Premium Indian Shopping"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />

        {/* Hero content */}
        <div className="relative flex h-full flex-col justify-center px-4 md:px-10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={10} className="text-[#f7941d] fill-current" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#f7941d]">
              Trending Now
            </span>
          </div>
          <h1 className="text-sm md:text-2xl font-extrabold leading-tight tracking-tight text-white max-w-[220px] md:max-w-md">
            Everything You Need.{' '}
            <span className="text-[#f7941d]">Delivered.</span>
          </h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['✓ COD Available', '⚡ Fast Delivery', '★ 4.9 Rating'].map((badge) => (
              <span
                key={badge}
                className="rounded border border-white/10 bg-white/10 px-2 py-0.5 text-[8px] md:text-[10px] font-semibold text-white"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CATEGORY CHIPS
      ============================================================ */}
      <CategoryList />

      {/* ============================================================
          TRUST STRIP (compact horizontal scroll)
      ============================================================ */}
      <div className="bg-white border-b border-gray-100">
        <div className="trust-strip">
          {[
            { icon: <ShieldCheck size={14} className="text-[#f7941d]" />, text: 'Secure Checkout' },
            { icon: <Package size={14} className="text-[#f7941d]" />, text: 'COD Available' },
            { icon: <Truck size={14} className="text-[#f7941d]" />, text: 'Fast Delivery' },
            { icon: <ShieldCheck size={14} className="text-[#f7941d]" />, text: '3-Day Exchange' },
            { icon: <Package size={14} className="text-[#f7941d]" />, text: 'Verified Products' },
          ].map((item) => (
            <div key={item.text} className="trust-item">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          FEATURED PRODUCTS SECTION
      ============================================================ */}
      <section>
        <div className="section-heading">
          <h2>
            {selectedCategory !== 'All' ? selectedCategory : 'Featured Products'}
          </h2>
          <button
            onClick={() => setCurrentView('products')}
            className="flex items-center gap-0.5"
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
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setCurrentView('products')}
                className="flex items-center gap-2 rounded-xl bg-[#f7941d] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e07d10] active:bg-[#e07d10]"
                style={{ minHeight: 44 }}
              >
                View All Products
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================
          BEST SELLERS SECTION (only if different from featured)
      ============================================================ */}
      {bestSellers.length > 0 && searchQuery === '' && (
        <section className="mt-4">
          <div className="section-heading">
            <h2>⭐ Best Sellers</h2>
            <button
              onClick={() => setCurrentView('products')}
              className="flex items-center gap-0.5"
            >
              See all <ChevronRight size={12} />
            </button>
          </div>
          <div className="px-3 md:px-6">
            <div className="product-grid">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          RECENTLY VIEWED (if any)
      ============================================================ */}
      {recentProducts.length > 0 && (
        <section className="mt-4">
          <div className="section-heading">
            <h2>Recently Viewed</h2>
          </div>
          <div className="px-3 md:px-6">
            <div className="product-grid">
              {recentProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          TRUST / VALUE CARDS
      ============================================================ */}
      <section className="mt-5 px-3 md:px-6 pb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              tag: 'Quality Assured',
              tagColor: 'amber',
              title: 'Verified Sellers',
              desc: 'We carefully vet all our sellers to ensure you receive only high-quality products for your daily needs.',
              img: '/images/verified_sellers.jpg',
              bg: 'bg-amber-50',
            },
            {
              tag: 'Fast Dispatch',
              tagColor: 'orange',
              title: 'Quick Fulfillment',
              desc: 'Orders are packed securely and dispatched from our fulfillment hubs quickly for fast delivery.',
              img: '/images/quick_fulfillment_hub.jpg',
              bg: 'bg-orange-50',
            },
            {
              tag: 'Secure Trust',
              tagColor: 'emerald',
              title: 'Trusted Marketplace',
              desc: 'Direct from trusted Indian sellers, guaranteeing premium quality products and a safe shopping experience.',
              img: '/images/promo_indian_market.jpg',
              bg: 'bg-emerald-50',
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`flex items-center justify-between rounded-xl border border-gray-100 p-4 ${card.bg}`}
            >
              <div className="min-w-0 max-w-[70%]">
                <span className={`rounded bg-${card.tagColor}-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-${card.tagColor}-600`}>
                  {card.tag}
                </span>
                <h4 className="mt-1.5 text-[13px] font-extrabold tracking-tight text-[#222222]">
                  {card.title}
                </h4>
                <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">
                  {card.desc}
                </p>
              </div>
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-orange-100 bg-white shadow-sm ml-3">
                <img
                  src={card.img}
                  alt={card.title}
                  loading="lazy"
                  decoding="async"
                  className="block h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}