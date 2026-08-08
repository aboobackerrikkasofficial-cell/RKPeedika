import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import CategoryList from '../components/CategoryList';
import MultilingualMarquee from '../components/MultilingualMarquee';
import TrustStrip from '../components/TrustStrip';
import ProductCard from '../components/ProductCard';
import { Star, ShieldCheck, Zap, Truck, ShoppingBag } from 'lucide-react';

export default function HomePage() {
  const { 
    products, 
    searchQuery, 
    selectedCategory, 
    setSelectedProductId, 
    setCurrentView 
  } = useContext(AppContext);

  // Helper for normalization
  const normalizeText = (text) => {
    if (!text) return "";
    return text.toLowerCase().trim().replace(/\s+/g, " ").replace(/s\b/g, "");
  };

  // Filter products based on search term & category
  const filteredProducts = products.filter(product => {
    const categoryName = typeof product.category === 'object' ? (product.category?.name || '') : (product.category || '');
    
    // Category match
    const matchesCategory = selectedCategory === "All" || categoryName === selectedCategory;
    if (!matchesCategory) return false;

    // Search query match
    if (searchQuery.trim()) {
      const normQuery = normalizeText(searchQuery);
      const keywords = normQuery.split(" ").filter(Boolean);

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
        categoryName,
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
    }

    return true;
  });

  return (
    <div className="w-full bg-white pb-16">
      <MultilingualMarquee />
      {/* Premium Hero Section */}
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8">
        <div className="relative w-full rounded-premium overflow-hidden shadow-premium bg-gray-50 aspect-[21/9] md:aspect-[3/1]">
          {/* Hero background image */}
          <img 
            src="/images/hero_banner.jpg" 
            alt="Premium Indian craft boutique storefront" 
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/95 via-charcoal/40 to-transparent"></div>
          
          {/* Hero Content */}
          <div className="relative h-full flex flex-col justify-center px-6 md:px-16 text-white max-w-lg md:max-w-xl">
            <div className="flex items-center space-x-2 bg-[#F7941D]/90 rounded-full px-3 py-1 w-max mb-3 shadow">
              <Zap className="h-3 w-3 text-white fill-current" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Trending Now</span>
            </div>
            
            <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Everything You Need. <br className="hidden md:inline" />
              <span className="text-[#F7941D]">Delivered to Your Door.</span>
            </h1>
            
            <p className="hidden md:block text-xs font-medium text-gray-300 mt-2 max-w-sm">
              Discover useful everyday products, trending gadgets, fashion, home essentials and more at affordable prices with secure shopping and Cash on Delivery.
            </p>

            {/* Quick Badges inside Hero */}
            <div className="flex flex-wrap gap-2.5 mt-4 md:mt-5 text-[10px] font-semibold">
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded backdrop-blur-sm border border-white/5">
                ✔ Cash on Delivery Available
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded backdrop-blur-sm border border-white/5">
                ⚡ Fast Delivery
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded backdrop-blur-sm border border-white/5">
                ★ 4.9 Average Rating
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Scroller */}
      <CategoryList />

      {/* Main Grid: Products showcase */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-2.5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-charcoal tracking-tight">
              {selectedCategory === "All" ? "Featured Collections" : `${selectedCategory}`}
            </h2>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">
              Showing {filteredProducts.length} verified products
            </p>
          </div>

          {searchQuery && (
            <div className="mt-2 md:mt-0 text-xs font-semibold text-gray-500">
              Filtered by: "<span className="text-[#F7941D]">{searchQuery}</span>"
            </div>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-premium">
            <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-charcoal">No Products Found</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">We couldn't find matching products. Try looking up essentials, gadgets or fashion.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="flex justify-center mt-10">
              <button 
                onClick={() => setCurrentView('products')}
                className="px-8 py-3 bg-[#F7941D] hover:bg-[#E07D10] text-white text-xs font-bold rounded-premium shadow-md hover:shadow-lg transition-premium min-h-[44px]"
              >
                View All Products
              </button>
            </div>
          </>
        )}
      </div>

      {/* Trust Badges Bar */}
      <div className="mt-12">
        <TrustStrip />
      </div>

      {/* Bottom Promos Section */}
      <div className="mx-auto max-w-7xl px-4 mt-12 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="rounded-premium border border-gray-100 bg-[#FFFBEB] p-6 shadow-sm flex items-center justify-between">
            <div className="max-w-[65%]">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">Quality Assured</span>
              <h4 className="text-base font-extrabold text-charcoal tracking-tight mt-2">Verified Sellers</h4>
              <p className="text-xs text-gray-500 mt-1">We carefully vet all our sellers to ensure you receive only high-quality products that meet your daily needs.</p>
            </div>
            <div className="h-20 w-20 rounded-full overflow-hidden bg-white shadow border border-orange-100 shrink-0">
              <img src="/images/verified_sellers.jpg" alt="Verified Indian Seller" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-premium border border-gray-100 bg-orange-50/50 p-6 shadow-sm flex items-center justify-between mt-6 md:mt-0">
            <div className="max-w-[65%]">
              <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded uppercase tracking-wider">Fast Dispatch</span>
              <h4 className="text-base font-extrabold text-charcoal tracking-tight mt-2">Quick Fulfillment</h4>
              <p className="text-xs text-gray-500 mt-1">Orders are packed securely and dispatched from our fulfillment hubs quickly for fast delivery to your door.</p>
            </div>
            <div className="h-20 w-20 rounded-full overflow-hidden bg-white shadow border border-orange-100 shrink-0">
              <img src="/images/quick_fulfillment_hub.jpg" alt="Quick Fulfillment Hub" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-premium border border-gray-100 bg-emerald-50/40 p-6 shadow-sm flex items-center justify-between">
            <div className="max-w-[65%]">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">Secure Trust</span>
              <h4 className="text-base font-extrabold text-charcoal tracking-tight mt-2">Trusted Indian Marketplace</h4>
              <p className="text-xs text-gray-500 mt-1">Direct from trusted Indian sellers, guaranteeing premium quality products and a natural shopping experience.</p>
            </div>
            <div className="h-20 w-20 rounded-full overflow-hidden bg-white shadow border border-orange-100">
              <img src="/images/promo_indian_market.jpg" alt="Natural Indian shopping scene" className="w-full h-full object-cover" />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
