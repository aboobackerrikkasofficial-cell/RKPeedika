import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import CategoryList from '../components/CategoryList';
import ProductCard from '../components/ProductCard';
import { ShoppingBag, ChevronRight, Gift, ShieldCheck, Truck } from 'lucide-react';

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
    <div className="relative w-full h-36 md:h-52 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-[#EDEDED] mt-2">
      <div 
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {BANNERS.map((banner) => (
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
              <span className="inline-block bg-white/20 text-[9px] md:text-xs font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider backdrop-blur-sm">
                {banner.badge}
              </span>
              <h3 className="text-sm md:text-2xl font-black leading-tight drop-shadow-sm">{banner.title}</h3>
              <p className="text-xs md:text-lg font-bold text-[#F5A623]">{banner.subtitle}</p>
            </div>
            {/* Visual element */}
            <div className="relative z-10 h-[80%] aspect-square rounded-full border-4 border-white/10 overflow-hidden shrink-0 shadow-inner bg-white/10 flex items-center justify-center p-1">
              <img src={banner.image} alt={banner.title} className="w-full h-full object-cover rounded-full" />
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



function HomeTrustStrip() {
  return (
    <div className="grid grid-cols-3 gap-2 mt-3 bg-white rounded-xl border border-[#EDEDED] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
      <div className="flex flex-col items-center gap-1">
        <Truck className="h-4.5 w-4.5 text-[#0B1B2B]" />
        <span className="text-[9px] font-black text-charcoal uppercase">Free Delivery</span>
      </div>
      <div className="flex flex-col items-center gap-1 border-x border-[#EDEDED]">
        <Gift className="h-4.5 w-4.5 text-[#F5A623]" />
        <span className="text-[9px] font-black text-charcoal uppercase">Doorstep COD</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <ShieldCheck className="h-4.5 w-4.5 text-[#0B1B2B]" />
        <span className="text-[9px] font-black text-charcoal uppercase">7-Day Exchange</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const {
    products,
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
    <div className="w-full min-w-0 overflow-x-hidden bg-[#FAFAFA] page-content-mobile pb-6 pt-1 px-2">

      {/* Category Scroller Chips */}
      <CategoryList />

      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Trust Highlights Strip */}
      <HomeTrustStrip />



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

        {filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#EDEDED] bg-white px-4 py-12 text-center shadow-sm">
            <ShoppingBag size={32} className="mx-auto mb-2 text-gray-300" />
            <h4 className="text-sm font-bold text-charcoal">No Products Found</h4>
            <p className="mt-1 text-xs text-gray-400">
              Try a different search or browse a category.
            </p>
          </div>
        ) : (
          <div className="mt-2">
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