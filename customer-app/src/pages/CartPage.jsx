import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';
import getImageUrl from '../utils/imageUrl';

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateCartQty,
    setCurrentView,
    storeSettings,
    setQuickPurchaseItem,
  } = useContext(AppContext);

  const cartCount = cart.reduce((t, i) => t + i.quantity, 0);

  // Subtotal calculation (assuming online/prepaid by default on cart overview)
  const subtotal = cart.reduce((acc, item) => {
    const itemPrice = item.onlinePrice !== null && item.onlinePrice !== undefined ? item.onlinePrice : item.price;
    return acc + (itemPrice * item.quantity);
  }, 0);

  const originalSubtotal = cart.reduce((acc, item) => {
    const origPrice = item.originalPrice !== null && item.originalPrice !== undefined ? item.originalPrice : item.price;
    return acc + (origPrice * item.quantity);
  }, 0);

  const totalDiscount = originalSubtotal - subtotal;
  const shippingCharges = storeSettings?.shippingCharges || 0;
  const finalTotal = subtotal + shippingCharges;

  const handleProceedToCheckout = () => {
    // Clear quick purchase item when checking out full cart
    if (setQuickPurchaseItem) {
      setQuickPurchaseItem(null);
    }
    setCurrentView('checkout');
  };

  if (cartCount === 0) {
    return (
      <div className="w-full min-h-screen bg-[#f8f8f8] pb-24 font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4 border border-gray-100">
          <ShoppingBag className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="text-base font-black text-charcoal">Your Cart is Empty</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
          Add items from our catalog to get started.
        </p>
        <button
          onClick={() => setCurrentView('home')}
          className="mt-6 px-6 py-3 bg-[#0B1B2B] text-white font-bold text-xs rounded-premium shadow hover:bg-[#071320] transition-colors min-h-[44px] cursor-pointer"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f8f8f8] pb-28 font-sans">
      {/* Sticky header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setCurrentView('home')} 
            className="p-1 rounded-full hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 text-charcoal" />
          </button>
          <h1 className="text-base font-black text-charcoal tracking-tight">Shopping Cart ({cartCount})</h1>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Cart items list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-3">
          {cart.map((item) => (
            <div key={item.cartItemId} className="flex space-x-3 pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
              <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 flex items-center justify-center">
                <img
                  src={getImageUrl(item.image) || "/images/coffee_maker_1.jpg"}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <h3 className="text-xs font-bold text-charcoal truncate">{item.name}</h3>
                  {item.size || item.color ? (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {item.size ? `Size: ${item.size}` : ''} {item.color ? `· Color: ${item.color}` : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-end justify-between mt-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-black text-charcoal">
                      ₹{(item.onlinePrice || item.price).toLocaleString('en-IN')}
                    </span>
                    {item.originalPrice && item.originalPrice > (item.onlinePrice || item.price) && (
                      <span className="text-[10px] text-gray-400 line-through">
                        ₹{item.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center border border-gray-100 rounded-premium h-8">
                    <button
                      onClick={() => updateCartQty(item.cartItemId, item.quantity - 1)}
                      className="px-2.5 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 min-w-[32px]"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-2.5 text-xs font-bold text-charcoal">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.cartItemId, item.quantity + 1)}
                      className="px-2.5 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 min-w-[32px]"
                      aria-label="Increase quantity"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h3 className="text-xs font-black text-charcoal uppercase tracking-wider">Price Details</h3>
          <div className="space-y-2 text-xs text-gray-500 font-medium">
            <div className="flex justify-between">
              <span>Total MRP</span>
              <span className="line-through text-gray-400">₹{originalSubtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[#1F9D55] font-bold">
              <span>Discount on MRP</span>
              <span>- ₹{totalDiscount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Charges</span>
              <span>{shippingCharges === 0 ? 'FREE' : `₹${shippingCharges}`}</span>
            </div>
            <div className="border-t border-gray-50 pt-3 flex justify-between text-sm font-black text-charcoal">
              <span>Order Total</span>
              <span className="text-[#0B1B2B]">₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3 flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:pb-6">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Total Price</p>
          <p className="text-base font-black text-[#0B1B2B]">₹{finalTotal.toLocaleString('en-IN')}</p>
        </div>
        <button
          onClick={handleProceedToCheckout}
          className="rounded-premium bg-[#0B1B2B] px-8 py-3 text-xs font-bold text-white hover:bg-[#071320] transition-colors shadow min-h-[44px] cursor-pointer"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
