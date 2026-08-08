import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';

const WishlistPage = () => {
  const { wishlist, products, setCurrentView } = useContext(AppContext);

  // Get full product objects for the items in the wishlist
  const wishlistProducts = products.filter(product => wishlist.includes(product.id));

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <div className="bg-white border-b border-gray-100 mb-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-charcoal flex items-center gap-2">
              <Heart className="h-6 w-6 text-[#F7941D] fill-current" /> 
              My Wishlist
            </h1>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {wishlistProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Heart className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-charcoal mb-2">Your Wishlist is Empty</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Save products you love so you can find them later.
            </p>
            <button
              onClick={() => setCurrentView('home')}
              className="bg-[#F7941D] text-white px-6 py-2.5 rounded-md font-bold hover:bg-[#e5891b] transition-colors flex items-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {wishlistProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
