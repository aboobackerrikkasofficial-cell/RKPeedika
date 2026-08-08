import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeft, Smartphone, CreditCard, X, Check, Lock } from 'lucide-react';

export default function PaymentSelectPage() {
  const { cart, setCurrentView, placeOrder, selectedShippingMethod, couponConfig, storeSettings } = useContext(AppContext);
  const [selectedUpiApp, setSelectedUpiApp] = useState(null);
  const [manualUpiId, setManualUpiId] = useState('');
  const [toast, setToast] = useState(null);

  const showLocalToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // UPI apps list
  const upiApps = [
    { id: 'gpay', name: 'Google Pay', icon: '💳' },
    { id: 'phonepe', name: 'PhonePe', icon: '📱' },
    { id: 'paytm', name: 'Paytm', icon: '💰' },
    { id: 'bhim', name: 'BHIM UPI', icon: '🏦' },
    { id: 'other', name: 'Other UPI', icon: '📲' },
  ];

  // UPI ID validation
  const isValidUpiId = (id) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(id);

  const handleProceed = async () => {
    if (!selectedUpiApp && !manualUpiId) {
      showLocalToast('Please select a UPI app or enter UPI ID', 'warning');
      return;
    }
    if (manualUpiId && !isValidUpiId(manualUpiId)) {
      showLocalToast('Invalid UPI ID format (e.g. name@okaxis)', 'warning');
      return;
    }
    
    // For now, since no gateway is configured, show info message
    showLocalToast('⚠ Payment gateway not configured. Contact admin to enable online payments.', 'warning');
    // When gateway is configured, this would:
    // 1. Call POST /api/payments/create-order
    // 2. Redirect to gateway
    // 3. On callback, call POST /api/payments/verify
    // 4. On success, navigate to 'success'
  };

  const subtotal = cart.reduce((acc, item) => {
    const itemPrice = (item.onlinePrice !== null && item.onlinePrice !== undefined ? item.onlinePrice : item.price);
    return acc + (itemPrice * item.quantity);
  }, 0);
  const isCouponValid = couponConfig.enabled && new Date(couponConfig.expiry) > new Date() && subtotal >= couponConfig.minPurchase;
  const activeDiscountPct = isCouponValid ? couponConfig.discountPct : 0;
  const onlineDiscount = Math.round(subtotal * (activeDiscountPct / 100));
  const finalShipping = selectedShippingMethod === "express" ? 150 : 0;
  const finalPrice = subtotal + finalShipping - onlineDiscount;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 relative">
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
        onClick={() => setCurrentView('checkout')}
        className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-charcoal mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> <span>Back to Checkout</span>
      </button>

      <div className="space-y-6">
        <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
          <div className="flex items-baseline justify-between mb-4 border-b border-gray-50 pb-3">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="h-4.5 w-4.5 text-[#F7941D]" /> UPI Payment
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {upiApps.map(app => (
              <div 
                key={app.id}
                onClick={() => { setSelectedUpiApp(app.id); setManualUpiId(''); }}
                className={`cursor-pointer rounded-premium border px-4 py-3 flex flex-col items-center justify-center transition-premium text-center ${
                  selectedUpiApp === app.id ? 'border-[#F7941D] bg-orange-50/10' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="text-2xl mb-2">{app.icon}</div>
                <span className="text-xs font-bold text-charcoal">{app.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Or Enter UPI ID manually</label>
            <input 
              type="text" 
              placeholder="e.g. name@okaxis"
              value={manualUpiId}
              onChange={(e) => { setManualUpiId(e.target.value); setSelectedUpiApp(null); }}
              className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
            />
          </div>
        </div>

        <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium opacity-60">
          <div className="flex items-baseline justify-between mb-4 border-b border-gray-50 pb-3">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-gray-400" /> Credit / Debit Card
            </h3>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider">
              Coming Soon
            </span>
          </div>
          <p className="text-xs text-gray-500 font-semibold">Card payments are currently disabled by the administrator.</p>
        </div>

        {/* Pay buttons action */}
        <div className="mt-6 pt-4 flex items-center justify-between">
          <div className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-gray-400 stroke-[1.5]" /> Secure Payment
          </div>
          
          <button 
            onClick={handleProceed}
            className="rounded-premium bg-[#F7941D] px-8 py-3.5 text-xs font-black text-white hover:bg-[#E07D10] transition-premium shadow-md shadow-orange-500/10"
          >
            Proceed to Pay (₹{finalPrice.toLocaleString('en-IN')})
          </button>
        </div>
      </div>
    </div>
  );
}
