import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { Heart, ArrowLeft } from 'lucide-react';

export default function WishlistPage() {
  const {
    wishlist,
    products,
    setCurrentView,
    userProfile,
    showToast,
  } = useContext(AppContext);

  // Filter products that are active and in the wishlist
  const wishlistedProducts = products.filter(
    (p) => wishlist?.includes(p.id) && p.status === 'active'
  );

  const handleBackToHome = () => {
    setCurrentView('home');
  };

  // If user is not logged in, show login prompt
  if (!userProfile) {
    return (
      <div className="w-full min-h-screen bg-[#FAFAFA] pb-24 font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4 border border-[#EDEDED]">
          <Heart className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="text-base font-black text-charcoal">Sign in to view your Wishlist</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
          Your wishlist items will be saved here so you can buy them later.
        </p>
        <button
          onClick={() => {
            showToast('🔑 Please sign in to access your wishlist', 'warning');
            setCurrentView('profile');
          }}
          className="mt-6 px-6 py-3 bg-[#0F7A6B] text-white font-bold text-xs rounded-full shadow hover:bg-[#0A5A4F] transition-all min-h-[44px] cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  if (wishlistedProducts.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#FAFAFA] pb-24 font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4 border border-[#EDEDED]">
          <Heart className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="text-base font-black text-charcoal">Your Wishlist is Empty</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
          Tap the heart icon on any product card to save items to your wishlist.
        </p>
        <button
          onClick={handleBackToHome}
          className="mt-6 px-6 py-3 bg-[#0F7A6B] text-white font-bold text-xs rounded-full shadow hover:bg-[#0A5A4F] transition-colors min-h-[44px] cursor-pointer"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] pb-28 font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-[#EDEDED] flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleBackToHome}
            className="p-1 rounded-full hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5 text-charcoal" />
          </button>
          <h1 className="text-base font-black text-charcoal tracking-tight">
            My Wishlist ({wishlistedProducts.length})
          </h1>
        </div>
      </div>

      {/* Grid */}
      <div className="p-3">
        <div className="product-grid">
          {wishlistedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
