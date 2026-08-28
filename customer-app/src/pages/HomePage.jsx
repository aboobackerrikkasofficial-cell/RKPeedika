import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import { ShoppingBag, ChevronRight, Gift, ShieldCheck, Truck, AlertCircle, RefreshCcw, Terminal } from 'lucide-react';

const BANNERS = [
  {
    id: 1,
    title: "Kitchen & Home Essentials",
    subtitle: "Up to 60% OFF",
    badge: "Free Delivery + COD",
    image: "/images/category_kitchen.jpg",
    bgColor: "bg-gradient-to-r from-[#0B1B2B] to-[#128a79]",
  },
  {
    id: 2,
    title: "Problem Solving Gadgets",
    subtitle: "Under ₹499 Only",
    badge: "7 Days Easy Exchange",
    image: "/images/category_cleaning.jpg",
    bgColor: "bg-gradient-to-r from-[#F5A623] to-[#e08e16]",
  },
  {
    id: 3,
    title: "Car & Automotive Care",
    subtitle: "Super Clean & Polish",
    badge: "100% Verified Sellers",
    image: "/images/category_automotive.jpg",
    bgColor: "bg-gradient-to-r from-slate-800 to-slate-600",
  }
];

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

function BannerCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-28 md:h-44 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-[#EDEDED] mt-2">
      <div 
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {BANNERS.map((banner, idx) => (
          <div 
            key={banner.id} 
            className={`w-full h-full shrink-0 flex items-center justify-between px-6 md:px-12 text-white ${banner.bgColor} relative overflow-hidden`}
          >
            {/* Background image overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay"
              style={{ backgroundImage: `url(${banner.image})` }}
            />
            {/* Content */}
            <div className="relative z-10 space-y-1 md:space-y-2 max-w-[65%]">
              <span className="inline-block bg-[#F5A623] text-white text-[10px] md:text-sm font-black uppercase px-3 py-1 rounded-full tracking-wider shadow-lg">
                {banner.badge}
              </span>
              <h3 className="text-sm md:text-2xl font-black leading-tight drop-shadow-sm">{banner.title}</h3>
              <p className="text-xs md:text-lg font-bold text-[#F5A623] drop-shadow-sm">{banner.subtitle}</p>
            </div>
            {/* Visual element */}
            <div className="relative z-10 h-[80%] aspect-square rounded-full border-4 border-white/10 overflow-hidden shrink-0 shadow-inner bg-white/10 flex items-center justify-center p-1">
              <img 
                src={banner.image} 
                alt={banner.title} 
                width="160"
                height="160"
                className="w-full h-full object-cover rounded-full bg-white/20" 
                loading={idx === 0 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : "auto"}
                decoding="async"
              />
            </div>
          </div>
        ))}
      </div>
      {/* Slide indicators */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {BANNERS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentSlide === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}



export default function HomePage() {
  const {
    products,
    isProductsLoading,
    productsError,
    refetchProducts,
    rawApiResponse,
    isServerWakingUp,
    searchQuery,
    selectedCategory,
    setCurrentView,
  } = useContext(AppContext);

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
    <div className="w-full min-w-0 overflow-x-hidden bg-[#FAFAFA] page-content-mobile pb-6 pt-1">

      {/* Category Scroller Chips */}
      <CategoryList />

      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Products Grid */}
      <section className="mt-4">
        <div className="section-heading px-1">
          <h2 className="text-xs font-black text-charcoal uppercase tracking-wider">
            {selectedCategory !== 'All' ? selectedCategory : 'All Products'}
          </h2>
          <button
            onClick={() => setCurrentView('products')}
            className="flex items-center gap-0.5 text-xs text-[#0B1B2B] font-bold"
          >
            See all <ChevronRight size={14} />
          </button>
        </div>

        {/* 1. LOADING STATE */}
        {isProductsLoading ? (
          <div className="mt-2 space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#0B1B2B] bg-white border border-[#EDEDED] rounded-xl p-3 shadow-sm">
              <RefreshCcw size={15} className="animate-spin text-[#0B1B2B] shrink-0" />
              <span className="font-medium">
                {isServerWakingUp
                  ? 'Fetching the latest products for you. This might take a few extra seconds...'
                  : 'Loading products...'}
              </span>
            </div>
            <div className="product-grid">
              {[1, 2, 3, 4].map((i) => (
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
          /* 2. ERROR STATE */
          <div className="mt-2 space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-8 text-center shadow-sm">
              <AlertCircle size={36} className="mx-auto mb-2 text-red-500" />
              <h4 className="text-sm font-bold text-red-900">Oops, something went wrong</h4>
              <p className="mt-1 text-xs text-red-700 max-w-md mx-auto">
                {productsError}
              </p>
              <button
                onClick={() => refetchProducts()}
                className="mt-4 inline-flex items-center gap-2 bg-[#0B1B2B] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#122b44] transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCcw size={14} />
                Try Again
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* 3. EMPTY STATE (Only shown when API fetch succeeded AND product array is empty or no filter match) */
          <div className="mt-2 space-y-3">
            <div className="rounded-xl border border-dashed border-[#EDEDED] bg-white px-4 py-12 text-center shadow-sm">
              <ShoppingBag size={32} className="mx-auto mb-2 text-gray-300" />
              <h4 className="text-sm font-bold text-charcoal">No Products Found</h4>
              <p className="mt-1 text-xs text-gray-400">
                {selectedCategory !== 'All' || searchQuery
                  ? 'Try relaxing your filters or searching for another item.'
                  : 'There are currently no products available.'}
              </p>
            </div>
          </div>
        ) : (
          /* 4. SUCCESS STATE */
          <div className="mt-2">
            <div
              className="product-grid"
              style={{ animation: 'fadeIn 0.25s ease-out' }}
            >
              {filteredProducts.map((product, idx) => (
                <ProductCard key={product.id} product={product} priority={idx < 4} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}