import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Star, 
  ShoppingCart, 
  ShieldCheck, 
  ArrowLeft,
  Minus,
  Plus,
  Gift,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  ThumbsUp,
  Image as ImageIcon,
  Heart
} from 'lucide-react';

const getInitials = (name) => {
  if (!name) return "AN";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

export default function ProductPage() {
  const {
    selectedProductId,
    products,
    recentlyViewed,
    setSelectedProductId,
    setCurrentView,
    addToCart,
    initiateQuickPurchase,
    wishlist,
    toggleWishlist
  } = useContext(AppContext);

  // Retrieve current product details
  const product = products.find(p => p.id === selectedProductId) || products[0];

  // Gallery state
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' });
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [scale, setScale] = useState(1);
  const [touchStartDist, setTouchStartDist] = useState(0);

  // Reset active image index when product changes
  useEffect(() => {
    setActiveImgIndex(0);
  }, [selectedProductId]);

  // Payment pricing selection state
  const [paymentOption, setPaymentOption] = useState('online'); // 'cod' | 'online'

  // Dynamic variants state
  const [selectedVariants, setSelectedVariants] = useState({});

  useEffect(() => {
    if (product && product.variants) {
      let parsedVariants = {};
      try {
        parsedVariants = typeof product.variants === 'string' 
          ? JSON.parse(product.variants) 
          : product.variants;
      } catch (e) {
        console.error("Failed to parse product variants:", e);
      }

      const initial = {};
      Object.entries(parsedVariants).forEach(([key, options]) => {
        if (Array.isArray(options) && options.length > 0) {
          initial[key] = options[0];
        }
      });
      setSelectedVariants(initial);
    } else {
      setSelectedVariants({});
    }
  }, [product]);

  const [quantity, setQuantity] = useState(1);

  // Advanced Review States
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    averageRating: 0,
    totalCount: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    allImages: []
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState('recent'); // recent | high_rating | low_rating | helpful | photo
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [eligibility, setEligibility] = useState({ eligible: false, checked: false, message: "" });
  
  // Review Image Modal State
  const [previewImage, setPreviewImage] = useState(null);

  // Review Form Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: ""
  });
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Check Review Eligibility on mount / product change
  useEffect(() => {
    const checkEligibility = async () => {
      const token = localStorage.getItem('accessToken') || '';
      if (!token) {
        setEligibility({ eligible: false, checked: true, message: "You can review this product after your order has been delivered." });
        return;
      }
      try {
        const res = await apiClient.get(`/reviews/product/${product.id}/eligibility`);
        const data = res.data;
        if (res.status === 200 || data.success) {
          setEligibility({ 
            eligible: data.eligible, 
            checked: true, 
            message: data.message || "You can review this product after your order has been delivered." 
          });
        } else {
          setEligibility({ eligible: false, checked: true, message: "You can review this product after your order has been delivered." });
        }
      } catch (e) {
        setEligibility({ eligible: false, checked: true, message: "You can review this product after your order has been delivered." });
      }
    };

    if (product?.id) {
      checkEligibility();
    }
  }, [product?.id]);

  // Fetch reviews logic with pagination & sorting
  const fetchProductReviews = async (pageNo, sortOpt, append = false, customLimit = 6) => {
    setIsLoadingReviews(true);
    try {
      const res = await apiClient.get(`/reviews/product/${product.id}?page=${pageNo}&limit=${customLimit}&sort=${sortOpt}`);
      const data = res.data;
      if (res.status === 200 && data.success) {
        if (append) {
          setReviews(prev => [...prev, ...data.reviews]);
        } else {
          setReviews(data.reviews);
        }
        setReviewSummary({
          averageRating: data.averageRating,
          totalCount: data.totalCount,
          breakdown: data.breakdown,
          allImages: data.allImages || []
        });
        setHasMore(pageNo < data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch product reviews", err);
    }
    setIsLoadingReviews(false);
  };

  useEffect(() => {
    if (product?.id) {
      setCurrentPage(1);
      fetchProductReviews(1, sortOption, false);
    }
  }, [product?.id, sortOption]);

  const handleViewAll = () => {
    fetchProductReviews(1, sortOption, false, 1000); // Fetch all remaining reviews
  };

  // Toggle helpful votes
  const handleHelpfulVote = async (reviewId) => {
    const token = localStorage.getItem('accessToken') || '';
    if (!token) {
      window.showAlert("Please log in to vote reviews as helpful.", "Login Required");
      return;
    }
    try {
      const res = await apiClient.post(`/reviews/${reviewId}/helpful`);
      const data = res.data;
      if (res.status === 200 && data.success) {
        // Toggle in local state
        setReviews(prev => prev.map(r => {
          if (r.id === reviewId) {
            return {
              ...r,
              helpfulCount: data.helpfulCount,
              voted: data.voted
            };
          }
          return r;
        }));
      }
    } catch (err) {
      console.error("Failed to vote helpful", err);
    }
  };

  // Review Form Submit Handler
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");
    setIsSubmittingReview(true);

    try {
      const res = await apiClient.post('/reviews', {
        productId: product.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
        title: reviewForm.title,
        images: "[]"
      });

      const data = res.data;
      if (res.status === 200 || res.status === 201 || data.success) {
        setReviewSuccess("Review submitted successfully! It is pending approval by our moderators.");
        setReviewForm({
          rating: 5,
          title: "",
          comment: ""
        });
        // Reload reviews list
        setTimeout(() => {
          setIsReviewModalOpen(false);
          setCurrentPage(1);
          fetchProductReviews(1, sortOption, false);
        }, 2500);
      } else {
        setReviewError(data.message || data.error?.message || "Failed to submit review.");
      }
    } catch (err) {
      setReviewError(err.response?.data?.message || err.response?.data?.error?.message || "Network error. Please make sure you are logged in and try again.");
    }
    setIsSubmittingReview(false);
  };

  // Magnify zoom effect on desktop image
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${product.images[activeImgIndex]})`,
      backgroundPosition: `${x}% ${y}%`
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };

  // Image slider handlers
  const handlePrevImg = () => {
    setActiveImgIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImg = () => {
    setActiveImgIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  // Touch handlers for mobile swipe and pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setSwipeStartX(e.touches[0].clientX);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max(1, dist / touchStartDist), 3);
      setScale(newScale);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      setTouchStartDist(0);
      if (scale > 1.1) {
        setTimeout(() => setScale(1), 150);
      }
    }

    if (e.changedTouches.length === 1 && swipeStartX > 0) {
      const diffX = e.changedTouches[0].clientX - swipeStartX;
      if (Math.abs(diffX) > 50) {
        if (diffX < 0) {
          handleNextImg();
        } else {
          handlePrevImg();
        }
      }
      setSwipeStartX(0);
    }
  };

  // Guard: Product not found
  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Product Not Found</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">
          We couldn't find this product. It may have been removed or the link may be incorrect.
        </p>
        <button
          onClick={() => setCurrentView('home')}
          className="rounded-xl bg-[#F7941D] px-6 py-3 text-sm font-bold text-white hover:bg-[#E07D10] transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  // Guard: Product deactivated
  const isDeactivated = product.status === 'draft' || product.status === 'archived' || product.active === false;
  if (isDeactivated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Product Unavailable</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">
          This product is currently unavailable. Please check back later or browse our other products.
        </p>
        <button
          onClick={() => setCurrentView('home')}
          className="rounded-xl bg-[#F7941D] px-6 py-3 text-sm font-bold text-white hover:bg-[#E07D10] transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  // Parse specifications and highlights
  let specifications = {};
  let highlights = [];
  let variants = {};

  try {
    specifications = typeof product.specifications === 'string'
      ? JSON.parse(product.specifications || '{}')
      : product.specifications || {};
  } catch (e) {
    specifications = product.specifications || {};
  }

  try {
    highlights = typeof product.highlights === 'string'
      ? JSON.parse(product.highlights || '[]')
      : product.highlights || [];
  } catch (e) {
    highlights = product.highlights || [];
  }

  try {
    variants = typeof product.variants === 'string'
      ? JSON.parse(product.variants || '{}')
      : product.variants || {};
  } catch (e) {
    variants = product.variants || {};
  }

  const hasVariants = variants && Object.keys(variants).length > 0 && Object.values(variants).some(arr => Array.isArray(arr) && arr.length > 0);

  // Pricing calculations
  const codPrice = product.codPrice || product.price;
  const onlinePrice = product.onlinePrice || product.price;
  const savings = Math.max(0, codPrice - onlinePrice);
  const activePrice = paymentOption === 'cod' ? codPrice : onlinePrice;

  // Dynamic related products generator (Same category, similar price, exclude current product, limit 8-12)
  const relatedProducts = products
    .filter(p => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 12);

  // Fallback to fill 8-12 products if needed
  if (relatedProducts.length < 8) {
    const additional = products
      .filter(p => p.id !== product.id && !relatedProducts.find(rp => rp.id === p.id))
      .slice(0, 12 - relatedProducts.length);
    relatedProducts.push(...additional);
  }

  return (
    <div className="w-full bg-white" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Back navigation — compact on mobile */}
      <div className="mx-auto max-w-7xl px-3 py-2.5 md:px-8 md:py-4">
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#222222] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Main product columns */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        
        {/* LEFT COLUMN: Gallery & Interactive Viewers */}
        <div className="space-y-4">
          
          {/* Main Visualizer Stage */}
          <div className="relative border border-gray-100 rounded-premium bg-gray-50 overflow-hidden aspect-square flex items-center justify-center">
            <div 
              className="w-full h-full relative cursor-crosshair overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img 
                src={product.images[activeImgIndex]} 
                alt={product.name} 
                className="w-full h-full object-contain transition-all duration-300 bg-white"
                style={{ transform: `scale(${scale})` }}
              />
              
              {/* Magnified zoom window (desktop) */}
              <div 
                className="absolute inset-0 bg-no-repeat pointer-events-none border border-gray-200 shadow-inner hidden md:block"
                style={{
                  ...zoomStyle,
                  backgroundSize: '200%'
                }}
              />
            </div>

            {/* Desktop Navigation Arrows */}
            {product.images.length > 1 && (
              <>
                <button 
                  onClick={handlePrevImg}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-charcoal hover:text-[#F7941D] transition-premium shadow hidden md:flex items-center justify-center"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleNextImg}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-charcoal hover:text-[#F7941D] transition-premium shadow hidden md:flex items-center justify-center"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Sub-thumbnails selection strip */}
          {product.images.length > 1 && (
            <div className="flex gap-3 justify-center">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveImgIndex(idx);
                  }}
                  className={`w-16 h-16 rounded-premium border-2 overflow-hidden bg-gray-50 transition-premium ${
                    activeImgIndex === idx ? 'border-[#F7941D]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={img} alt="Product view" className="w-full h-full object-contain bg-white" />
                </button>
              ))}
            </div>
          )}

          {/* Product Specifications & Care Guide */}
          {specifications && Object.keys(specifications).length > 0 && (
            <div className="mt-8 rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
              <h4 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4">Product Specifications</h4>
              <div className="divide-y divide-gray-50 text-xs">
                {Object.entries(specifications).map(([key, val]) => (
                  <div key={key} className="grid grid-cols-3 py-2.5">
                    <span className="font-bold text-gray-400">{key}</span>
                    <span className="col-span-2 font-medium text-charcoal">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Product Details, Actions & Reviews */}
        <div className="space-y-6">
          <div>
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F7941D]">
              {product.category?.name || product.category || 'General Marketplace'}
            </span>
            
            <h1 className="text-xl md:text-2xl font-black text-charcoal leading-snug mt-2">
              {product.name}
            </h1>
            
            <p className="text-xs font-semibold text-gray-400 mt-1 italic leading-relaxed">
              {product.tagline}
            </p>

            {/* Star ratings summary */}
            <div className="flex items-center space-x-1.5 mt-3 flex-wrap">
              <div className="flex items-center text-amber-400">
                <Star className="h-4.5 w-4.5 fill-current" />
              </div>
              <span className="text-sm font-black text-charcoal">{reviewSummary.averageRating || product.rating}</span>
              <span className="text-xs text-gray-400 mr-2">({reviewSummary.totalCount || product.reviewCount || 0} reviews)</span>
              {product.showPurchaseCount !== false && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider ml-2">
                    {product.purchaseCount || 0} purchases
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Pricing Box - Dynamic with COD and Online Payment Selectors */}
          <div className="rounded-premium bg-gray-50 p-5 border border-gray-100 space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Payment Option</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Online Payment Option Card */}
              <div 
                onClick={() => setPaymentOption('online')}
                className={`cursor-pointer rounded-premium border p-4 transition-premium flex flex-col justify-between ${
                  paymentOption === 'online' ? 'border-[#F7941D] bg-orange-50/10' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-charcoal">Online Payment (UPI/Card)</p>
                  <p className="text-xs text-gray-400 mt-1">Pay online securely</p>
                </div>
                <div className="mt-3 flex items-baseline space-x-1.5">
                  <span className="text-xl font-black text-charcoal">₹{onlinePrice.toLocaleString('en-IN')}</span>
                  {product.originalPrice && (
                    <span className="text-xs text-gray-400 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                  )}
                </div>
                {savings > 0 && (
                  <span className="mt-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded self-start">
                    Save ₹{savings} with Online Payment
                  </span>
                )}
              </div>

              {/* COD Payment Option Card */}
              {product.codAvailable !== false && (
                <div 
                  onClick={() => setPaymentOption('cod')}
                  className={`cursor-pointer rounded-premium border p-4 transition-premium flex flex-col justify-between ${
                    paymentOption === 'cod' ? 'border-[#F7941D] bg-orange-50/10' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-charcoal">Cash on Delivery (COD)</p>
                    <p className="text-xs text-gray-400 mt-1">Pay on delivery at doorstep</p>
                  </div>
                  <div className="mt-3 flex items-baseline space-x-1.5">
                    <span className="text-xl font-black text-charcoal">₹{codPrice.toLocaleString('en-IN')}</span>
                    {product.originalPrice && (
                      <span className="text-xs text-gray-400 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  <span className="mt-2 text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded self-start">
                    Standard COD Price
                  </span>
                </div>
              )}

            </div>

            <div className="text-[10px] text-gray-400 font-semibold mt-1">
              Price inclusive of all taxes. GST receipt generated on checkout.
            </div>

            {/* Dynamic discount notice */}
            {paymentOption === 'online' && savings > 0 && (
              <div className="flex items-start gap-2 bg-[#FFFBEB] rounded-premium p-3 border border-amber-200 text-xs text-amber-900 leading-relaxed font-semibold">
                <Gift className="h-5 w-5 text-[#F7941D] shrink-0" />
                <div>
                  Extra savings of ₹{savings} applied automatically for online UPI/Card payment!
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Variants Selector - Only shown if variants exist */}
          {hasVariants && (
            <div className="space-y-4">
              {Object.entries(variants).map(([variantName, options]) => {
                if (!Array.isArray(options) || options.length === 0) return null;
                const formattedName = variantName.charAt(0).toUpperCase() + variantName.slice(1).replace(/([A-Z])/g, ' $1');
                return (
                  <div key={variantName}>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select {formattedName}</label>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedVariants(prev => ({ ...prev, [variantName]: option }))}
                          className={`rounded-premium border px-4 py-2 text-xs font-bold transition-premium ${
                            selectedVariants[variantName] === option
                              ? 'border-[#F7941D] bg-orange-50 text-[#F7941D]'
                              : 'border-gray-200 hover:border-gray-300 text-charcoal'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quantity</label>
            <div className="flex items-center space-x-3">
              <div className="flex items-center border border-gray-200 rounded-premium overflow-hidden">
                <button 
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="p-2.5 text-gray-500 hover:bg-gray-50 transition-premium"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-bold text-charcoal">{quantity}</span>
                <button 
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="p-2.5 text-gray-500 hover:bg-gray-50 transition-premium"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Re-aligned Trust Information Strip (Pincode Check removed) */}
          <div className="rounded-premium border border-gray-100 bg-white p-4 shadow-premium">
            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-500">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4.5 w-4.5 text-[#F7941D] stroke-[1.5]" /> 
                <div>
                  <p className="text-charcoal leading-tight">Easy Exchange</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Accepted within 3 days. No Refunds • Exchange Only</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-[#F7941D] stroke-[1.5]" />
                <div>
                  <p className="text-charcoal leading-tight">Verified Manufacturer</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">GST Invoices & Quality Checks</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Actions — desktop only (mobile uses sticky bar below) */}
          <div className="hidden md:flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
              className={`flex items-center justify-center gap-2 rounded-premium border-2 px-4 py-3.5 text-sm font-bold transition-premium ${
                wishlist.includes(product.id) ? 'border-red-500 text-red-500 bg-red-50' : 'border-gray-200 text-gray-500 hover:border-red-500 hover:text-red-500 hover:bg-red-50/50'
              }`}
              title={wishlist.includes(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart className="h-5 w-5" fill={wishlist.includes(product.id) ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => { addToCart(product, selectedVariants, quantity); window.showAlert(`${quantity}x items added to your cart!`, "Cart Updated"); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-premium border-2 border-charcoal/90 px-4 py-3.5 text-sm font-bold text-charcoal hover:bg-gray-50 transition-premium"
            >
              <ShoppingCart className="h-4.5 w-4.5" /> Add to Shopping Bag
            </button>
            <button
              onClick={() => initiateQuickPurchase(product, selectedVariants, paymentOption)}
              className="flex-1 rounded-premium bg-[#F7941D] px-6 py-3.5 text-sm font-black text-white hover:bg-[#E07D10] transition-premium shadow-md shadow-orange-500/10 hover:scale-[1.01]"
            >
              Instant Purchase (Buy Now)
            </button>
          </div>

          {/* Highlights & Features */}
          {highlights && highlights.length > 0 && (
            <div className="pt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Product Highlights</h4>
              <ul className="space-y-2 text-xs font-medium text-gray-600">
                {highlights.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#F7941D] text-sm shrink-0">✦</span>
                    <span className="leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Product Description */}
          {product.description && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Product Details</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                {product.description}
              </p>
            </div>
          )}

          {/* CUSTOMER REVIEWS (ADVANCED REVIEW SYSTEM) */}
          <div className="border-t border-gray-100 pt-6 space-y-6">
            
            {/* Header with Title & Sorting & Eligibility */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-extrabold text-charcoal uppercase tracking-wider">Verified Customer Reviews</h4>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">({reviewSummary.totalCount} total approved comments)</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Sorting Dropdown */}
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D] font-semibold"
                >
                  <option value="recent">Most Recent</option>
                  <option value="high_rating">Highest Rating</option>
                  <option value="low_rating">Lowest Rating</option>
                  <option value="helpful">Most Helpful</option>
                  <option value="photo">Photo Reviews</option>
                </select>

                {/* Eligibility-based write button */}
                {eligibility.checked && (
                  eligibility.eligible ? (
                    <button 
                      onClick={() => {
                        setReviewError("");
                        setReviewSuccess("");
                        setIsReviewModalOpen(true);
                      }} 
                      className="text-xs font-bold text-white bg-[#F7941D] hover:bg-[#E07D10] px-3.5 py-1.5 rounded-premium shadow transition"
                    >
                      Write a Review
                    </button>
                  ) : (
                    <span className="text-[10px] max-w-[200px] text-right font-bold text-gray-400 leading-tight">
                      {eligibility.message}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* REVIEW SUMMARY STATISTICS (Requirement 9) */}
            {reviewSummary.totalCount > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 rounded-premium border border-gray-100 p-5 items-center">
                
                {/* Big average card */}
                <div className="text-center md:border-r border-gray-200/60 pr-2">
                  <p className="text-3xl font-black text-charcoal">{reviewSummary.averageRating}</p>
                  <div className="flex justify-center text-amber-400 my-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 fill-current ${
                          i < Math.round(reviewSummary.averageRating) ? 'text-amber-400' : 'text-gray-200'
                        }`} 
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Out of 5 Stars</p>
                  <p className="text-xs text-gray-500 font-semibold mt-1">Based on {reviewSummary.totalCount} ratings</p>
                </div>

                {/* Percentage bars */}
                <div className="md:col-span-2 space-y-2">
                  {[5, 4, 3, 2, 1].map((starsCount) => {
                    const count = reviewSummary.breakdown[starsCount] || 0;
                    const pct = reviewSummary.totalCount > 0 ? Math.round((count / reviewSummary.totalCount) * 100) : 0;
                    return (
                      <div key={starsCount} className="flex items-center text-xs font-semibold text-gray-600 gap-3">
                        <span className="w-10 text-right whitespace-nowrap">{starsCount} star</span>
                        <div className="flex-1 h-2 rounded bg-gray-200 overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 rounded transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-gray-400">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CUSTOMER PHOTOS GALLERY STRIP (Requirement 10) */}
            {reviewSummary.allImages && reviewSummary.allImages.length > 0 && (
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-[#F7941D]" /> Customer Uploaded Photos ({reviewSummary.allImages.length})
                </h5>
                <div className="flex flex-wrap gap-2.5">
                  {reviewSummary.allImages.map((photo, index) => (
                    <div 
                      key={index}
                      onClick={() => setPreviewImage(photo.imageUrl)}
                      className="cursor-pointer w-16 h-16 rounded-premium border border-gray-200 bg-gray-50 overflow-hidden hover:border-[#F7941D] transition-premium shadow-sm hover:scale-105"
                    >
                      <img src={photo.imageUrl} alt="Review attachment" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REVIEWS PAGINATED LIST */}
            <div className="space-y-4">
              {reviews && reviews.length > 0 ? (
                reviews.map((rev) => {
                  let parsedImages = [];
                  if (Array.isArray(rev.images)) {
                    parsedImages = rev.images;
                  } else {
                    try {
                      parsedImages = JSON.parse(rev.images || "[]");
                    } catch (e) {
                      parsedImages = [];
                    }
                  }
                  return (
                    <div key={rev.id} className="rounded-premium bg-white border border-gray-100 p-5 space-y-4 shadow-premium">
                      
                      {/* Top Header Section: Avatar & Name & Stars & Date */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 uppercase ${
                            ['bg-orange-50 text-orange-600', 'bg-indigo-50 text-indigo-600', 'bg-emerald-50 text-emerald-600', 'bg-rose-50 text-rose-600', 'bg-amber-50 text-amber-600'][
                              (rev.customerName || rev.user?.name || 'A').charCodeAt(0) % 5
                            ]
                          }`}>
                            {getInitials(rev.customerName || rev.user?.name || 'Anonymous')}
                          </div>

                          {/* Name & Stars & Title */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-charcoal">
                              {rev.customerName || rev.user?.name || "Anonymous"}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5 text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 fill-current ${i < rev.rating ? 'text-amber-400' : 'text-gray-200'}`} />
                                ))}
                              </div>
                              {rev.title && <span className="font-extrabold text-charcoal text-xs">"{rev.title}"</span>}
                            </div>
                          </div>
                        </div>

                        {/* Date */}
                        <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                          {new Date(rev.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {/* Review Comment Text */}
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        {rev.comment}
                      </p>

                      {/* Attachable images preview within review */}
                      {parsedImages && parsedImages.length > 0 && (
                        <div className="flex gap-2 pt-0.5">
                          {parsedImages.map((img, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setPreviewImage(img)}
                              className="cursor-pointer w-14 h-14 rounded-premium border border-gray-200 overflow-hidden bg-gray-50 hover:border-[#F7941D] transition-premium shadow-sm hover:scale-105"
                            >
                              <img src={img} alt="Attached upload" className="w-full h-full object-cover" loading="lazy" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Admin replies block */}
                      {rev.reply && (
                        <div className="pl-3 border-l-2 border-[#F7941D] text-[11px] text-gray-500 bg-orange-50/20 py-2 pr-2 rounded">
                          <strong className="text-charcoal block mb-0.5">Seller Reply:</strong>
                          "{rev.reply}"
                        </div>
                      )}

                      {/* Footer Info: Verified badge & Purchase Month & Helpful vote button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-50 text-[10px] font-bold text-gray-400">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            ✔ Verified Purchase
                          </span>
                          {rev.purchaseMonth && (
                            <span className="text-gray-400 font-semibold">
                              Purchased in {rev.purchaseMonth}
                            </span>
                          )}
                        </div>

                        {/* Helpful button */}
                        <button 
                          onClick={() => handleHelpfulVote(rev.id)}
                          className={`flex items-center gap-1 text-[11px] px-3 py-1 border rounded-full transition-premium ${
                            rev.voted 
                              ? 'bg-orange-50 border-[#F7941D] text-[#F7941D]' 
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:text-charcoal'
                          }`}
                        >
                          <span>👍 {rev.helpfulCount || 0} Helpful</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">No reviews matched your filters.</p>
              )}
            </div>

            {/* Load More Button (Requirement 12) */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleViewAll}
                  disabled={isLoadingReviews}
                  className="rounded-premium border border-[#F7941D] px-8 py-3 text-sm font-bold text-[#F7941D] hover:bg-orange-50 transition"
                >
                  {isLoadingReviews ? "Loading Reviews..." : `View All Reviews (${reviewSummary.totalCount})`}
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* DYNAMIC RELATED PRODUCTS SECTION */}
      {relatedProducts.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 mt-16 md:px-8 border-t border-gray-50 pt-8">
          <h3 className="text-base font-extrabold text-charcoal uppercase tracking-wider mb-6">You May Also Like</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {relatedProducts.map(item => {
              const mainImg = typeof item.images === 'string' ? JSON.parse(item.images)[0] : item.images[0];
              return (
                <div 
                  key={item.id}
                  onClick={() => { setSelectedProductId(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="group cursor-pointer border border-gray-100 rounded-premium overflow-hidden bg-white hover:border-gray-200 transition-premium shadow-sm hover:shadow"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden relative">
                    <img src={mainImg} alt={item.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-all duration-300" />
                  </div>
                  <div className="p-3 text-xs">
                    <h4 className="font-bold text-charcoal line-clamp-1 group-hover:text-[#F7941D]">{item.name}</h4>
                    <p className="font-black text-[#F7941D] mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MOBILE STICKY BUY BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3 flex items-center justify-between gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] lg:hidden pb-6">
        <button 
          onClick={() => {
            addToCart(product, selectedVariants, quantity);
            if (window.showAlert) {
              window.showAlert("Items added to bag!", "Cart Updated");
            }
          }}
          className="flex-1 border border-gray-200 py-3 rounded-premium text-xs font-bold text-charcoal bg-white active:bg-gray-50 flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          <ShoppingCart size={14} /> Add to Cart
        </button>
        <button 
          onClick={() => initiateQuickPurchase(product, selectedVariants, paymentOption)}
          className="flex-1 bg-[#F7941D] py-3 rounded-premium text-xs font-bold text-white hover:bg-[#E07D10] transition-colors shadow flex items-center justify-center min-h-[44px]"
        >
          Buy Now
        </button>
      </div>

      {/* WRITE A REVIEW MODAL POPUP (AUTOMATED ORDER ID AND USER FIELDS) */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative p-6">
            <button 
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-charcoal bg-gray-50 hover:bg-gray-100 p-1 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-charcoal mb-4 flex items-center gap-2">
              📝 Write a Review
            </h3>

            {reviewSuccess ? (
              <div className="p-3 mb-4 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                {reviewSuccess}
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                
                {reviewError && (
                  <div className="p-3 mb-2 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                    {reviewError}
                  </div>
                )}

                {/* Rating Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rating Score *</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                        className="text-amber-400 hover:scale-110 transition"
                      >
                        <Star className={`h-6 w-6 ${star <= reviewForm.rating ? 'fill-current text-amber-400' : 'text-gray-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Review Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={reviewForm.title}
                    onChange={e => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Excellent purchase experience" 
                    className="w-full border rounded p-2 text-xs outline-none focus:border-[#F7941D]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Your Review *</label>
                  <textarea 
                    required 
                    rows={4}
                    value={reviewForm.comment}
                    onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="What did you like or dislike about the product?" 
                    className="w-full border rounded p-2 text-xs outline-none focus:border-[#F7941D]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Upload Images (Optional)</label>
                  <input 
                    type="file" 
                    multiple 
                    disabled // Optional mockup placeholder logic
                    accept="image/*" 
                    className="w-full border p-1 rounded text-[10px] opacity-60" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingReview}
                  className="w-full bg-[#F7941D] text-white py-2.5 rounded-premium text-xs font-bold hover:bg-[#e5891b] transition shadow disabled:opacity-50"
                >
                  {isSubmittingReview ? "Submitting Review..." : "Submit Review"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FULL PREVIEW MODAL FOR CUSTOMER IMAGES */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white bg-black/45 hover:bg-black/80 p-2 rounded-full transition"
            >
              <X className="h-6 w-6" />
            </button>
            <img src={previewImage} alt="Large Attachment View" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
          </div>
        </div>
      )}

      {/* ============================================================
          MOBILE STICKY PURCHASE BAR
          Shown on mobile only — hidden on md+
          Sits above the bottom nav (uses --bottom-nav-height offset)
      ============================================================ */}
      <div className="sticky-purchase-bar md:hidden">
        <button
          onClick={() => {
            addToCart(product, selectedVariants, quantity);
            window.showAlert?.(`${quantity}x added to cart!`, 'Cart Updated');
          }}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-[#f7941d] bg-white py-3 text-sm font-bold text-[#f7941d] active:bg-orange-50"
          style={{ minHeight: 48 }}
        >
          <ShoppingCart size={18} />
          Add to Cart
        </button>
        <button
          onClick={() => initiateQuickPurchase(product, selectedVariants, paymentOption)}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#f7941d] py-3 text-sm font-black text-white shadow-sm active:bg-[#e07d10]"
          style={{ minHeight: 48 }}
        >
          ⚡ Buy Now
        </button>
      </div>

    </div>
  );
}
