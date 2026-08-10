import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import {
  Heart,
  Star,
  ShoppingCart,
} from 'lucide-react';

/*
|--------------------------------------------------------------------------
| IMAGE URL HELPER
|--------------------------------------------------------------------------
| Product images may come from:
|
|   /uploads/imported/image.jpg
|   uploads/imported/image.jpg
|   https://rkpeedika.onrender.com/uploads/...
|
| We normalize all of them to the backend server.
|--------------------------------------------------------------------------
*/

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://rkpeedika.onrender.com/api';

const BACKEND_URL = API_URL.replace(/\/api\/?$/, '');

function getImageUrl(image) {
  if (!image) return '';

  const value = String(image).trim();

  if (!value) return '';

  // Already an absolute URL
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  ) {
    return value;
  }

  // Remove accidental leading spaces
  const cleanPath = value.startsWith('/')
    ? value
    : `/${value}`;

  return `${BACKEND_URL}${cleanPath}`;
}

/*
|--------------------------------------------------------------------------
| PRODUCT CARD
|--------------------------------------------------------------------------
*/

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
    searchQuery,
  } = useContext(AppContext);

  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const isLiked =
    wishlist?.includes(product?.id);

  /*
  |--------------------------------------------------------------------------
  | DISCOUNT
  |--------------------------------------------------------------------------
  */

  const price = Number(product?.price || 0);

  const originalPrice = Number(
    product?.originalPrice || 0
  );

  const discount =
    originalPrice > price && price > 0
      ? Math.round(
        ((originalPrice - price) /
          originalPrice) *
        100
      )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | DELIVERY
  |--------------------------------------------------------------------------
  */

  const pincodeData =
    pincodeDatabase?.[userPincode] || {
      days: 3,
    };

  const deliveryDays =
    Number(product?.estimatedDeliveryDays) ||
    pincodeData.days ||
    3;

  const deliveryDateObj = new Date(
    Date.now() +
    deliveryDays *
    24 *
    60 *
    60 *
    1000
  );

  const formattedDeliveryDate =
    deliveryDateObj.toLocaleDateString(
      'en-IN',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }
    );

  /*
  |--------------------------------------------------------------------------
  | IMAGES
  |--------------------------------------------------------------------------
  */

  let images = [];

  if (Array.isArray(product?.images)) {
    images = product.images.filter(Boolean);
  } else if (typeof product?.images === 'string') {
    try {
      const parsed = JSON.parse(
        product.images
      );

      if (Array.isArray(parsed)) {
        images = parsed.filter(Boolean);
      }
    } catch {
      images = product.images
        ? [product.images]
        : [];
    }
  }

  const normalizedImages =
    images.map(getImageUrl);

  const imageUrl =
    normalizedImages[imageIndex] ||
    normalizedImages[0] ||
    '';

  /*
  |--------------------------------------------------------------------------
  | CARD CLICK
  |--------------------------------------------------------------------------
  */

  const handleCardClick = () => {
    if (!product?.id) return;

    setSelectedProductId(product.id);
    setCurrentView('product');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /*
  |--------------------------------------------------------------------------
  | IMAGE ERROR
  |--------------------------------------------------------------------------
  */

  const handleImageError = () => {
    setImageFailed(true);

    /*
     * If the second image fails, try the first image.
     */
    if (
      imageIndex !== 0 &&
      normalizedImages[0]
    ) {
      setImageIndex(0);
      setImageFailed(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | IMAGE HOVER
  |--------------------------------------------------------------------------
  */

  const handleMouseEnter = () => {
    setHovered(true);

    if (normalizedImages.length > 1) {
      setImageIndex(1);
      setImageFailed(false);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);

    setImageIndex(0);
    setImageFailed(false);
  };

  return (
    <article
      className="
        group
        relative
        flex
        h-full
        min-w-0
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-gray-100
        bg-white
        shadow-premium
        transition-premium
        hover:border-gray-200
        hover:shadow-premium-hover

        /* Mobile */
        min-h-[500px]

        /* Desktop */
        md:min-h-[600px]
      "
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* =========================================================
          IMAGE AREA
      ========================================================== */}

      <div
        onClick={handleCardClick}
        className="
          relative
          w-full
          cursor-pointer
          overflow-hidden
          bg-gray-50

          /* Mobile image */
          h-[230px]

          /* Larger phones */
          min-[400px]:h-[250px]

          /* Tablet */
          sm:h-[270px]

          /* Desktop */
          md:h-[300px]
        "
      >
        {imageUrl && !imageFailed ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={product?.name || 'Product'}
            loading="lazy"
            decoding="async"
            className="
              block
              h-full
              w-full
              object-cover
              object-center
              transition-transform
              duration-500
              ease-out
              group-hover:scale-[1.03]
            "
            onError={handleImageError}
          />
        ) : (
          <div
            className="
              flex
              h-full
              w-full
              flex-col
              items-center
              justify-center
              bg-gray-50
              text-gray-400
            "
          >
            <div
              className="
                mb-3
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-white
                shadow-sm
              "
            >
              <ShoppingCart
                className="
                  h-7
                  w-7
                  text-gray-300
                "
              />
            </div>

            <span
              className="
                text-sm
                font-medium
              "
            >
              Image unavailable
            </span>
          </div>
        )}

        {/* =======================================================
            DISCOUNT
        ======================================================== */}

        {discount > 0 && (
          <span
            className="
              absolute
              left-3
              top-3
              z-10
              rounded-full
              bg-red-500
              px-2.5
              py-1
              text-[10px]
              font-bold
              leading-none
              text-white
              shadow-sm

              sm:text-xs
            "
          >
            {discount}% OFF
          </span>
        )}

        {/* =======================================================
            WISHLIST
        ======================================================== */}

        <button
          type="button"
          aria-label="Add to wishlist"
          onClick={(e) => {
            e.stopPropagation();

            toggleWishlist(product.id);
          }}
          className={`
            absolute
            right-3
            top-3
            z-10
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-white/95
            shadow-md
            backdrop-blur
            transition
            hover:scale-105

            ${isLiked
              ? 'text-red-500'
              : 'text-gray-400 hover:text-red-500'
            }
          `}
        >
          <Heart
            className="h-5 w-5"
            fill={
              isLiked
                ? 'currentColor'
                : 'none'
            }
          />
        </button>

        {/* =======================================================
            DELIVERY
        ======================================================== */}

        <div
          className="
            absolute
            bottom-3
            left-3
            rounded-md
            bg-black/75
            px-2.5
            py-1.5
            text-[10px]
            font-semibold
            leading-none
            text-white
            shadow-sm
            backdrop-blur-sm

            sm:text-xs
          "
        >
          Delivery by{' '}
          {formattedDeliveryDate}
        </div>
      </div>

      {/* =========================================================
          PRODUCT INFORMATION
      ========================================================== */}

      <div
        className="
          flex
          flex-1
          flex-col

          /* More breathing room on mobile */
          p-4

          sm:p-5
          md:p-5
        "
      >
        {/* =======================================================
            CATEGORY + STOCK
        ======================================================== */}

        <div
          className="
            mb-2
            flex
            items-center
            justify-between
            gap-2
          "
        >
          <span
            className="
              min-w-0
              truncate
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              text-[#F7941D]

              sm:text-xs
            "
          >
            {typeof product?.category ===
              'object'
              ? product?.category?.name
              : product?.category ||
              'General'}
          </span>

          <span
            className={`
              shrink-0
              text-[10px]
              font-semibold

              sm:text-xs

              ${product?.inStock
                ? 'text-emerald-600'
                : 'text-red-500'
              }
            `}
          >
            {product?.inStock
              ? '● In Stock'
              : 'Out of Stock'}
          </span>
        </div>

        {/* =======================================================
            PRODUCT NAME
        ======================================================== */}

        <h3
          onClick={handleCardClick}
          className="
            mb-3
            min-h-[42px]
            cursor-pointer
            line-clamp-2
            text-sm
            font-bold
            leading-[1.3]
            text-charcoal
            transition
            hover:text-[#F7941D]

            sm:min-h-[48px]
            sm:text-base
          "
        >
          {product?.name ||
            'Unnamed Product'}
        </h3>

        {/* =======================================================
            RATING
        ======================================================== */}

        <div
          className="
            mb-3
            flex
            min-w-0
            items-center
            gap-1.5
            overflow-hidden
            whitespace-nowrap
          "
        >
          <Star
            className="
              h-4
              w-4
              shrink-0
              text-amber-400
            "
            fill="currentColor"
          />

          <span
            className="
              text-xs
              font-bold
              text-charcoal

              sm:text-sm
            "
          >
            {product?.rating || 0}
          </span>

          <span
            className="
              truncate
              text-[10px]
              text-gray-400

              sm:text-xs
            "
          >
            (
            {product?.reviewCount || 0}{' '}
            reviews)
          </span>

          {product?.showPurchaseCount !==
            false && (
              <>
                <span className="text-gray-300">
                  |
                </span>

                <span
                  className="
                  shrink-0
                  rounded
                  bg-emerald-50
                  px-1.5
                  py-0.5
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-emerald-600

                  sm:text-[10px]
                "
                >
                  {product?.purchaseCount ||
                    0}{' '}
                  purchases
                </span>
              </>
            )}
        </div>

        {/* =======================================================
            PRICE
        ======================================================== */}

        <div
          className="
            mt-auto
            border-t
            border-gray-100
            pt-3
          "
        >
          <div
            className="
              flex
              flex-wrap
              items-baseline
              gap-x-2
              gap-y-1
            "
          >
            <span
              className="
                text-xl
                font-black
                leading-none
                text-charcoal

                sm:text-2xl
              "
            >
              ₹
              {price.toLocaleString(
                'en-IN'
              )}
            </span>

            {originalPrice > price && (
              <>
                <span
                  className="
                    text-[10px]
                    text-gray-400
                    line-through

                    sm:text-xs
                  "
                >
                  ₹
                  {originalPrice.toLocaleString(
                    'en-IN'
                  )}
                </span>

                <span
                  className="
                    text-[10px]
                    font-semibold
                    text-emerald-600

                    sm:text-xs
                  "
                >
                  Save ₹
                  {(
                    originalPrice - price
                  ).toLocaleString(
                    'en-IN'
                  )}
                </span>
              </>
            )}
          </div>

          {/* =====================================================
              COD / GST
          ====================================================== */}

          <div
            className="
              mt-2
              flex
              items-center
              justify-between
              gap-2
            "
          >
            {product?.codAvailable !==
              false ? (
              <span
                className="
                  rounded-md
                  bg-gray-50
                  px-2
                  py-1
                  text-[9px]
                  font-medium
                  text-charcoal

                  sm:text-[10px]
                "
              >
                ✓ COD Available
              </span>
            ) : (
              <span />
            )}

            <span
              className="
                truncate
                text-[9px]
                text-gray-400

                sm:text-[10px]
              "
            >
              GST Invoice
            </span>
          </div>
        </div>

        {/* =======================================================
            BUTTONS
        ======================================================== */}

        <div
          className="
            mt-4
            grid
            grid-cols-2
            gap-2.5
          "
        >
          {/* ADD */}

          <button
            type="button"
            onClick={() =>
              addToCart(product)
            }
            className="
              flex
              min-h-[42px]
              items-center
              justify-center
              gap-1.5
              rounded-xl
              border
              border-gray-200
              bg-white
              px-2
              text-xs
              font-semibold
              text-charcoal
              transition
              hover:border-[#F7941D]
              hover:bg-orange-50

              sm:min-h-[44px]
              sm:text-sm
            "
          >
            <ShoppingCart
              className="
                h-4
                w-4
                text-[#F7941D]
              "
            />

            Add
          </button>

          {/* BUY NOW */}

          <button
            type="button"
            onClick={() =>
              initiateQuickPurchase(
                product
              )
            }
            className="
              min-h-[42px]
              rounded-xl
              bg-[#F7941D]
              px-2
              text-xs
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-[#E07D10]
              hover:shadow-md

              sm:min-h-[44px]
              sm:text-sm
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