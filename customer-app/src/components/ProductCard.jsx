import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Heart, Star, ShoppingCart } from 'lucide-react';

/*
|--------------------------------------------------------------------------
| IMAGE URL HELPER
|--------------------------------------------------------------------------
*/

const API_URL =
  import.meta.env.VITE_API_URL || 'https://rkpeedika.onrender.com/api';
const BACKEND_URL = API_URL.replace(/\/api\/?$/, '');

function getImageUrl(image) {
  if (!image) return '';
  const value = String(image).trim();
  if (!value) return '';
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  ) {
    return value;
  }
  const cleanPath = value.startsWith('/') ? value : `/${value}`;
  return `${BACKEND_URL}${cleanPath}`;
}

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
  const price = Number(product?.price || 0);
  const originalPrice = Number(product?.originalPrice || 0);
  const discount =
    originalPrice > price && price > 0
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
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

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  return (
    <article
      className="product-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ============================================================
          IMAGE AREA
      ============================================================ */}
      <div
        className="product-card-image"
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
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-300">
            <ShoppingCart size={32} className="mb-1" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {/* Discount badge */}
        {discount > 0 && (
          <span
            className="absolute left-2 top-2 rounded-md bg-[#f7941d] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none"
          >
            {discount}% OFF
          </span>
        )}

        {/* Wishlist button */}
        <button
          type="button"
          aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform active:scale-90 ${
            isLiked ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          <Heart
            size={14}
            fill={isLiked ? 'currentColor' : 'none'}
          />
        </button>

        {/* Out of stock overlay */}
        {product?.inStock === false && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-bold text-red-500 bg-white px-2 py-1 rounded-md shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* ============================================================
          PRODUCT INFO
      ============================================================ */}
      <div
        className="product-card-info cursor-pointer"
        onClick={handleCardClick}
        role="button"
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      >
        {/* Product name */}
        <h3
          className="text-[12px] font-semibold text-[#222222] leading-[1.35] line-clamp-2 min-h-[32px]"
          style={{ fontSize: 'clamp(11px, 2.8vw, 13px)' }}
        >
          {product?.name || 'Unnamed Product'}
        </h3>

        {/* Rating */}
        {(product?.rating > 0 || product?.reviewCount > 0) && (
          <div className="flex items-center gap-1 mt-1">
            <Star size={11} className="text-amber-400 shrink-0" fill="currentColor" />
            <span className="text-[11px] font-bold text-[#222222]">
              {Number(product?.rating || 0).toFixed(1)}
            </span>
            {product?.reviewCount > 0 && (
              <span className="text-[10px] text-gray-400">
                ({product.reviewCount > 999
                  ? `${(product.reviewCount / 1000).toFixed(1)}k`
                  : product.reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Price block */}
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 mt-1.5">
          <span className="price-current">
            ₹{price.toLocaleString('en-IN')}
          </span>
          {originalPrice > price && (
            <>
              <span className="price-mrp">
                ₹{originalPrice.toLocaleString('en-IN')}
              </span>
              <span className="price-discount">
                {discount}% off
              </span>
            </>
          )}
        </div>

        {/* Delivery info */}
        <p className="text-[10px] text-green-600 font-medium mt-1 leading-none">
          {deliveryDays <= 2 ? '⚡ Fast delivery' : `Delivery by ${formattedDeliveryDate}`}
        </p>
      </div>

      {/* ============================================================
          ADD TO CART BUTTON
      ============================================================ */}
      {product?.inStock !== false && (
        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#f7941d] bg-orange-50 py-2 text-[11px] font-semibold text-[#f7941d] transition-colors active:bg-orange-100 hover:bg-orange-100 focus:outline-none"
            style={{ minHeight: 36 }}
          >
            <ShoppingCart size={13} />
            Add to Cart
          </button>
        </div>
      )}
    </article>
  );
}