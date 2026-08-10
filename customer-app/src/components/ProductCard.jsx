import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Heart, Star, ShoppingCart } from 'lucide-react';

function ProductCard({ product }) {
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

  const isLiked = wishlist?.includes(product.id);

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
        ((product.originalPrice - product.price) /
          product.originalPrice) *
        100
      )
      : 0;

  const pincodeData =
    pincodeDatabase?.[userPincode] || { days: 3 };

  const deliveryDays =
    product.estimatedDeliveryDays || pincodeData.days;

  const deliveryDateObj = new Date(
    Date.now() + deliveryDays * 24 * 60 * 60 * 1000
  );

  const formattedDeliveryDate =
    deliveryDateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

  const images = Array.isArray(product.images)
    ? product.images
    : [];

  const imageUrl =
    hovered && images[1]
      ? images[1]
      : images[0];

  const handleCardClick = () => {
    setSelectedProductId(product.id);
    setCurrentView('product');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <article
      className="
        group relative flex h-full min-w-0 flex-col
        overflow-hidden rounded-xl border border-gray-100
        bg-white shadow-premium
        transition-premium
        hover:border-gray-200
        hover:shadow-premium-hover
      "
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* IMAGE */}
      <div
        onClick={handleCardClick}
        className="
          relative w-full cursor-pointer
          overflow-hidden bg-gray-50
          aspect-square
          sm:aspect-[4/5]
          md:h-[280px] md:aspect-auto
        "
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name || 'Product'}
            loading="lazy"
            decoding="async"
            className="
              block h-full w-full
              object-cover
              transition-transform duration-500
              group-hover:scale-[1.03]
            "
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <div className="text-center">
              <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <span className="text-xs">
                Image unavailable
              </span>
            </div>
          </div>
        )}

        {/* DISCOUNT */}
        {discount > 0 && (
          <span
            className="
              absolute left-2 top-2
              rounded-full bg-red-500
              px-2 py-1
              text-[9px] font-bold
              text-white
              sm:text-[10px]
            "
          >
            {discount}% OFF
          </span>
        )}

        {/* WISHLIST */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`
            absolute right-2 top-2
            flex h-8 w-8 items-center justify-center
            rounded-full bg-white/95
            shadow-sm backdrop-blur
            transition
            hover:scale-105
            ${isLiked
              ? 'text-red-500'
              : 'text-gray-400 hover:text-red-500'
            }
          `}
        >
          <Heart
            className="h-4 w-4"
            fill={isLiked ? 'currentColor' : 'none'}
          />
        </button>

        {/* DELIVERY */}
        <div
          className="
            absolute bottom-2 left-2
            rounded bg-black/70
            px-2 py-1
            text-[9px] font-semibold
            text-white
            backdrop-blur-sm
          "
        >
          Delivery by {formattedDeliveryDate}
        </div>
      </div>

      {/* PRODUCT INFO */}
      <div
        className="
          flex flex-1 flex-col
          p-3
          sm:p-4
        "
      >
        {/* CATEGORY / STOCK */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <span
            className="
              min-w-0 truncate
              text-[9px] font-bold uppercase
              tracking-wide text-[#F7941D]
              sm:text-[10px]
            "
          >
            {typeof product.category === 'object'
              ? product.category?.name
              : product.category}
          </span>

          <span
            className={`
              shrink-0 text-[9px] font-semibold
              sm:text-[10px]
              ${product.inStock
                ? 'text-emerald-600'
                : 'text-red-500'
              }
            `}
          >
            {product.inStock
              ? '● In Stock'
              : 'Out of Stock'}
          </span>
        </div>

        {/* NAME */}
        <h3
          onClick={handleCardClick}
          className="
            mb-2
            line-clamp-2
            min-h-[36px]
            cursor-pointer
            text-xs font-bold
            leading-tight
            text-charcoal
            transition
            hover:text-[#F7941D]
            sm:min-h-[40px]
            sm:text-sm
          "
        >
          {product.name}
        </h3>

        {/* RATING */}
        <div
          className="
            mb-2.5 flex items-center
            gap-1
            overflow-hidden
            whitespace-nowrap
          "
        >
          <Star
            className="h-3.5 w-3.5 shrink-0 text-amber-400"
            fill="currentColor"
          />

          <span className="text-[10px] font-bold text-charcoal sm:text-xs">
            {product.rating || 0}
          </span>

          <span className="truncate text-[9px] text-gray-400 sm:text-[10px]">
            ({product.reviewCount || 0} reviews)
          </span>
        </div>

        {/* PRICE */}
        <div className="mt-auto border-t border-gray-50 pt-2.5">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-base font-black text-charcoal sm:text-lg">
              ₹{Number(product.price || 0).toLocaleString('en-IN')}
            </span>

            {product.originalPrice &&
              product.originalPrice > product.price && (
                <>
                  <span className="text-[9px] text-gray-400 line-through sm:text-xs">
                    ₹
                    {Number(
                      product.originalPrice
                    ).toLocaleString('en-IN')}
                  </span>

                  <span className="text-[9px] font-semibold text-emerald-600 sm:text-xs">
                    Save ₹
                    {Number(
                      product.originalPrice -
                      product.price
                    ).toLocaleString('en-IN')}
                  </span>
                </>
              )}
          </div>

          <div className="mt-1 flex items-center justify-between gap-1">
            {product.codAvailable !== false && (
              <span className="rounded bg-gray-50 px-1.5 py-0.5 text-[8px] text-charcoal sm:text-[10px]">
                ✓ COD
              </span>
            )}

            <span className="truncate text-[8px] text-gray-400 sm:text-[10px]">
              GST Invoice
            </span>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="
              flex min-h-[34px]
              items-center justify-center
              gap-1
              rounded-lg
              border border-gray-200
              px-2
              text-[10px] font-semibold
              text-charcoal
              transition
              hover:border-[#F7941D]
              hover:bg-orange-50
              sm:min-h-[38px]
              sm:text-xs
            "
          >
            <ShoppingCart className="h-3.5 w-3.5 text-[#F7941D]" />
            Add
          </button>

          <button
            type="button"
            onClick={() =>
              initiateQuickPurchase(product)
            }
            className="
              min-h-[34px]
              rounded-lg
              bg-[#F7941D]
              px-2
              text-[10px] font-bold
              text-white
              shadow-sm
              transition
              hover:bg-[#E07D10]
              sm:min-h-[38px]
              sm:text-xs
            "
          >
            Buy Now
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;