import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import AddressForm from '../components/AddressForm';
import { MapPin, Truck, CreditCard, Check, Lock, ArrowLeft, Percent, X } from 'lucide-react';
import getImageUrl from '../utils/imageUrl';

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
  const [checkoutStep, setCheckoutStep] = useState(1);

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

  const isCodAllowed = checkoutItems.length === 0 || checkoutItems.every(item => item.codAvailable !== false);
  const isPrepaidAllowed = checkoutItems.length === 0 || checkoutItems.every(item => item.prepaidAvailable !== false);

  useEffect(() => {
    if (!isPrepaidAllowed && selectedPaymentMethod !== 'cod') {
      setSelectedPaymentMethod('cod');
    } else if (!isCodAllowed && selectedPaymentMethod === 'cod') {
      setSelectedPaymentMethod('upi');
    }
  }, [isPrepaidAllowed, isCodAllowed, selectedPaymentMethod, setSelectedPaymentMethod]);

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
  const onlineSubtotal = checkoutItems.reduce((acc, item) => {
    const p = item.onlinePrice !== null && item.onlinePrice !== undefined ? item.onlinePrice : item.price;
    return acc + (p * item.quantity);
  }, 0);

  const codSubtotal = checkoutItems.reduce((acc, item) => {
    const p = item.codPrice !== null && item.codPrice !== undefined ? item.codPrice : item.price;
    return acc + (p * item.quantity);
  }, 0);

  const subtotal = selectedPaymentMethod === 'cod' ? codSubtotal : onlineSubtotal;

  const originalSubtotal = checkoutItems.reduce((acc, item) => {
    const origPrice = item.originalPrice !== null && item.originalPrice !== undefined ? item.originalPrice : item.price;
    return acc + (origPrice * item.quantity);
  }, 0);
  
  const shippingCharge = selectedShippingMethod === "express" ? 150 : 0;
  const isOnline = selectedPaymentMethod !== "cod";
  const isCouponValid = couponConfig.enabled && new Date(couponConfig.expiry) > new Date() && onlineSubtotal >= couponConfig.minPurchase;
  const activeDiscountPct = (isOnline && isCouponValid) ? couponConfig.discountPct : 0;
  const onlineDiscount = isOnline ? Math.round(onlineSubtotal * (activeDiscountPct / 100)) : 0;
  
  const onlineFinalPrice = onlineSubtotal + shippingCharge - (isCouponValid ? Math.round(onlineSubtotal * (couponConfig.discountPct / 100)) : 0);
  const codFinalPrice = codSubtotal + shippingCharge;
  const finalPrice = selectedPaymentMethod === 'cod' ? codFinalPrice : onlineFinalPrice;
  
  // Total Savings should only calculate if there's actual savings. 
  const baseSavings = Math.max(0, originalSubtotal - subtotal);
  const totalSavings = baseSavings + onlineDiscount;

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
        <div className="rounded-full bg-[#0B1B2B]/10 h-16 w-16 flex items-center justify-center text-[#0B1B2B] mx-auto mb-4 border border-[#0B1B2B]/15">
          <Truck className="h-8 w-8" />
        </div>
        <h3 className="text-base font-black text-charcoal">Your checkout is empty</h3>
        <p className="text-xs text-gray-400 mt-1 mb-6">Explore our catalog to find items to purchase.</p>
        <button 
          onClick={() => setCurrentView('home')}
          className="rounded-premium bg-[#0B1B2B] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#071320] transition-colors shadow min-h-[44px]"
        >
          Explore Products
        </button>
      </div>
    );
  }

  const renderProgressHeader = () => (
    <div className="flex items-center justify-center gap-4 mb-6 text-sm font-bold text-gray-400 select-none pb-4 border-b border-gray-100">
      <button 
        onClick={() => { if (checkoutStep === 2) setCheckoutStep(1); }}
        disabled={checkoutStep === 1}
        className={`flex items-center gap-1.5 transition-colors ${
          checkoutStep === 1 ? 'text-[#0B1B2B] font-extrabold text-base' : 'text-[#1F9D55] hover:text-[#1F9D55] font-bold'
        }`}
      >
        {checkoutStep > 1 ? '✓' : '1'} Shipping Address
      </button>
      <span className="text-gray-300">──</span>
      <span className={`flex items-center gap-1.5 ${
        checkoutStep === 2 ? 'text-[#0B1B2B] font-extrabold text-base' : 'font-bold'
      }`}>
        2 Payment &amp; Order
      </span>
    </div>
  );

  return (
    <div className="mx-auto max-w-[700px] w-full px-4 py-4 md:py-8 font-sans">
      {toast && (
        <div className={`fixed left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-8 z-[110] p-3 rounded-xl border shadow-lg flex items-center gap-3 w-[90%] md:w-auto text-sm font-semibold ${
          toast.type === 'success' ? 'border-emerald-200 bg-[#1F9D55]/10 text-[#1F9D55]' :
          toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' :
          'border-teal-200 bg-[#0B1B2B]/10 text-teal-700'
        }`}
          style={{ bottom: 'calc(var(--bottom-nav-height, 60px) + 12px)' }}
        >
          <span className="flex-grow">{toast.message}</span>
          <button onClick={() => setToast(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={14} /></button>
        </div>
      )}

      <button
        onClick={() => {
          if (checkoutStep === 2) {
            setCheckoutStep(1);
          } else {
            setQuickPurchaseItem(null);
            setCurrentView('home');
          }
        }}
        className="flex items-center gap-1.5 text-base font-bold text-gray-500 hover:text-charcoal mb-5 transition-colors min-h-[48px]"
      >
        <ArrowLeft size={18} /> <span>Go Back</span>
      </button>

      {renderProgressHeader()}

      {checkoutStep === 1 && (
        <div className="space-y-5">
          {isAddingAddress || addresses.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-charcoal uppercase tracking-wider mb-4 border-b border-gray-50 pb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#0B1B2B]" /> Add Delivery Address
              </h3>
              
              {!userProfile && (
                <div className="bg-[#0B1B2B]/10/50 border border-[#0B1B2B]/15 p-3 rounded-xl text-xs font-bold text-[#071320] mb-4">
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
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-base font-black text-charcoal uppercase tracking-wider border-b border-gray-50 pb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#0B1B2B]" /> Shipping Address
              </h3>

              <div className="space-y-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div 
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`relative cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[#0B1B2B] bg-[#0B1B2B]/10/5 shadow-sm' 
                          : 'border-gray-150 hover:border-gray-200 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3 right-3 rounded-full bg-[#0B1B2B] p-0.5 text-white">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      <div>
                        <p className="text-base font-bold text-charcoal flex items-center gap-1.5">
                          {addr.fullName} 
                          {addr.isDefault && <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Default</span>}
                        </p>
                        <p className="text-sm text-gray-500 font-semibold mt-1.5 leading-relaxed">
                          {addr.houseFlatNumber}, {addr.streetRoadName}, {addr.areaLocality}
                        </p>
                        <p className="text-sm text-gray-400 font-semibold mt-0.5">{addr.city}, {addr.state} - <strong>{addr.pincode}</strong></p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400 font-semibold">
                        Phone: {addr.phone}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-50 flex flex-col gap-3">
                <button 
                  onClick={() => setIsAddingAddress(true)}
                  className="w-full rounded-xl border-2 border-dashed border-[#0B1B2B] hover:bg-[#0B1B2B]/10/10 text-sm font-bold text-[#0B1B2B] flex items-center justify-center gap-2"
                  style={{ minHeight: 48 }}
                >
                  + Add New Address
                </button>
                
                <button 
                  onClick={() => setCheckoutStep(2)}
                  disabled={!selectedAddressId}
                  className="w-full rounded-xl bg-[#0B1B2B] text-base font-black text-white hover:bg-[#071320] transition disabled:opacity-50 flex items-center justify-center"
                  style={{ minHeight: 52 }}
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {checkoutStep === 2 && (
        <div className="space-y-5">
          
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex justify-between items-center gap-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Delivery Address</p>
              {(() => {
                const addr = addresses.find(a => a.id === selectedAddressId) || addresses[0];
                if (!addr) return null;
                return (
                  <p className="text-sm font-semibold text-charcoal mt-1 leading-relaxed">
                    <strong>{addr.fullName}</strong> · {addr.houseFlatNumber}, {addr.streetRoadName}, {addr.city}, {addr.state} - {addr.pincode} ({addr.phone})
                  </p>
                );
              })()}
            </div>
            <button 
              onClick={() => setCheckoutStep(1)}
              className="text-xs font-bold text-[#0B1B2B] border border-[#0B1B2B]/20 px-3 py-1.5 rounded-lg hover:bg-[#0B1B2B]/10 transition shrink-0 min-h-[36px]"
            >
              Change
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-baseline justify-between border-b border-gray-50 pb-3">
              <h3 className="text-base font-black text-charcoal uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#0B1B2B]" /> Payment Method
              </h3>
              <span className="text-[10px] font-black text-[#1F9D55] bg-[#1F9D55]/10 px-2 py-0.5 rounded uppercase tracking-wider">
                🔒 Secure SSL
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {isPrepaidAllowed && (
                <div 
                  onClick={() => setSelectedPaymentMethod('upi')}
                  className={`cursor-pointer rounded-xl border p-4 flex items-center justify-between transition-all ${
                    selectedPaymentMethod === 'upi' ? 'border-[#0B1B2B] bg-[#0B1B2B]/10/5 shadow-sm' : 'border-gray-150 hover:border-gray-200'
                  }`}
                  style={{ minHeight: 64 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full border border-gray-300 flex items-center justify-center shrink-0">
                      {selectedPaymentMethod === 'upi' && <div className="h-2 w-2 rounded-full bg-[#0B1B2B]" />}
                    </div>
                    <div>
                      <span className="text-base font-bold text-charcoal block">Pay Online (UPI / Card)</span>
                      {storeSettings?.onlineDiscount > 0 && (
                        <span className="text-[10px] font-black text-[#1F9D55] bg-[#1F9D55]/10 px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">
                          Extra savings applied
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-[#0B1B2B]">₹{onlineFinalPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {isCodAllowed && (
                <div 
                  onClick={() => setSelectedPaymentMethod('cod')}
                  className={`cursor-pointer rounded-xl border p-4 flex items-center justify-between transition-all ${
                    selectedPaymentMethod === 'cod' ? 'border-[#0B1B2B] bg-[#0B1B2B]/10/5 shadow-sm' : 'border-gray-150 hover:border-gray-200'
                  }`}
                  style={{ minHeight: 64 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full border border-gray-300 flex items-center justify-center shrink-0">
                      {selectedPaymentMethod === 'cod' && <div className="h-2 w-2 rounded-full bg-[#0B1B2B]" />}
                    </div>
                    <div>
                      <span className="text-base font-bold text-charcoal block">Cash on Delivery (COD)</span>
                      <span className="text-[10px] text-gray-400 font-semibold block">Pay on delivery at doorstep</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-charcoal">
                      ₹{codFinalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!isCodAllowed && !isPrepaidAllowed && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold">
                ⚠️ Conflicting products in cart. Some items support COD only, while others support Online Payment only. Please checkout them separately.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-base font-black text-charcoal uppercase tracking-wider border-b border-gray-50 pb-3">
              Order Items
            </h3>

            <div className="space-y-3">
              {checkoutItems.map((item) => (
                <div key={item.cartItemId} className="flex gap-4 text-sm pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="h-16 w-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100 flex items-center justify-center">
                    <img src={getImageUrl(item.image) || "/images/coffee_maker_1.jpg"} alt={item.name} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-charcoal leading-snug line-clamp-1">{item.name}</h4>
                    {item.size || item.color ? (
                      <p className="text-[10px] text-gray-400 font-bold">
                        {item.size ? `Size: ${item.size} ` : ''} 
                        {item.color ? `· Color: ${item.color}` : ''}
                      </p>
                    ) : null}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-semibold">Qty: {item.quantity}</span>
                      <span className="font-bold text-charcoal">₹{((selectedPaymentMethod === 'cod' ? (item.codPrice || item.price) : (item.onlinePrice || item.price)) * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-50 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-500 font-semibold">
                <span>Items Price</span>
                <span className="text-charcoal font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              
              {isOnline && onlineDiscount > 0 && (
                <div className="flex justify-between text-[#1F9D55] font-bold">
                  <span className="flex items-center gap-1"><Percent className="h-4 w-4" /> Prepaid Discount</span>
                  <span>-₹{onlineDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-500 font-semibold">
                <span>Delivery Charges</span>
                <span className="text-[#1F9D55] font-bold">{shippingCharge === 0 ? 'FREE' : `₹${shippingCharge}`}</span>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                <span className="font-black text-charcoal text-base">Grand Total</span>
                <span className="text-xl font-black text-[#0B1B2B]">₹{finalPrice.toLocaleString('en-IN')}</span>
              </div>

              {totalSavings > 0 && (
                <div className="mt-3 rounded-xl bg-[#1F9D55]/10 border border-[#1F9D55]/20 p-3 text-xs font-black text-[#1F9D55] text-center uppercase tracking-wider">
                  🎉 Total Savings: ₹{totalSavings.toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
              <button 
                onClick={handleCompletePayment}
                disabled={orderProcessing || isAddingAddress}
                className="w-full rounded-xl bg-[#0B1B2B] text-base font-black text-white hover:bg-[#071320] transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ minHeight: 52 }}
              >
                {orderProcessing ? (
                  <><Loader className="h-5 w-5 animate-spin" /> Placing Order...</>
                ) : (
                  selectedPaymentMethod === 'cod' ? 'Confirm Cash on Delivery Order' : 'Pay Online & Place Order'
                )}
              </button>
              <p className="text-[10px] text-gray-400 font-bold text-center">🔒 SSL Encrypted Safe Checkout</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

function Loader({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12"></path>
    </svg>
  );
}
