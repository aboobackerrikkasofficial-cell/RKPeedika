import React, { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import CategoryList from '../components/CategoryList';
import MultilingualMarquee from '../components/MultilingualMarquee';
import TrustStrip from '../components/TrustStrip';
import ProductCard from '../components/ProductCard';
import {
  Zap,
  ShoppingBag,
} from 'lucide-react';

/* ============================================================
   HOME PAGE
============================================================ */

export default function HomePage() {
  const {
    products,
    searchQuery,
    selectedCategory,
    setCurrentView,
  } = useContext(AppContext);

  /* ==========================================================
     NORMALIZE SEARCH TEXT
  ========================================================== */

  const normalizeText = (text) => {
    if (!text) return '';

    return String(text)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/s\b/g, '');
  };

  /* ==========================================================
     SAFELY PARSE JSON
  ========================================================== */

  const parseJson = (value, fallback = null) => {
    if (!value) return fallback;

    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  /* ==========================================================
     FILTER PRODUCTS
  ========================================================== */

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) {
      return [];
    }

    const normalizedQuery =
      normalizeText(searchQuery);

    const keywords = normalizedQuery
      .split(' ')
      .filter(Boolean);

    return products.filter((product) => {
      if (!product) {
        return false;
      }

      /* ------------------------------------------------------
         CATEGORY
      ------------------------------------------------------ */

      const categoryName =
        typeof product.category === 'object'
          ? product.category?.name || ''
          : product.category || '';

      const matchesCategory =
        selectedCategory === 'All' ||
        categoryName === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      /* ------------------------------------------------------
         NO SEARCH
      ------------------------------------------------------ */

      if (!normalizedQuery) {
        return true;
      }

      /* ------------------------------------------------------
         SPECIFICATIONS
      ------------------------------------------------------ */

      const parsedSpecifications =
        parseJson(
          product.specifications,
          {}
        );

      let specificationsText = '';

      if (
        parsedSpecifications &&
        typeof parsedSpecifications === 'object' &&
        !Array.isArray(parsedSpecifications)
      ) {
        specificationsText =
          Object.entries(
            parsedSpecifications
          )
            .map(
              ([key, value]) =>
                `${key} ${value}`
            )
            .join(' ');
      }

      /* ------------------------------------------------------
         HIGHLIGHTS
      ------------------------------------------------------ */

      const parsedHighlights =
        parseJson(
          product.highlights,
          []
        );

      let highlightsText = '';

      if (Array.isArray(parsedHighlights)) {
        highlightsText =
          parsedHighlights.join(' ');
      }

      /* ------------------------------------------------------
         SEARCH TARGET
      ------------------------------------------------------ */

      const searchTarget =
        normalizeText(
          [
            product.name,
            categoryName,
            product.subcategory,
            product.brand,
            product.seller,
            product.description,
            product.tagline,
            highlightsText,
            specificationsText,
            product.tags,
            product.sku,
            product.collections,
          ]
            .filter(Boolean)
            .join(' ')
        );

      /* ------------------------------------------------------
         ALL KEYWORDS MUST MATCH
      ------------------------------------------------------ */

      return keywords.every((keyword) =>
        searchTarget.includes(keyword)
      );
    });
  }, [
    products,
    searchQuery,
    selectedCategory,
  ]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      className="
        w-full
        min-w-0
        overflow-x-hidden
        bg-white
        pb-16
      "
    >
      {/* ======================================================
          TOP MARQUEE
      ====================================================== */}

      <MultilingualMarquee />

      {/* ======================================================
          HERO SECTION
      ====================================================== */}

      <section
        className="
          mx-auto
          w-full
          max-w-7xl
          px-3
          pt-4
          sm:px-4
          sm:pt-5
          md:px-8
          md:pt-6
        "
      >
        <div
          className="
            relative
            w-full
            overflow-hidden
            rounded-premium
            bg-gray-50
            shadow-premium

            aspect-[16/10]

            sm:aspect-[16/8]

            md:aspect-[3/1]
          "
        >
          {/* HERO IMAGE */}

          <img
            src="/images/hero_banner.jpg"
            alt="Premium Indian marketplace"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="
              absolute
              inset-0
              block
              h-full
              w-full
              object-cover
              object-center
            "
          />

          {/* HERO OVERLAY */}

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-r
              from-black/90
              via-black/45
              to-transparent
            "
          />

          {/* ==================================================
              HERO CONTENT
          ================================================== */}

          <div
            className="
              relative
              flex
              h-full
              max-w-xl
              flex-col
              justify-center
              px-4
              text-white

              sm:px-6

              md:px-16
            "
          >
            {/* TRENDING BADGE */}

            <div
              className="
                mb-2
                flex
                w-max
                items-center
                gap-1.5
                rounded-full
                bg-[#F7941D]/95
                px-2.5
                py-1
                shadow

                sm:mb-3
                sm:px-3
              "
            >
              <Zap
                className="
                  h-3
                  w-3
                  fill-current
                  text-white
                "
              />

              <span
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-white

                  sm:text-[10px]
                "
              >
                Trending Now
              </span>
            </div>

            {/* HERO TITLE */}

            <h1
              className="
                max-w-[280px]
                text-base
                font-extrabold
                leading-tight
                tracking-tight
                text-white

                sm:max-w-md
                sm:text-xl

                md:text-3xl

                lg:text-4xl
              "
            >
              Everything You Need.

              <br className="hidden md:inline" />

              <span className="text-[#F7941D]">
                {' '}
                Delivered to Your Door.
              </span>
            </h1>

            {/* HERO DESCRIPTION */}

            <p
              className="
                mt-2
                hidden
                max-w-sm
                text-xs
                font-medium
                leading-relaxed
                text-gray-300

                md:block
              "
            >
              Discover useful everyday
              products, trending gadgets,
              fashion, home essentials and
              more at affordable prices with
              secure shopping and Cash on
              Delivery.
            </p>

            {/* =================================================
                HERO BADGES
            ================================================= */}

            <div
              className="
                mt-3
                flex
                flex-wrap
                gap-1.5

                sm:mt-4
                sm:gap-2.5
              "
            >
              <span
                className="
                  rounded
                  border
                  border-white/10
                  bg-white/10
                  px-2
                  py-1
                  text-[7px]
                  font-semibold
                  text-white
                  backdrop-blur-sm

                  sm:px-2.5
                  sm:text-[10px]
                "
              >
                ✓ COD Available
              </span>

              <span
                className="
                  rounded
                  border
                  border-white/10
                  bg-white/10
                  px-2
                  py-1
                  text-[7px]
                  font-semibold
                  text-white
                  backdrop-blur-sm

                  sm:px-2.5
                  sm:text-[10px]
                "
              >
                ⚡ Fast Delivery
              </span>

              <span
                className="
                  rounded
                  border
                  border-white/10
                  bg-white/10
                  px-2
                  py-1
                  text-[7px]
                  font-semibold
                  text-white
                  backdrop-blur-sm

                  sm:px-2.5
                  sm:text-[10px]
                "
              >
                ★ 4.9 Rating
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          CATEGORIES
      ====================================================== */}

      <CategoryList />

      {/* ======================================================
          PRODUCTS
      ====================================================== */}

      <section
        className="
          mx-auto
          mt-5
          w-full
          max-w-7xl
          min-w-0
          px-3.5

          sm:mt-6
          sm:px-4

          md:px-8
        "
      >
        {/* ====================================================
            SECTION HEADER
        ==================================================== */}

        <div
          className="
            mb-4
            flex
            min-w-0
            flex-col
            justify-between
            border-b
            border-gray-100
            pb-2.5

            sm:mb-6

            md:flex-row
            md:items-center
          "
        >
          <div className="min-w-0">
            <h2
              className="
                truncate
                text-lg
                font-black
                tracking-tight
                text-charcoal

                sm:text-xl
              "
            >
              {selectedCategory === 'All'
                ? 'Featured Collections'
                : selectedCategory}
            </h2>

            <p
              className="
                mt-0.5
                text-[9px]
                font-semibold
                text-gray-400

                sm:text-xs
              "
            >
              Showing{' '}
              {filteredProducts.length}{' '}
              verified products
            </p>
          </div>

          {/* SEARCH STATUS */}

          {searchQuery && (
            <div
              className="
                mt-2
                truncate
                text-[9px]
                font-semibold
                text-gray-500

                md:mt-0
                md:text-xs
              "
            >
              Filtered by:{' '}
              <span className="text-[#F7941D]">
                "{searchQuery}"
              </span>
            </div>
          )}
        </div>

        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {filteredProducts.length === 0 ? (
          <div
            className="
              rounded-premium
              border
              border-dashed
              border-gray-200
              px-4
              py-16
              text-center

              sm:py-20
            "
          >
            <ShoppingBag
              className="
                mx-auto
                mb-3
                h-9
                w-9
                text-gray-300

                sm:h-10
                sm:w-10
              "
            />

            <h4
              className="
                text-sm
                font-bold
                text-charcoal
              "
            >
              No Products Found
            </h4>

            <p
              className="
                mx-auto
                mt-1
                max-w-xs
                text-[10px]
                text-gray-400

                sm:text-xs
              "
            >
              We couldn't find matching
              products. Try looking up
              essentials, gadgets or
              fashion.
            </p>
          </div>
        ) : (
          <>
            {/* =================================================
                PRODUCT GRID

                MOBILE:
                2 columns

                TABLET:
                2 columns

                DESKTOP:
                3 columns

                LARGE DESKTOP:
                4 columns
            ================================================= */}

            <div
              className="
                grid
                w-full
                min-w-0

                grid-cols-2
                gap-3

                sm:grid-cols-2
                sm:gap-4

                md:grid-cols-3
                md:gap-5

                lg:grid-cols-4
                lg:gap-6
              "
            >
              {filteredProducts
                .slice(0, 6)
                .map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
            </div>

            {/* =================================================
                VIEW ALL
            ================================================= */}

            <div
              className="
                mt-7
                flex
                justify-center

                sm:mt-10
              "
            >
              <button
                type="button"
                onClick={() =>
                  setCurrentView('products')
                }
                className="
                  min-h-[42px]
                  rounded-premium
                  bg-[#F7941D]
                  px-6
                  py-2.5
                  text-[10px]
                  font-bold
                  text-white
                  shadow-md
                  transition-premium
                  hover:bg-[#E07D10]
                  hover:shadow-lg

                  sm:px-8
                  sm:py-3
                  sm:text-xs
                "
              >
                View All Products
              </button>
            </div>
          </>
        )}
      </section>

      {/* ======================================================
          TRUST STRIP
      ====================================================== */}

      <div
        className="
          mt-10

          sm:mt-12
        "
      >
        <TrustStrip />
      </div>

      {/* ======================================================
          PROMO CARDS
      ====================================================== */}

      <section
        className="
          mx-auto
          mt-10
          w-full
          max-w-7xl
          px-3

          sm:mt-12
          sm:px-4

          md:px-8
        "
      >
        <div
          className="
            grid
            grid-cols-1
            gap-4

            md:grid-cols-3
            md:gap-6
          "
        >
          {/* ==================================================
              CARD 1
          ================================================== */}

          <div
            className="
              flex
              min-w-0
              items-center
              justify-between
              rounded-premium
              border
              border-gray-100
              bg-[#FFFBEB]
              p-4
              shadow-sm

              sm:p-6
            "
          >
            <div
              className="
                min-w-0
                max-w-[68%]
              "
            >
              <span
                className="
                  rounded
                  bg-amber-100
                  px-2
                  py-0.5
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-amber-600

                  sm:text-[10px]
                "
              >
                Quality Assured
              </span>

              <h4
                className="
                  mt-2
                  text-sm
                  font-extrabold
                  tracking-tight
                  text-charcoal

                  sm:text-base
                "
              >
                Verified Sellers
              </h4>

              <p
                className="
                  mt-1
                  text-[10px]
                  leading-relaxed
                  text-gray-500

                  sm:text-xs
                "
              >
                We carefully vet all our
                sellers to ensure you receive
                only high-quality products that
                meet your daily needs.
              </p>
            </div>

            <div
              className="
                h-16
                w-16
                shrink-0
                overflow-hidden
                rounded-full
                border
                border-orange-100
                bg-white
                shadow

                sm:h-20
                sm:w-20
              "
            >
              <img
                src="/images/verified_sellers.jpg"
                alt="Verified Indian Seller"
                loading="lazy"
                decoding="async"
                className="
                  block
                  h-full
                  w-full
                  object-cover
                "
              />
            </div>
          </div>

          {/* ==================================================
              CARD 2
          ================================================== */}

          <div
            className="
              mt-0
              flex
              min-w-0
              items-center
              justify-between
              rounded-premium
              border
              border-gray-100
              bg-orange-50/50
              p-4
              shadow-sm

              sm:p-6

              md:mt-0
            "
          >
            <div
              className="
                min-w-0
                max-w-[68%]
              "
            >
              <span
                className="
                  rounded
                  bg-orange-100
                  px-2
                  py-0.5
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-orange-600

                  sm:text-[10px]
                "
              >
                Fast Dispatch
              </span>

              <h4
                className="
                  mt-2
                  text-sm
                  font-extrabold
                  tracking-tight
                  text-charcoal

                  sm:text-base
                "
              >
                Quick Fulfillment
              </h4>

              <p
                className="
                  mt-1
                  text-[10px]
                  leading-relaxed
                  text-gray-500

                  sm:text-xs
                "
              >
                Orders are packed securely
                and dispatched from our
                fulfillment hubs quickly for
                fast delivery to your door.
              </p>
            </div>

            <div
              className="
                h-16
                w-16
                shrink-0
                overflow-hidden
                rounded-full
                border
                border-orange-100
                bg-white
                shadow

                sm:h-20
                sm:w-20
              "
            >
              <img
                src="/images/quick_fulfillment_hub.jpg"
                alt="Quick Fulfillment Hub"
                loading="lazy"
                decoding="async"
                className="
                  block
                  h-full
                  w-full
                  object-cover
                "
              />
            </div>
          </div>

          {/* ==================================================
              CARD 3
          ================================================== */}

          <div
            className="
              flex
              min-w-0
              items-center
              justify-between
              rounded-premium
              border
              border-gray-100
              bg-emerald-50/40
              p-4
              shadow-sm

              sm:p-6
            "
          >
            <div
              className="
                min-w-0
                max-w-[68%]
              "
            >
              <span
                className="
                  rounded
                  bg-emerald-100
                  px-2
                  py-0.5
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-emerald-600

                  sm:text-[10px]
                "
              >
                Secure Trust
              </span>

              <h4
                className="
                  mt-2
                  text-sm
                  font-extrabold
                  tracking-tight
                  text-charcoal

                  sm:text-base
                "
              >
                Trusted Indian Marketplace
              </h4>

              <p
                className="
                  mt-1
                  text-[10px]
                  leading-relaxed
                  text-gray-500

                  sm:text-xs
                "
              >
                Direct from trusted Indian
                sellers, guaranteeing premium
                quality products and a natural
                shopping experience.
              </p>
            </div>

            <div
              className="
                h-16
                w-16
                shrink-0
                overflow-hidden
                rounded-full
                border
                border-orange-100
                bg-white
                shadow

                sm:h-20
                sm:w-20
              "
            >
              <img
                src="/images/promo_indian_market.jpg"
                alt="Natural Indian shopping scene"
                loading="lazy"
                decoding="async"
                className="
                  block
                  h-full
                  w-full
                  object-cover
                "
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}