import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Package, Search, ChevronRight, AlertCircle, ShoppingBag } from 'lucide-react';
import apiClient from '../api/client';

export default function OrdersPage() {
  const {
    orderHistory,
    userProfile,
    setCurrentView,
    setTrackingOrderId,
    showToast,
  } = useContext(AppContext);

  // Guest track lookup states
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!searchOrderId.trim()) {
      setErrorMsg('Please enter an Order ID.');
      return;
    }
    if (!searchPhone.trim()) {
      setErrorMsg('Please enter your mobile phone number.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Validate order exists and details match
      const res = await apiClient.post('/orders/public/track', {
        orderId: searchOrderId.trim(),
        phone: searchPhone.trim(),
      });
      if (res.data) {
        setTrackingOrderId(res.data.orderId || res.data.id);
        setCurrentView('order-tracking');
      } else {
        setErrorMsg('Order details not found. Verify details.');
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'No order found matching this Order ID and Mobile number.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8f8f8] pb-24 font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
        <h1 className="text-base font-black text-charcoal tracking-tight">My Orders</h1>
      </div>

      <div className="p-3 space-y-4">
        {/* Logged in orders history */}
        {userProfile && orderHistory.length > 0 ? (
          <div className="space-y-3">
            {orderHistory.map((order) => {
              // Find first item image
              const firstItem = order.items?.[0];
              const firstItemName = firstItem?.productName || firstItem?.product?.name || 'Order Item';
              const firstItemImage = firstItem?.productImage || (firstItem?.product?.images ? JSON.parse(firstItem.product.images)[0] : null);

              return (
                <div
                  key={order.orderId}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col space-y-3"
                >
                  <div className="flex space-x-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 flex items-center justify-center">
                      <img
                        src={firstItemImage || '/images/coffee_maker_1.jpg'}
                        alt={firstItemName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/images/coffee_maker_1.jpg';
                        }}
                      />
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="text-xs font-bold text-charcoal truncate">{firstItemName}</h4>
                        {order.items && order.items.length > 1 && (
                          <p className="text-[10px] text-gray-400 font-medium">
                            + {order.items.length - 1} more items
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">Order ID: #{order.orderId}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="text-xs font-black text-charcoal">₹{order.pricing?.finalTotal}</span>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                          · {order.paymentMethod === 'cod' ? 'COD' : 'Paid'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Simple Status Tracker */}
                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-[#F7941D]" />
                      <span className="text-[10px] font-extrabold uppercase text-[#F7941D] tracking-wide">
                        {order.status}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setTrackingOrderId(order.orderId);
                        setCurrentView('order-tracking');
                      }}
                      className="flex items-center text-[10px] font-extrabold uppercase text-charcoal tracking-wider hover:text-[#F7941D]"
                    >
                      View Order <ChevronRight size={12} className="ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : userProfile ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
            <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-charcoal">No Orders Found</h3>
            <p className="text-[10px] text-gray-400 mt-1">You have not placed any orders yet.</p>
          </div>
        ) : null}

        {/* Guest Order Tracking Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-charcoal uppercase tracking-wider">Track Guest Order</h3>
            <p className="text-[10px] text-gray-400">Enter your details to trace your order shipping timeline.</p>
          </div>

          <form onSubmit={handleTrackSubmit} className="space-y-3">
            <div>
              <label htmlFor="track_order_id" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                Order ID
              </label>
              <input
                id="track_order_id"
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="ODR-XXXXXX"
                className="w-full bg-gray-50 border border-gray-100 rounded-premium px-3 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D] transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="track_phone" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                Mobile Number
              </label>
              <input
                id="track_phone"
                type="tel"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="10-digit phone number"
                className="w-full bg-gray-50 border border-gray-100 rounded-premium px-3 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D] transition-colors"
                required
              />
            </div>

            {errorMsg && (
              <div className="flex items-center space-x-1.5 text-red-500 bg-red-50 p-2.5 rounded-premium border border-red-100">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span className="text-[10px] font-bold">{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-charcoal text-white hover:bg-black font-extrabold text-xs py-3 rounded-premium tracking-wider uppercase transition-colors shadow-sm disabled:opacity-75 min-h-[44px]"
            >
              {loading ? 'Searching...' : 'Track Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
