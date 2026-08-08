import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Heart, Star, ShoppingCart, ShieldCheck } from 'lucide-react';

const HighlightText = ({ text, search }) => {
  if (!text) return null;
  if (!search || !search.trim()) return <span>{text}</span>;

  const escapedSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedSearch})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-amber-100 text-charcoal font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

export default function ProductCard({ product }) {
  const {
    wishlist,
    toggleWishlist,
    addToCart,
    initiateQuickPurchase,
    setSelectedProductId,
    setCurrentView,
    userPincode,
    pincodeDatabase,
    searchQuery
  } = useContext(AppContext);

  const [hovered, setHovered] = useState(false);

  const isLiked = wishlist.includes(product.id);
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Calculate dynamic delivery date based on user pincode
  const pincodeData = pincodeDatabase[userPincode] || { days: 3 };
  const deliveryDays = product.estimatedDeliveryDays || pincodeData.days;
  const deliveryDateObj = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);
  const formattedDeliveryDate = deliveryDateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const handleCardClick = () => {
    setSelectedProductId(product.id);
    setCurrentView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="group relative flex flex-col rounded-premium border border-gray-100 bg-white shadow-premium hover:shadow-premiumHover hover:border-gray-200 transition-premium overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top badges & Favorite button */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Discount Badge */}
        {discount > 0 && (
          <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm uppercase tracking-wide">
            {discount}% OFF
          </span>
        )}

        {/* Favorite Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`pointer-events-auto rounded-full bg-white/90 p-2 shadow-sm backdrop-blur-sm transition-premium hover:scale-110 ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
        >
          <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Image Gallery Showcase */}
      <div
        onClick={handleCardClick}
        className="h-[240px] md:h-[280px] w-full overflow-hidden relative cursor-pointer bg-gray-50 flex items-center justify-center"
      >
        <img
          src={hovered && product.images[1] ? product.images[1] : product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-700 ease-out transform group-hover:scale-[1.03]"
        />

        {/* Quick Delivery Tag */}
        <div className="absolute bottom-2.5 left-2.5 rounded bg-charcoal/80 px-2 py-0.5 text-[9px] font-semibold text-white tracking-wide backdrop-blur-[2px]">
          Delivery by {formattedDeliveryDate}
        </div>
      </div>

      {/* Product Information */}
      <div className="flex flex-col flex-1 p-4">

        {/* Category & Stock */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#F7941D]">
            {typeof product.category === 'object' ? product.category?.name : product.category}
          </span>
          <span className={`text-[10px] font-semibold ${product.inStock ? 'text-emerald-600' : 'text-red-500'}`}>
            {product.inStock ? '● In Stock' : 'Out of Stock'}
          </span>
        </div>

        {/* Product Title */}
        <h4
          onClick={handleCardClick}
          className="text-sm font-bold text-charcoal leading-tight cursor-pointer hover:text-[#F7941D] transition-premium line-clamp-2 min-h-[40px] mb-2"
        >
          <HighlightText text={product.name} search={searchQuery} />
        </h4>

        {/* Star Rating & Review count */}
        <div className="flex items-center space-x-1.5 mb-2.5">
          <div className="flex items-center text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="text-xs font-bold text-charcoal">{product.rating}</span>
          <span className="text-[10px] font-medium text-gray-400">({product.reviewCount || 0} reviews)</span>
          {product.showPurchaseCount !== false && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {product.purchaseCount || 0} purchases
              </span>
            </>
          )}
        </div>

        {/* Pricing details */}
        <div className="mt-auto border-t border-gray-50 pt-2.5 mb-3.5">
          <div className="flex items-baseline space-x-2">
            <span className="text-lg font-black text-charcoal">₹{product.price.toLocaleString('en-IN')}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <span className="text-xs text-gray-400 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                <span className="text-xs font-semibold text-emerald-600">Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-1 text-[10px] font-medium text-gray-400">
            {product.codAvailable !== false && (
              <span className="flex items-center text-charcoal/80 bg-gray-50 px-1.5 py-0.5 rounded">
                ✔ COD Available
              </span>
            )}
            <span>GST Invoice available</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          {/* Add to Cart */}
          <button
            onClick={() => addToCart(product)}
            className="flex items-center justify-center gap-1.5 rounded-premium border border-gray-200 px-2.5 py-2 text-xs font-semibold text-charcoal hover:border-[#F7941D] hover:bg-orange-50/50 transition-premium"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-[#F7941D]" /> Add
          </button>

          {/* Buy Now (One Click Purchase) */}
          <button
            onClick={() => initiateQuickPurchase(product)}
            className="rounded-premium bg-[#F7941D] px-2.5 py-2 text-xs font-bold text-white hover:bg-[#E07D10] transition-premium shadow-sm hover:shadow"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
