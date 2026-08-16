import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import AddressForm from '../components/AddressForm';
import { MapPin, Truck, CreditCard, Check, Lock, ArrowLeft, Percent, X } from 'lucide-react';

export default function CheckoutPage() {
  const {
    cart,
    quickPurchaseItem,
    setQuickPurchaseItem,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    addAddress,
    selectedShippingMethod,
    setSelectedShippingMethod,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    couponConfig,
    updateCartQty,
    placeOrder,
    setCurrentView,
    orderProcessing,
    userPincode,
    storeSettings,
    userProfile,
    simpleLogin,
  } = useContext(AppContext);

  const [isAddingAddress, setIsAddingAddress] = useState(addresses.length === 0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // If user address book gets updated and has items, disable add-address inline screen
    if (addresses.length > 0) {
      setIsAddingAddress(false);
    } else {
      setIsAddingAddress(true);
    }
  }, [addresses]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const checkoutItems = quickPurchaseItem ? [quickPurchaseItem] : cart;

  // Handle address save from AddressForm component
  const handleAddNewAddress = async (payload) => {
    try {
      if (!userProfile) {
        // Authenticate guest user in background
        const loginRes = await simpleLogin(payload.fullName, payload.phone, true);
        if (!loginRes || !loginRes.success) {
          showToast('✖ Authentication failed. Please try a different name/mobile.', 'error');
          return;
        }
      }
      
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
    } catch (e) {
      showToast('✖ Error saving details. Please try again.', 'error');
    }
  };

  // Calculate pricing breakdown
  const subtotal = checkoutItems.reduce((acc, item) => {
    const itemPrice = selectedPaymentMethod === 'cod'
      ? (item.codPrice !== null && item.codPrice !== undefined ? item.codPrice : item.price)
      : (item.onlinePrice !== null && item.onlinePrice !== undefined ? item.onlinePrice : item.price);
    return acc + (itemPrice * item.quantity);
  }, 0);

  const originalSubtotal = checkoutItems.reduce((acc, item) => {
    const origPrice = item.originalPrice !== null && item.originalPrice !== undefined ? item.originalPrice : item.price;
    return acc + (origPrice * item.quantity);
  }, 0);
  
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

  if (checkoutItems.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center font-sans">
        <div className="rounded-full bg-orange-50 h-16 w-16 flex items-center justify-center text-[#F7941D] mx-auto mb-4 border border-orange-100">
          <Truck className="h-8 w-8" />
        </div>
        <h3 className="text-base font-black text-charcoal">Your checkout is empty</h3>
        <p className="text-xs text-gray-400 mt-1 mb-6">Explore our catalog to find items to purchase.</p>
        <button 
          onClick={() => setCurrentView('home')}
          className="rounded-premium bg-[#F7941D] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#E07D10] transition-colors shadow min-h-[44px]"
        >
          Explore Products
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 md:px-8 md:py-8 relative font-sans">
      {/* Local Toast */}
      {toast && (
        <div className={`fixed left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-8 z-[110] p-3 rounded-xl border shadow-lg flex items-center gap-3 w-[90%] md:w-auto text-sm font-semibold ${
          toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
          toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' :
          'border-orange-200 bg-orange-50 text-orange-700'
        }`}
          style={{ bottom: 'calc(var(--bottom-nav-height, 60px) + 12px)' }}
        >
          <span className="flex-grow">{toast.message}</span>
          <button onClick={() => setToast(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={14} /></button>
        </div>
      )}

      {/* Return link */}
      <button
        onClick={() => {
          setQuickPurchaseItem(null);
          setCurrentView('home');
        }}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-charcoal mb-4 transition-colors min-h-[44px]"
      >
        <ArrowLeft size={16} /> <span>Go Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CHECKOUT FLOW */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* STEP 1: Address selection */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-xs font-black text-charcoal uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-[#F7941D]" /> Shipping Address
              </h3>
              {!isAddingAddress && addresses.length > 0 && (
                <button 
                  onClick={() => setIsAddingAddress(true)}
                  className="text-xs font-bold text-[#F7941D] hover:underline flex items-center gap-1 min-h-[44px]"
                >
                  Change / Add Address
                </button>
              )}
            </div>

            {isAddingAddress ? (
              <div className="space-y-3">
                {!userProfile && (
                  <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-premium text-[11px] font-bold text-[#c26c0c] mb-2">
                    🔑 Enter your details to complete guest checkout. A free profile will be created for you automatically.
                  </div>
                )}
                <AddressForm
                  userProfile={userProfile}
                  onSubmit={handleAddNewAddress}
                  onCancel={addresses.length > 0 ? () => setIsAddingAddress(false) : null}
                  submitLabel="Deliver to this Address"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div 
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`relative cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[#F7941D] bg-orange-50/5 shadow-sm' 
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
                        <p className="text-xs text-gray-500 font-semibold mt-1.5 leading-relaxed">
                          {addr.houseFlatNumber}, {addr.streetRoadName}, {addr.areaLocality}
                        </p>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5">{addr.city}, {addr.state} - <strong>{addr.pincode}</strong></p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-50 text-[10px] text-gray-400 font-semibold">
                        Phone: {addr.phone}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: Delivery options */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black text-charcoal uppercase tracking-wider mb-4 border-b border-gray-50 pb-3 flex items-center gap-2">
              <Truck className="h-4.5 w-4.5 text-[#F7941D]" /> Delivery Method
            </h3>

            <div className="cursor-default rounded-xl border border-gray-100 bg-gray-50/50 p-4 flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-100 text-emerald-600 p-1 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-charcoal">Standard Home Delivery 🚚</h4>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  Delivery in {storeSettings?.deliveryEstimate || "2–4 Business Days"}
                </p>
              </div>
            </div>
          </div>

          {/* STEP 3: Payment method */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-xs font-black text-charcoal uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-[#F7941D]" /> Payment Method
              </h3>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                🔒 Secure SSL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* COD */}
              <div 
                onClick={() => setSelectedPaymentMethod('cod')}
                className={`cursor-pointer rounded-xl border px-4 py-3 flex items-center justify-between transition-all ${
                  selectedPaymentMethod === 'cod' ? 'border-[#F7941D] bg-orange-50/5' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-[#F7941D]" style={{ visibility: selectedPaymentMethod === 'cod' ? 'visible' : 'hidden' }}></div>
                  <span className="text-xs font-bold text-charcoal">Cash On Delivery (COD)</span>
                </div>
                <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Prepaid offer not active</span>
              </div>

              {/* Online Payment */}
              <div 
                onClick={() => setSelectedPaymentMethod('upi')}
                className={`cursor-pointer rounded-xl border px-4 py-3 flex items-center justify-between transition-all ${
                  selectedPaymentMethod === 'upi' ? 'border-[#F7941D] bg-orange-50/5' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-[#F7941D]" style={{ visibility: selectedPaymentMethod === 'upi' ? 'visible' : 'hidden' }}></div>
                  <span className="text-xs font-bold text-charcoal">Online Payment (UPI/Cards)</span>
                </div>
                {storeSettings?.onlineDiscount > 0 && (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    -{storeSettings.onlineDiscount}% Off
                  </span>
                )}
              </div>
            </div>

            {selectedPaymentMethod === 'upi' && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50/20 border border-emerald-100 text-[11px] text-emerald-800 font-semibold space-y-1">
                <p>🔒 Pay online securely using UPI, Debit/Credit Cards, or Wallets.</p>
                {storeSettings?.onlineDiscount > 0 && (
                  <p className="text-[#F7941D] font-bold">✨ Extra {storeSettings.onlineDiscount}% prepaid discount applied at summary.</p>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-xs text-gray-400 font-bold flex items-center gap-1">
                🔒 SSL Encrypted Checkout
              </div>
              
              <button 
                onClick={handleCompletePayment}
                disabled={orderProcessing || isAddingAddress}
                className="rounded-premium bg-[#F7941D] px-8 py-3 text-xs font-black text-white hover:bg-[#E07D10] transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {orderProcessing ? 'Placing Order...' : `Place Order (₹${finalPrice.toLocaleString('en-IN')})`}
              </button>
            </div>
          </div>

        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black text-charcoal uppercase tracking-wider mb-4 border-b border-gray-50 pb-3">
              Order Summary
            </h3>

            {/* Items scroll */}
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 no-scrollbar mb-4">
              {checkoutItems.map((item) => (
                <div key={item.cartItemId} className="flex gap-3 text-xs">
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100 flex items-center justify-center">
                    <img src={item.image || "/images/coffee_maker_1.jpg"} alt={item.name} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <h4 className="font-bold text-charcoal line-clamp-1">{item.name}</h4>
                    {item.size || item.color ? (
                      <p className="text-[9px] text-gray-400 font-bold">
                        {item.size ? `Size: ${item.size} ` : ''} 
                        {item.color ? `· Color: ${item.color}` : ''}
                      </p>
                    ) : null}
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500 font-semibold">Qty: {item.quantity}</span>
                      <span className="font-bold text-charcoal">₹{((selectedPaymentMethod === 'cod' ? (item.codPrice || item.price) : (item.onlinePrice || item.price)) * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations breakdown block */}
            <div className="border-t border-gray-50 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500 font-semibold">
                <span>Items Subtotal</span>
                <span className="text-charcoal font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              
              {isOnline && onlineDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" /> Prepaid Discount</span>
                  <span>-₹{onlineDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-500 font-semibold">
                <span>Delivery Shipping Charge</span>
                <span className="text-charcoal font-bold">{shippingCharge === 0 ? 'FREE' : `₹${shippingCharge}`}</span>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                <span className="font-black text-charcoal">Grand Total</span>
                <span className="text-base font-black text-[#F7941D]">₹{finalPrice.toLocaleString('en-IN')}</span>
              </div>

              {totalSavings > 0 && (
                <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 text-[9px] font-black text-emerald-700 text-center uppercase tracking-wider">
                  🎉 Total Savings: ₹{totalSavings.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
