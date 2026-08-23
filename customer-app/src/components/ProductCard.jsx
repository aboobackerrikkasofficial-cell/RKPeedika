import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Heart, Star, ShoppingCart } from 'lucide-react';
import getImageUrl from '../utils/imageUrl';

/*
|--------------------------------------------------------------------------
| PRODUCT CARD — Mobile-first compact design
|
| Structure:
|   [IMAGE — aspect-ratio 3:4]
|   [Product name — 2 lines max]
|   [★ rating  (count)]
|   [₹price   ₹MRP   X% off]
|   [Free delivery / delivery date]
|   [Add to Cart button]
|--------------------------------------------------------------------------
*/

export default function ProductCard({ product }) {
  const {
    wishlist,
    toggleWishlist,
    addToCart,
    setSelectedProductId,
    setCurrentView,
    userPincode,
    pincodeDatabase,
  } = useContext(AppContext);

  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const isLiked = wishlist?.includes(product?.id);

  /* ------------------------------------------------------------------
     PRICE CALCULATIONS
  ------------------------------------------------------------------ */
  const basePrice = Number(product?.price || 0);
  const onlinePrice = product?.onlinePrice !== null && product?.onlinePrice !== undefined 
    ? Number(product.onlinePrice) 
    : basePrice;
    
  const displayOriginal = product?.originalPrice !== null && product?.originalPrice !== undefined 
    ? Number(product.originalPrice) 
    : basePrice;

  // The discount percentage based strictly on DB fields (MRP vs Online Price)
  const finalDiscount = displayOriginal > onlinePrice 
    ? Math.round(((displayOriginal - onlinePrice) / displayOriginal) * 100)
    : 0;

  /* ------------------------------------------------------------------
     DELIVERY DATE
  ------------------------------------------------------------------ */
  const pincodeData = pincodeDatabase?.[userPincode] || { days: 3 };
  const deliveryDays =
    Number(product?.estimatedDeliveryDays) || pincodeData.days || 3;
  const deliveryDateObj = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);
  const formattedDeliveryDate = deliveryDateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  /* ------------------------------------------------------------------
     IMAGES
  ------------------------------------------------------------------ */
  let images = [];
  if (Array.isArray(product?.images)) {
    images = product.images.filter(Boolean);
  } else if (typeof product?.images === 'string') {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) images = parsed.filter(Boolean);
    } catch {
      images = product.images ? [product.images] : [];
    }
  }
  const normalizedImages = images.map(getImageUrl);
  const imageUrl = normalizedImages[imageIndex] || normalizedImages[0] || '';

  /* ------------------------------------------------------------------
     HANDLERS
  ------------------------------------------------------------------ */
  const handleCardClick = () => {
    if (!product?.id) return;
    setSelectedProductId(product.id);
    setCurrentView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageError = () => {
    setImageFailed(true);
    if (imageIndex !== 0 && normalizedImages[0]) {
      setImageIndex(0);
      setImageFailed(false);
    }
  };

  const handleMouseEnter = () => {
    if (normalizedImages.length > 1) {
      setImageIndex(1);
      setImageFailed(false);
    }
  };

  const handleMouseLeave = () => {
    setImageIndex(0);
    setImageFailed(false);
  };

  const hasOffer = product?.enableOnlineDiscount && product?.onlinePrice && finalDiscount > 0;

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  return (
    <article
      className="bg-white rounded-xl border border-[#EDEDED] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-all duration-200 active:scale-[0.98] hover:shadow-md flex flex-col h-full relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ============================================================
          IMAGE AREA (Full-bleed, rounded top corners only)
      ============================================================ */}
      <div
        className="w-full aspect-square overflow-hidden bg-white relative rounded-t-xl cursor-pointer shrink-0 flex items-center justify-center p-2"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
        aria-label={`View ${product?.name || 'product'}`}
      >
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={product?.name || 'Product'}
            loading="lazy"
            decoding="async"
            width="400"
            height="400"
            className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAFAFA] text-gray-300">
            <ShoppingCart size={28} className="mb-1 text-gray-450" />
            <span className="text-[10px]">No image</span>
          </div>
        )}


      </div>

      {/* ============================================================
          PRODUCT INFO (Padded)
      ============================================================ */}
      <div
        className="p-3 flex-grow flex flex-col gap-1 cursor-pointer"
        onClick={handleCardClick}
        role="button"
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      >
        {/* Category Label */}
        <div className="flex">
          <span className="bg-[#0B1B2B]/10/70 text-[#0B1B2B] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            {typeof product?.category === 'object' ? product.category?.name : product?.category || 'General'}
          </span>
        </div>

        {/* Product name */}
        <h3 className="text-sm font-bold text-[#1A1A1A] leading-snug line-clamp-2 mt-1 min-h-[32px]">
          {product?.name || 'Unnamed Product'}
        </h3>

        {/* Price Block & Wishlist */}
        <div className="flex flex-col gap-1 mt-1 w-full">
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg md:text-xl font-black text-[#1A1A1A]">
                  ₹{onlinePrice.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-gray-400 line-through font-bold">
                  ₹{displayOriginal.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-[#1F9D55] font-extrabold bg-[#1F9D55]/10 px-1.5 py-0.5 rounded">
                  {finalDiscount}% OFF
                </span>
              </div>
            </div>
            {/* Wishlist button moved here */}
            <button
              type="button"
              aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 border border-[#EDEDED] transition-transform active:scale-90 flex-shrink-0 ml-1 ${
                isLiked ? 'text-[#F5A623]' : 'text-gray-400'
              }`}
            >
              <Heart
                size={17}
                fill={isLiked ? 'currentColor' : 'none'}
              />
            </button>
          </div>
          {/* Offer Applied Badge */}
          {hasOffer && (
            <span className="bg-[#1F9D55]/10 text-[#1F9D55] text-[9.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 w-fit mt-0.5">
              🏷️ 1 offer applied for you
            </span>
          )}
        </div>

        {/* Rating */}
        {(product?.rating > 0 || product?.reviewCount > 0) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center gap-0.5 bg-[#1F9D55]/10 text-[#1F9D55] font-black px-1.5 py-0.5 rounded text-[10px]">
              <Star size={10} className="fill-current text-[#1F9D55]" />
              <span>{Number(product?.rating || 0).toFixed(1)}</span>
            </div>
            {product?.reviewCount > 0 && (
              <span className="text-[10px] text-gray-400 font-semibold">
                ({product.reviewCount > 999
                  ? `${(product.reviewCount / 1000).toFixed(1)}k`
                  : product.reviewCount.toLocaleString('en-IN')})
              </span>
            )}
          </div>
        )}

        {/* Trust Badges - Crucial for Indian shoppers */}
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="bg-[#3E7BFA]/10 text-[#3E7BFA] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            Free Delivery
          </span>
          {product?.codAvailable !== false && (
            <span className="bg-[#1F9D55]/10 text-[#1F9D55] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              COD
            </span>
          )}
        </div>
      </div>
    </article>
  );
}