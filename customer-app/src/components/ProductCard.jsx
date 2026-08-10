import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../context/AppContext';
import {
  Heart,
  Star,
  ShoppingCart,
} from 'lucide-react';

/* ============================================================
   API / IMAGE CONFIGURATION
============================================================ */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://rkpeedika.onrender.com/api'
).replace(/\/+$/, '');

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/* ============================================================
   IMAGE URL NORMALIZER
============================================================ */

const getImageUrl = (image) => {
  if (!image) return '';

  let value = String(image).trim();

  if (!value) return '';

  /* Handle JSON encoded strings */
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      value = JSON.parse(value);
    } catch {
      value = value.slice(1, -1);
    }
  }

  /* Already absolute */
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  /* Protocol relative */
  if (value.startsWith('//')) {
    return `${window.location.protocol}${value}`;
  }

  /* /uploads/... */
  if (value.startsWith('/uploads/')) {
    return `${API_ORIGIN}${value}`;
  }

  /* uploads/... */
  if (value.startsWith('uploads/')) {
    return `${API_ORIGIN}/${value}`;
  }

  /* Other absolute backend path */
  if (value.startsWith('/')) {
    return `${API_ORIGIN}${value}`;
  }

  /* Filename only */
  return `${API_ORIGIN}/uploads/${value}`;
};

/* ============================================================
   PRODUCT IMAGE ARRAY
============================================================ */

const getProductImages = (product) => {
  if (!product) return [];

  let images = product.images;

  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }

  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .filter(Boolean)
    .map(getImageUrl)
    .filter(Boolean);
};

/* ============================================================
   SEARCH HIGHLIGHT
============================================================ */

const HighlightText = ({ text, search }) => {
  if (!text) return null;

  if (!search || !search.trim()) {
    return <>{text}</>;
  }

  const escapedSearch = search
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const regex = new RegExp(`(${escapedSearch})`, 'gi');

  return (
    <>
      {String(text)
        .split(regex)
        .map((part, index) => {
          const isMatch = part.toLowerCase() === search.trim().toLowerCase();

          return isMatch ? (
            <mark
              key={index}
              className="rounded bg-orange-100 px-0.5 text-[#F7941D]"
            >
              {part}
            </mark>
          ) : (
            <React.Fragment key={index}>
              {part}
            </React.Fragment>
          );
        })}
    </>
  );
};

/* ============================================================
   PRODUCT CARD
============================================================ */

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
    searchQuery,
  } = useContext(AppContext);

  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  /* ----------------------------------------------------------
     IMAGES
  ---------------------------------------------------------- */

  const images = useMemo(
    () => getProductImages(product),
    [product?.images]
  );

  const primaryImage = images[0] || '';
  const secondaryImage = images[1] || '';

  const currentImage =
    hovered && secondaryImage
      ? secondaryImage
      : primaryImage;

  /* ----------------------------------------------------------
     PRODUCT DATA
  ---------------------------------------------------------- */

  const isLiked = wishlist.includes(product.id);

  const price = Number(product.price) || 0;
  const originalPrice = Number(product.originalPrice) || 0;

  const discount =
    originalPrice > price
      ? Math.round(
        ((originalPrice - price) / originalPrice) * 100
      )
      : 0;

  /* ----------------------------------------------------------
     DELIVERY
  ---------------------------------------------------------- */

  const pincodeData =
    pincodeDatabase?.[userPincode] || {
      days: 3,
    };

  const deliveryDays =
    Number(product.estimatedDeliveryDays) ||
    Number(pincodeData.days) ||
    3;

  const deliveryDateObj = new Date(
    Date.now() +
    deliveryDays * 24 * 60 * 60 * 1000
  );

  const formattedDeliveryDate =
    deliveryDateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  /* ----------------------------------------------------------
     PRODUCT NAVIGATION
  ---------------------------------------------------------- */

  const handleCardClick = () => {
    setSelectedProductId(product.id);
    setCurrentView('product');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /* ----------------------------------------------------------
     IMAGE ERROR
  ---------------------------------------------------------- */

  const handleImageError = () => {
    console.error(
      'Product image failed:',
      currentImage
    );

    setImageFailed(true);
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <article
      className="
        group
        relative
        flex
        min-w-0
        flex-col
        overflow-hidden
        rounded-premium
        border
        border-gray-100
        bg-white
        shadow-premium
        transition-premium
        hover:border-gray-200
        hover:shadow-premium-hover
      "
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ======================================================
          IMAGE
      ====================================================== */}

      <div
        onClick={handleCardClick}
        className="
          relative
          h-[150px]
          w-full
          cursor-pointer
          overflow-hidden
          bg-gray-50
          min-[390px]:h-[165px]
          sm:h-[230px]
          md:h-[280px]
        "
      >
        {/* DISCOUNT */}
        {discount > 0 && (
          <div
            className="
              absolute
              left-2
              top-2
              z-20
              rounded-full
              bg-red-500
              px-2
              py-1
              text-[8px]
              font-bold
              text-white
              shadow-sm
              sm:px-2.5
              sm:text-[10px]
            "
          >
            {discount}% OFF
          </div>
        )}

        {/* WISHLIST */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={
            isLiked
              ? 'Remove from wishlist'
              : 'Add to wishlist'
          }
          className={`
            absolute
            right-2
            top-2
            z-20
            rounded-full
            bg-white/95
            p-1.5
            shadow-sm
            backdrop-blur-sm
            transition-transform
            hover:scale-110
            sm:p-2
            ${isLiked
              ? 'text-red-500'
              : 'text-gray-400 hover:text-red-500'
            }
          `}
        >
          <Heart
            className="
              h-3.5
              w-3.5
              sm:h-4
              sm:w-4
            "
            fill={
              isLiked
                ? 'currentColor'
                : 'none'
            }
          />
        </button>

        {/* PRODUCT IMAGE */}
        {currentImage && !imageFailed ? (
          <img
            src={currentImage}
            alt={product.name || 'Product'}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="
              block
              h-full
              w-full
              object-cover
              object-center
              transition-transform
              duration-500
              ease-out
              group-hover:scale-[1.025]
            "
            onError={handleImageError}
          />
        ) : (
          <div
            className="
              flex
              h-full
              w-full
              items-center
              justify-center
              bg-gradient-to-br
              from-gray-50
              to-gray-100
              text-center
            "
          >
            <div>
              <div className="mb-2 text-2xl opacity-40">
                🛍️
              </div>

              <p className="text-[10px] font-medium text-gray-400">
                Image unavailable
              </p>
            </div>
          </div>
        )}

        {/* DELIVERY BADGE */}
        <div
          className="
            absolute
            bottom-2
            left-2
            rounded
            bg-black/70
            px-1.5
            py-0.5
            text-[7px]
            font-semibold
            tracking-wide
            text-white
            backdrop-blur-sm
            sm:text-[9px]
          "
        >
          Delivery by {formattedDeliveryDate}
        </div>
      </div>

      {/* ======================================================
          PRODUCT INFORMATION
      ====================================================== */}

      <div
        className="
          flex
          min-w-0
          flex-1
          flex-col
          p-2.5
          sm:p-4
        "
      >
        {/* CATEGORY / STOCK */}
        <div
          className="
            mb-1
            flex
            min-w-0
            items-center
            justify-between
            gap-1
          "
        >
          <span
            className="
              min-w-0
              truncate
              text-[8px]
              font-bold
              uppercase
              tracking-wider
              text-[#F7941D]
              sm:text-[10px]
            "
          >
            {typeof product.category === 'object'
              ? product.category?.name
              : product.category}
          </span>

          <span
            className={`
              shrink-0
              text-[7px]
              font-semibold
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

        {/* TITLE */}
        <h4
          onClick={handleCardClick}
          className="
            mb-1.5
            min-h-[32px]
            cursor-pointer
            line-clamp-2
            text-[11px]
            font-bold
            leading-tight
            text-charcoal
            transition-premium
            hover:text-[#F7941D]
            sm:mb-2
            sm:min-h-[40px]
            sm:text-sm
          "
        >
          <HighlightText
            text={product.name}
            search={searchQuery}
          />
        </h4>

        {/* RATING */}
        <div
          className="
            mb-2
            flex
            min-w-0
            items-center
            gap-1
            overflow-hidden
          "
        >
          <Star
            className="
              h-3
              w-3
              shrink-0
              fill-amber-400
              text-amber-400
              sm:h-3.5
              sm:w-3.5
            "
          />

          <span className="text-[9px] font-bold text-charcoal sm:text-xs">
            {product.rating || 0}
          </span>

          <span className="truncate text-[8px] text-gray-400 sm:text-[10px]">
            ({product.reviewCount || 0})
          </span>

          {product.showPurchaseCount !== false && (
            <span
              className="
                hidden
                truncate
                bg-emerald-50
                px-1
                py-0.5
                text-[8px]
                font-bold
                uppercase
                text-emerald-600
                min-[390px]:inline-block
                sm:px-1.5
                sm:text-[10px]
              "
            >
              {product.purchaseCount || 0}
            </span>
          )}
        </div>

        {/* PRICE */}
        <div
          className="
            mt-auto
            mb-2.5
            border-t
            border-gray-50
            pt-2
            sm:mb-3.5
            sm:pt-2.5
          "
        >
          <div
            className="
              flex
              flex-wrap
              items-baseline
              gap-x-1.5
              gap-y-0.5
            "
          >
            <span
              className="
                text-base
                font-black
                text-charcoal
                sm:text-lg
              "
            >
              ₹{price.toLocaleString('en-IN')}
            </span>

            {originalPrice > price && (
              <>
                <span
                  className="
                    text-[9px]
                    text-gray-400
                    line-through
                    sm:text-xs
                  "
                >
                  ₹{originalPrice.toLocaleString('en-IN')}
                </span>

                <span
                  className="
                    text-[8px]
                    font-semibold
                    text-emerald-600
                    sm:text-xs
                  "
                >
                  Save ₹
                  {(
                    originalPrice - price
                  ).toLocaleString('en-IN')}
                </span>
              </>
            )}
          </div>

          <div
            className="
              mt-1
              flex
              items-center
              justify-between
              gap-1
              text-[7px]
              font-medium
              text-gray-400
              sm:text-[10px]
            "
          >
            {product.codAvailable !== false && (
              <span
                className="
                  truncate
                  rounded
                  bg-gray-50
                  px-1
                  py-0.5
                  text-charcoal/80
                  sm:px-1.5
                "
              >
                ✓ COD
              </span>
            )}

            <span className="truncate">
              GST Invoice
            </span>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="
              flex
              min-w-0
              items-center
              justify-center
              gap-1
              rounded-premium
              border
              border-gray-200
              px-1
              py-2
              text-[9px]
              font-semibold
              text-charcoal
              transition-premium
              hover:border-[#F7941D]
              hover:bg-orange-50/50
              sm:gap-1.5
              sm:px-2.5
              sm:text-xs
            "
          >
            <ShoppingCart
              className="
                h-3
                w-3
                shrink-0
                text-[#F7941D]
                sm:h-3.5
                sm:w-3.5
              "
            />

            <span>Add</span>
          </button>

          <button
            type="button"
            onClick={() =>
              initiateQuickPurchase(product)
            }
            className="
              min-w-0
              rounded-premium
              bg-[#F7941D]
              px-1
              py-2
              text-[9px]
              font-bold
              text-white
              shadow-sm
              transition-premium
              hover:bg-[#E07D10]
              hover:shadow
              sm:px-2.5
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