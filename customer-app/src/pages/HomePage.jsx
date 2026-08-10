import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import CategoryList from '../components/CategoryList';
import MultilingualMarquee from '../components/MultilingualMarquee';
import TrustStrip from '../components/TrustStrip';
import ProductCard from '../components/ProductCard';
import {
  Star,
  ShieldCheck,
  Zap,
  Truck,
  ShoppingBag,
} from 'lucide-react';

export default function HomePage() {
  const {
    products,
    searchQuery,
    selectedCategory,
    setSelectedProductId,
    setCurrentView,
  } = useContext(AppContext);

  // ---------------------------------------------------------
  // Normalize text for product searching
  // ---------------------------------------------------------
  const normalizeText = (text) => {
    if (!text) return '';

    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/s\b/g, '');
  };

  // ---------------------------------------------------------
  // Filter products
  // ---------------------------------------------------------
  const filteredProducts = products.filter((product) => {
    const categoryName =
      typeof product.category === 'object'
        ? product.category?.name || ''
        : product.category || '';

    // Category filter
    const matchesCategory =
      selectedCategory === 'All' ||
      categoryName === selectedCategory;

    if (!matchesCategory) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const normQuery = normalizeText(searchQuery);

      const keywords = normQuery
        .split(' ')
        .filter(Boolean);

      // Specifications
      let specsText = '';

      try {
        const parsed =
          typeof product.specifications === 'string'
            ? JSON.parse(product.specifications)
            : product.specifications;

        if (parsed && typeof parsed === 'object') {
          specsText = Object.entries(parsed)
            .map(([key, value]) => `${key} ${value}`)
            .join(' ');
        }
      } catch (error) {
        // Ignore invalid specification JSON
      }

      // Highlights
      let highlightsText = '';

      try {
        const parsed =
          typeof product.highlights === 'string'
            ? JSON.parse(product.highlights)
            : product.highlights;

        if (Array.isArray(parsed)) {
          highlightsText = parsed.join(' ');
        }
      } catch (error) {
        // Ignore invalid highlights JSON
      }

      const searchTarget = normalizeText(
        [
          product.name,
          categoryName,
          product.subcategory || '',
          product.brand || product.seller || '',
          product.description || '',
          product.tagline || '',
          highlightsText,
          specsText,
          product.tags || '',
          product.sku || '',
          product.collections || '',
        ].join(' ')
      );

      return keywords.every((keyword) =>
        searchTarget.includes(keyword)
      );
    }

    return true;
  });

  return (
    <div className="w-full bg-white pb-16">

      {/* =====================================================
          MULTILINGUAL MARQUEE
      ===================================================== */}
      <MultilingualMarquee />

      {/* =====================================================
          PREMIUM HERO SECTION
      ===================================================== */}
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:pt-6 md:px-8 md:pt-6">

        <div
          className="
            relative
            w-full
            overflow-hidden
            rounded-premium
            shadow-premium
            bg-gray-50

            /* MOBILE */
            aspect-[4/3]

            /* SMALL TABLETS */
            sm:aspect-[16/9]

            /* DESKTOP */
            md:aspect-[3/1]
          "
        >

          {/* -------------------------------------------------
              HERO IMAGE
          ------------------------------------------------- */}
          <img
            src="/images/hero_banner.jpg"
            alt="Premium Indian craft boutique storefront"
            className="
              absolute
              inset-0
              w-full
              h-full
              object-cover

              /* MOBILE:
                 shift image toward the right so the
                 important storefront area remains visible */
              object-[68%_center]

              /* TABLET */
              sm:object-[62%_center]

              /* DESKTOP:
                 preserve original desktop composition */
              md:object-center
            "
          />

          {/* -------------------------------------------------
              HERO OVERLAY
          ------------------------------------------------- */}
          <div
            className="
              absolute
              inset-0

              bg-gradient-to-r
              from-black/80
              via-black/35
              to-transparent

              md:from-charcoal/95
              md:via-charcoal/40
              md:to-transparent
            "
          />

          {/* -------------------------------------------------
              HERO CONTENT
          ------------------------------------------------- */}
          <div
            className="
              relative
              h-full
              flex
              flex-col
              justify-center

              px-5
              py-6

              sm:px-7
              sm:py-8

              md:px-16
              md:py-0

              text-white

              max-w-[92%]
              sm:max-w-xl
              md:max-w-xl
            "
          >

            {/* TRENDING BADGE */}
            <div
              className="
                flex
                items-center
                space-x-2
                bg-[#F7941D]/95
                rounded-full
                px-3
                py-1
                w-max
                mb-3
                shadow
              "
            >
              <Zap
                className="h-3 w-3 text-white fill-current"
              />

              <span
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-white
                "
              >
                Trending Now
              </span>
            </div>

            {/* HERO HEADING */}
            <h1
              className="
                text-[25px]
                leading-[1.08]

                sm:text-3xl

                md:text-3xl
                lg:text-4xl

                font-extrabold
                tracking-tight
                text-white
              "
            >
              Everything You Need.
              <br />

              <span className="text-[#F7941D]">
                Delivered to Your Door.
              </span>
            </h1>

            {/* HERO DESCRIPTION
                Hidden on mobile to keep the hero clean */}
            <p
              className="
                hidden
                md:block
                text-xs
                font-medium
                text-gray-300
                mt-2
                max-w-sm
              "
            >
              Discover useful everyday products, trending
              gadgets, fashion, home essentials and more at
              affordable prices with secure shopping and Cash
              on Delivery.
            </p>

            {/* -------------------------------------------------
                QUICK HERO BADGES
            ------------------------------------------------- */}
            <div
              className="
                flex
                flex-wrap
                gap-2

                mt-4
                md:mt-5

                text-[9px]
                sm:text-[10px]
                font-semibold
              "
            >

              {/* COD */}
              <span
                className="
                  flex
                  items-center
                  gap-1

                  bg-white/15

                  px-2.5
                  py-1.5

                  rounded

                  backdrop-blur-sm

                  border
                  border-white/10
                "
              >
                ✔ Cash on Delivery
              </span>

              {/* FAST DELIVERY */}
              <span
                className="
                  flex
                  items-center
                  gap-1

                  bg-white/15

                  px-2.5
                  py-1.5

                  rounded

                  backdrop-blur-sm

                  border
                  border-white/10
                "
              >
                ⚡ Fast Delivery
              </span>

              {/* RATING */}
              <span
                className="
                  flex
                  items-center
                  gap-1

                  bg-white/15

                  px-2.5
                  py-1.5

                  rounded

                  backdrop-blur-sm

                  border
                  border-white/10
                "
              >
                ★ 4.9 Rating
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          CATEGORIES
      ===================================================== */}
      <CategoryList />

      {/* =====================================================
          PRODUCTS SECTION
      ===================================================== */}
      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          md:px-8
          mt-6
        "
      >

        {/* SECTION HEADER */}
        <div
          className="
            flex
            flex-col
            md:flex-row
            md:items-center
            justify-between

            mb-6
            pb-2.5

            border-b
            border-gray-100
          "
        >

          <div>
            <h2
              className="
                text-xl
                font-black
                text-charcoal
                tracking-tight
              "
            >
              {selectedCategory === 'All'
                ? 'Featured Collections'
                : selectedCategory}
            </h2>

            <p
              className="
                text-xs
                font-semibold
                text-gray-400
                mt-0.5
              "
            >
              Showing {filteredProducts.length} verified products
            </p>
          </div>

          {/* SEARCH STATUS */}
          {searchQuery && (
            <div
              className="
                mt-2
                md:mt-0
                text-xs
                font-semibold
                text-gray-500
              "
            >
              Filtered by:{' '}
              <span className="text-[#F7941D]">
                "{searchQuery}"
              </span>
            </div>
          )}
        </div>

        {/* ===================================================
            PRODUCTS
        =================================================== */}
        {filteredProducts.length === 0 ? (

          /* EMPTY STATE */
          <div
            className="
              text-center
              py-20
              border
              border-dashed
              border-gray-200
              rounded-premium
            "
          >
            <ShoppingBag
              className="
                h-10
                w-10
                text-gray-300
                mx-auto
                mb-3
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
                text-xs
                text-gray-400
                mt-1
                max-w-xs
                mx-auto
              "
            >
              We couldn't find matching products. Try looking
              up essentials, gadgets or fashion.
            </p>
          </div>

        ) : (

          <>
            {/* PRODUCT GRID */}
            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                md:grid-cols-3
                lg:grid-cols-4
                gap-6
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

            {/* VIEW ALL */}
            <div
              className="
                flex
                justify-center
                mt-10
              "
            >
              <button
                onClick={() =>
                  setCurrentView('products')
                }
                className="
                  px-8
                  py-3

                  bg-[#F7941D]
                  hover:bg-[#E07D10]

                  text-white
                  text-xs
                  font-bold

                  rounded-premium

                  shadow-md
                  hover:shadow-lg

                  transition-premium

                  min-h-[44px]
                "
              >
                View All Products
              </button>
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          TRUST BADGES
      ===================================================== */}
      <div className="mt-12">
        <TrustStrip />
      </div>

      {/* =====================================================
          BOTTOM PROMOTIONAL CARDS
      ===================================================== */}
      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          mt-12
          md:px-8
        "
      >

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-6
          "
        >

          {/* -------------------------------------------------
              CARD 1 - VERIFIED SELLERS
          ------------------------------------------------- */}
          <div
            className="
              rounded-premium
              border
              border-gray-100
              bg-[#FFFBEB]

              p-6

              shadow-sm

              flex
              items-center
              justify-between
            "
          >

            <div className="max-w-[65%]">

              <span
                className="
                  text-[10px]
                  font-bold
                  text-amber-600
                  bg-amber-100
                  px-2
                  py-0.5
                  rounded
                  uppercase
                  tracking-wider
                "
              >
                Quality Assured
              </span>

              <h4
                className="
                  text-base
                  font-extrabold
                  text-charcoal
                  tracking-tight
                  mt-2
                "
              >
                Verified Sellers
              </h4>

              <p
                className="
                  text-xs
                  text-gray-500
                  mt-1
                "
              >
                We carefully vet all our sellers to ensure
                you receive only high-quality products that
                meet your daily needs.
              </p>
            </div>

            <div
              className="
                h-20
                w-20
                rounded-full
                overflow-hidden
                bg-white
                shadow
                border
                border-orange-100
                shrink-0
              "
            >
              <img
                src="/images/verified_sellers.jpg"
                alt="Verified Indian Seller"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>
          </div>

          {/* -------------------------------------------------
              CARD 2 - QUICK FULFILLMENT
          ------------------------------------------------- */}
          <div
            className="
              rounded-premium
              border
              border-gray-100
              bg-orange-50/50

              p-6

              shadow-sm

              flex
              items-center
              justify-between

              mt-6
              md:mt-0
            "
          >

            <div className="max-w-[65%]">

              <span
                className="
                  text-[10px]
                  font-bold
                  text-orange-600
                  bg-orange-100
                  px-2
                  py-0.5
                  rounded
                  uppercase
                  tracking-wider
                "
              >
                Fast Dispatch
              </span>

              <h4
                className="
                  text-base
                  font-extrabold
                  text-charcoal
                  tracking-tight
                  mt-2
                "
              >
                Quick Fulfillment
              </h4>

              <p
                className="
                  text-xs
                  text-gray-500
                  mt-1
                "
              >
                Orders are packed securely and dispatched
                from our fulfillment hubs quickly for fast
                delivery to your door.
              </p>
            </div>

            <div
              className="
                h-20
                w-20
                rounded-full
                overflow-hidden
                bg-white
                shadow
                border
                border-orange-100
                shrink-0
              "
            >
              <img
                src="/images/quick_fulfillment_hub.jpg"
                alt="Quick Fulfillment Hub"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>
          </div>

          {/* -------------------------------------------------
              CARD 3 - TRUSTED MARKETPLACE
          ------------------------------------------------- */}
          <div
            className="
              rounded-premium
              border
              border-gray-100
              bg-emerald-50/40

              p-6

              shadow-sm

              flex
              items-center
              justify-between
            "
          >

            <div className="max-w-[65%]">

              <span
                className="
                  text-[10px]
                  font-bold
                  text-emerald-600
                  bg-emerald-100
                  px-2
                  py-0.5
                  rounded
                  uppercase
                  tracking-wider
                "
              >
                Secure Trust
              </span>

              <h4
                className="
                  text-base
                  font-extrabold
                  text-charcoal
                  tracking-tight
                  mt-2
                "
              >
                Trusted Indian Marketplace
              </h4>

              <p
                className="
                  text-xs
                  text-gray-500
                  mt-1
                "
              >
                Direct from trusted Indian sellers, guaranteeing
                premium quality products and a natural shopping
                experience.
              </p>
            </div>

            <div
              className="
                h-20
                w-20
                rounded-full
                overflow-hidden
                bg-white
                shadow
                border
                border-orange-100
              "
            >
              <img
                src="/images/promo_indian_market.jpg"
                alt="Natural Indian shopping scene"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}