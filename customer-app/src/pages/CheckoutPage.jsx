import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import AddressForm from '../components/AddressForm';
import { 
  MapPin, 
  Truck, 
  CreditCard, 
  Trash2, 
  Plus, 
  Check, 
  HelpCircle,
  Percent,
  Lock,
  ArrowLeft,
  X,
  Info
} from 'lucide-react';

export default function CheckoutPage() {
  const {
    cart,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    addAddress,
    selectedShippingMethod,
    setSelectedShippingMethod,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    couponConfig,
    removeFromCart,
    updateCartQty,
    placeOrder,
    setCurrentView,
    orderProcessing,
    userPincode,
    validateAndSetPincode,
    storeSettings,
    userProfile
  } = useContext(AppContext);

  // Address Modal/Form active toggler
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle address save from AddressForm component
  const handleAddNewAddress = async (payload) => {
    const res = await addAddress({
      ...payload,
      isDefault: addresses.length === 0
    });
    if (res && res.success) {
      showToast('✓ Address saved successfully', 'success');
      setIsAddingAddress(false);
    } else {
      showToast('✖ Unable to save address. Please try again.', 'error');
    }
  };

  // Calculate pricing breakdown
  const subtotal = cart.reduce((acc, item) => {
    const itemPrice = selectedPaymentMethod === 'cod'
      ? (item.codPrice !== null && item.codPrice !== undefined ? item.codPrice : item.price)
      : (item.onlinePrice !== null && item.onlinePrice !== undefined ? item.onlinePrice : item.price);
    return acc + (itemPrice * item.quantity);
  }, 0);
  const originalSubtotal = cart.reduce((acc, item) => acc + (item.originalPrice * item.quantity), 0);
  
  const shippingCharge = selectedShippingMethod === "express" ? 150 : 0;
  const isOnline = selectedPaymentMethod !== "cod";
  const isCouponValid = couponConfig.enabled && new Date(couponConfig.expiry) > new Date() && subtotal >= couponConfig.minPurchase;
  const activeDiscountPct = (isOnline && isCouponValid) ? couponConfig.discountPct : 0;
  const onlineDiscount = Math.round(subtotal * (activeDiscountPct / 100));
  const totalSavings = (originalSubtotal - subtotal) + onlineDiscount;
  const finalPrice = subtotal + shippingCharge - onlineDiscount;



  const handleCompletePayment = async () => {
    if (orderProcessing) return;
    if (addresses.length === 0 || !selectedAddressId) {
      showToast("⚠ Please add a delivery address.", "warning");
      return;
    }
    if (!selectedPaymentMethod) {
      showToast("⚠ Please select a payment method.", "warning");
      return;
    }

    try {
      await placeOrder();
    } catch (err) {
      showToast("✖ Unable to process payment.", "error");
    }
  };

  // Get active address details to show
  const activeAddress = addresses.find(a => a.id === selectedAddressId) || addresses[0];

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="rounded-full bg-orange-50 h-16 w-16 flex items-center justify-center text-[#F7941D] mx-auto mb-4">
          <Truck className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-charcoal">Your Shopping Bag is Empty</h3>
        <p className="text-xs text-gray-400 mt-1 mb-6">Add premium Indian crafts to proceed with checkout.</p>
        <button 
          onClick={() => setCurrentView('home')}
          className="rounded-premium bg-[#F7941D] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#E07D10] transition-premium shadow"
        >
          Explore Crafts
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:bottom-8 md:right-8 z-50 p-4 rounded-premium border shadow-lg flex items-center gap-3 animate-fade-in-up transition-all w-[90%] md:w-auto ${
          toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 
          toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 
          'border-orange-200 bg-orange-50 text-orange-700'
        }`}>
          <span className="text-sm font-bold flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Return link */}
      <button 
        onClick={() => setCurrentView('home')}
        className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-charcoal mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> <span>Continue Shopping</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CHECKOUT 3-STEPS FLOW */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: Address selection */}
          <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-[#F7941D]" /> 1. Shipping Address
              </h3>
              {!isAddingAddress && (
                <button 
                  onClick={() => setIsAddingAddress(true)}
                  className="text-xs font-bold text-[#F7941D] hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add New Address
                </button>
              )}
            </div>

            {isAddingAddress ? (
              // New shared AddressForm component
              <AddressForm
                userProfile={userProfile}
                onSubmit={handleAddNewAddress}
                onCancel={addresses.length > 0 ? () => setIsAddingAddress(false) : null}
                submitLabel="Save Address"
              />
            ) : (
              // Saved Addresses selector
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 text-center py-6 bg-gray-50/50 rounded-premium border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 mb-3">No saved address found.</p>
                    <button 
                      onClick={() => setIsAddingAddress(true)}
                      className="rounded-premium bg-charcoal px-6 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-premium shadow"
                    >
                      Add New Address
                    </button>
                  </div>
                ) : (
                  addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div 
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`relative cursor-pointer rounded-premium border p-4 transition-premium flex flex-col justify-between ${
                          isSelected 
                            ? 'border-[#F7941D] bg-orange-50/10 shadow-sm' 
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3 right-3 rounded-full bg-[#F7941D] p-0.5 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div>
                          <p className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                            {addr.fullName} 
                            {addr.isDefault && <span className="bg-gray-100 text-gray-500 text-[8px] font-bold px-1 py-0.2 rounded uppercase">Default</span>}
                          </p>
                          <p className="text-xs text-gray-500 font-semibold mt-1.5 leading-relaxed">{addr.addressLine}</p>
                          <p className="text-xs text-gray-400 font-semibold mt-0.5">{addr.city}, {addr.state} - <strong>{addr.pincode}</strong></p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-gray-50 text-[10px] text-gray-400 font-semibold">
                          📞 Phone: {addr.phone}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Delivery options */}
          <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 border-b border-gray-50 pb-3 flex items-center gap-2">
              <Truck className="h-4.5 w-4.5 text-[#F7941D]" /> 2. Delivery Method
            </h3>

            <div className="cursor-default rounded-premium border border-gray-100 bg-gray-50/50 p-4 flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-100 text-emerald-600 p-1.5 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-charcoal">Fast Delivery 🚚</h4>
                </div>
                <p className="text-[11px] text-gray-500 font-medium mt-1 leading-relaxed">
                  Estimated Delivery: {storeSettings?.deliveryEstimate || "2–4 Business Days"}
                </p>
              </div>
            </div>
          </div>

          {/* STEP 3: Payment method */}
          <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
            <div className="flex items-baseline justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-[#F7941D]" /> 3. Payment Method
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                ⚡ SSL Protected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* UPI */}
              <div 
                onClick={() => setSelectedPaymentMethod('upi')}
                className={`cursor-pointer rounded-premium border px-4 py-3 flex items-center justify-between transition-premium ${
                  selectedPaymentMethod === 'upi' ? 'border-[#F7941D] bg-orange-50/10' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-[#F7941D]" style={{ visibility: selectedPaymentMethod === 'upi' ? 'visible' : 'hidden' }}></div>
                  <span className="text-xs font-bold text-charcoal">Pay Online (Razorpay)</span>
                </div>
                {storeSettings?.onlineDiscount > 0 && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">-{storeSettings.onlineDiscount}%</span>}
              </div>

              {/* COD */}
              <div 
                onClick={() => setSelectedPaymentMethod('cod')}
                className={`cursor-pointer rounded-premium border px-4 py-3 flex items-center justify-between transition-premium ${
                  selectedPaymentMethod === 'cod' ? 'border-[#F7941D] bg-orange-50/10' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-[#F7941D]" style={{ visibility: selectedPaymentMethod === 'cod' ? 'visible' : 'hidden' }}></div>
                  <span className="text-xs font-bold text-charcoal">Cash On Delivery (COD)</span>
                </div>
                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">No online discount</span>
              </div>
            </div>

            {selectedPaymentMethod === 'upi' && (
              <div className="mt-4 p-3.5 rounded-premium bg-emerald-50/30 border border-emerald-100 text-[11px] text-emerald-800 font-semibold space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">🔒</span>
                  <span>Secure 256-bit SSL encrypted online payment via Razorpay.</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 font-bold ml-4">
                  <span>💳 Cards</span>
                  <span>•</span>
                  <span>📱 UPI</span>
                  <span>•</span>
                  <span>🏦 Netbanking</span>
                  <span>•</span>
                  <span>💼 Wallets</span>
                </div>
                {storeSettings?.onlineDiscount > 0 && (
                  <p className="text-[#F7941D] font-bold ml-4">🎉 Extra {storeSettings.onlineDiscount}% discount automatically applied for paying online!</p>
                )}
              </div>
            )}

            {/* Pay buttons action */}
            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-gray-400 stroke-[1.5]" /> Guaranteed Safe checkout
              </div>
              
              <button 
                onClick={handleCompletePayment}
                disabled={orderProcessing}
                className="rounded-premium bg-[#F7941D] px-8 py-3.5 text-xs font-black text-white hover:bg-[#E07D10] transition-premium shadow-md shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {orderProcessing ? 'Processing...' : `Complete Payment (₹${finalPrice.toLocaleString('en-IN')})`}
              </button>
            </div>
          </div>

        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div className="space-y-6">
          <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 border-b border-gray-50 pb-3">
              Order Summary
            </h3>

            {/* Items scroll */}
            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 no-scrollbar mb-6">
              {cart.map((item) => {
                const itemSavings = (item.originalPrice - item.price) * item.quantity;
                return (
                  <div key={item.cartItemId} className="flex gap-3 text-xs">
                    <div className="h-14 w-14 rounded overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <h4 className="font-bold text-charcoal line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold">
                        {item.size ? `Size: ${item.size} ` : ''} 
                        {item.color ? `Finish: ${item.color}` : ''}
                      </p>
                      
                      {/* Qty adjustments */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center space-x-2 border border-gray-100 rounded">
                          <button 
                            onClick={() => updateCartQty(item.cartItemId, item.quantity - 1)}
                            className="px-1.5 py-0.5 hover:bg-gray-50 font-black text-gray-400"
                          >
                            -
                          </button>
                          <span className="text-[10px] font-bold text-charcoal">{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQty(item.cartItemId, item.quantity + 1)}
                            className="px-1.5 py-0.5 hover:bg-gray-50 font-black text-gray-400"
                          >
                            +
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <span className="font-bold text-charcoal">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations breakdown block */}
            <div className="border-t border-gray-50 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Items Subtotal</span>
                <span className="text-charcoal font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              
              {isOnline && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" /> Online Payment Discount</span>
                  <span>-₹{onlineDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-500 font-medium">
                <span>Delivery Shipping Charge</span>
                <span className="text-charcoal font-semibold">
                  FREE
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                <span className="font-extrabold text-charcoal">Grand Total</span>
                <span className="text-lg font-black text-charcoal">₹{finalPrice.toLocaleString('en-IN')}</span>
              </div>

              {/* Total Savings badge */}
              {totalSavings > 0 && (
                <div className="mt-3 rounded bg-emerald-50 border border-emerald-100 p-2.5 text-[10px] font-bold text-emerald-700 text-center uppercase tracking-wide">
                  🎉 Total Session Savings: ₹{totalSavings.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
