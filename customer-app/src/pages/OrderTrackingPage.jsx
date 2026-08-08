import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeft, Check, Truck, MapPin, Package, RefreshCcw, CheckCircle } from 'lucide-react';
import apiClient from '../api/client';

export default function OrderTrackingPage() {
  const { trackingOrderId, setCurrentView, showToast } = useContext(AppContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackingOrderId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await apiClient.get(`/orders/track/${trackingOrderId}`);
        if (res.data) {
          setOrder(res.data.order || res.data);
        } else {
          showToast('Failed to load tracking info', 'error');
        }
      } catch (err) {
        showToast('Error loading tracking info', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [trackingOrderId]);

  if (!trackingOrderId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h2 className="text-2xl font-black text-charcoal tracking-tight mb-4">No order selected</h2>
        <button 
          onClick={() => setCurrentView('profile')}
          className="rounded-premium bg-[#F7941D] px-8 py-3.5 text-xs font-black text-white hover:bg-[#E07D10] transition-premium shadow-md shadow-orange-500/10"
        >
          Go to My Orders
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 font-bold text-xs animate-pulse">
        Loading tracking information...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h2 className="text-2xl font-black text-charcoal tracking-tight mb-4">Tracking info not found</h2>
        <button 
          onClick={() => setCurrentView('profile')}
          className="rounded-premium bg-[#F7941D] px-8 py-3.5 text-xs font-black text-white hover:bg-[#E07D10] transition-premium shadow-md shadow-orange-500/10"
        >
          Go to My Orders
        </button>
      </div>
    );
  }

  if (order.status?.toLowerCase() === 'pending' || (!order.trackingEvents && !order.courier)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h2 className="text-2xl font-black text-charcoal tracking-tight mb-4">Your order is confirmed.</h2>
        <p className="text-sm font-semibold text-gray-500 mb-6">Tracking details will appear once shipped.</p>
        <button 
          onClick={() => setCurrentView('profile')}
          className="rounded-premium bg-[#F7941D] px-8 py-3.5 text-xs font-black text-white hover:bg-[#E07D10] transition-premium shadow-md shadow-orange-500/10"
        >
          Go to My Orders
        </button>
      </div>
    );
  }

  const statuses = [
    { id: 'confirmed', label: 'Confirmed', icon: Check },
    { id: 'packed', label: 'Packed', icon: Package },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle }
  ];

  if (order.status?.toLowerCase() === 'exchange_requested' || order.status?.toLowerCase() === 'completed') {
    if (order.status?.toLowerCase() === 'exchange_requested') {
      statuses.push({ id: 'exchange_requested', label: 'Exchange Requested', icon: RefreshCcw });
    } else {
      statuses.push({ id: 'completed', label: 'Completed', icon: CheckCircle });
    }
  }

  const currentStatusIndex = statuses.findIndex(s => 
    s.id === order.status?.toLowerCase() || (s.id === 'shipped' && order.status?.toLowerCase() === 'on_the_way')
  );
  
  const activeIndex = currentStatusIndex >= 0 ? currentStatusIndex : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <button 
        onClick={() => setCurrentView('profile')}
        className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-charcoal mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> <span>Back to My Orders</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-5 border-b border-gray-50 pb-3">
              Order Status: {order.orderId || order.id}
            </h3>

            <div className="relative flex flex-col md:flex-row justify-between gap-6 md:gap-2 mt-8">
              {statuses.map((step, index) => {
                const isCompleted = index < activeIndex;
                const isCurrent = index === activeIndex;
                const Icon = step.icon;
                
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex md:flex-col items-center gap-3 md:gap-2 text-center md:flex-1 relative z-10">
                      <div className={`rounded-full p-1.5 shrink-0 transition-all ${
                        isCompleted ? 'bg-emerald-500 text-white' : 
                        isCurrent ? 'bg-orange-50 border border-orange-200 text-[#F7941D] animate-pulse' : 
                        'bg-gray-50 border border-gray-200 text-gray-300'
                      }`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${
                          isCompleted ? 'text-charcoal' : 
                          isCurrent ? 'text-[#F7941D]' : 
                          'text-gray-400'
                        }`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                    {index < statuses.length - 1 && (
                      <div className={`hidden md:block flex-1 border-t-2 border-dashed mt-3 ${
                        index < activeIndex ? 'border-emerald-200' : 'border-gray-100'
                      }`}></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Real-time Tracking Timeline */}
            {order.trackingNumber && (
              <div className="mt-8 border-t border-gray-50 pt-6">
                <h4 className="text-xs font-extrabold text-charcoal uppercase tracking-wider mb-5 flex items-center gap-1.5">
                  📦 Real-time Shipment Logs ({order.courier || 'Delivery Partner'})
                </h4>
                <div className="relative pl-6 border-l-2 border-orange-100/70 ml-2 space-y-6">
                  {(order.trackingEvents && order.trackingEvents.length > 0) ? (
                    order.trackingEvents.map((evt, idx) => {
                      const displayStatus = evt.status === 'shipped' ? 'Shipped' :
                                            evt.status === 'on_the_way' ? 'On the Way' :
                                            evt.status === 'out_for_delivery' ? 'Out for Delivery' :
                                            evt.status === 'delivered' ? 'Delivered' : 
                                            evt.status === 'packed' ? 'Packed' : 'Confirmed';
                      return (
                        <div key={evt.id || idx} className="relative">
                          {/* Indicator dot */}
                          <div className={`absolute -left-[31px] top-0.5 h-3 w-3 rounded-full border-2 bg-white ${
                            idx === 0 ? 'border-[#F7941D] bg-[#F7941D]/10' : 'border-gray-300'
                          }`}></div>
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-black text-charcoal block">
                              {displayStatus}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 block">
                              {new Date(evt.eventDate || evt.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            {evt.message && (
                              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                {evt.message}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-400 font-bold text-xs py-2">
                      Awaiting shipping provider logs...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 border-b border-gray-50 pb-3">
              Order Details
            </h3>
            
            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 no-scrollbar mb-6">
              {(order.items || order.orderItems || []).map((item, idx) => (
                <div key={idx} className="flex gap-3 text-xs">
                  <div className="flex-1 space-y-0.5">
                    <h4 className="font-bold text-charcoal line-clamp-1">{item.name || `Product ID: ${item.productId}`}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">Qty: {item.quantity}</p>
                    <div className="text-right">
                      <span className="font-bold text-charcoal">₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-50 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Payment Method</span>
                <span className="text-charcoal font-bold uppercase">{order.paymentMethod || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Total Amount</span>
                <span className="text-charcoal font-bold">₹{(order.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            {order.address && (
               <div className="border-t border-gray-50 pt-4 mt-4 text-xs space-y-1">
                 <p className="font-bold text-charcoal uppercase mb-1">Shipping Address</p>
                 <p className="text-gray-500 font-semibold">{order.address.fullName || order.address.street}</p>
                 <p className="text-gray-500">{order.address.city}, {order.address.state} - {order.address.pincode}</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
