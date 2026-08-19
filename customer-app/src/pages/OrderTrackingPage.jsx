import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeft, Check, Truck, MapPin, Package, RefreshCcw, CheckCircle, Search, AlertCircle, FileText, ChevronRight, MessageCircle, X } from 'lucide-react';
import apiClient from '../api/client';
import getImageUrl from '../utils/imageUrl';

export default function OrderTrackingPage() {
  const { 
    trackingOrderId, 
    setTrackingOrderId, 
    setCurrentView, 
    showToast, 
    orderHistory,
    recentlyViewed,
    products,
    setSelectedProductId
  } = useContext(AppContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isKnowMoreOpen, setIsKnowMoreOpen] = useState(false);

  // Form states for guest track lookup
  const [searchOrderId, setSearchOrderId] = useState(trackingOrderId || '');
  const [searchPhone, setSearchPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (trackingOrderId) {
      setSearchOrderId(trackingOrderId);
      
      const existing = orderHistory?.find(o => o.orderId === trackingOrderId);
      if (existing) {
        setOrder(existing);
        setLoading(false);
      } else {
        fetchOrderAuthenticated(trackingOrderId);
      }
    } else {
      setLoading(false);
    }
  }, [trackingOrderId, orderHistory]);

  // Attempt authenticated fetch (for logged in customers)
  const fetchOrderAuthenticated = async (id) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await apiClient.get(`/orders/track/${id}`);
      if (res.data) {
        setOrder(res.data.order || res.data);
      }
    } catch (err) {
      // Ignore error, fallback to guest track form if not logged in
      console.log('Guest user tracking order or not logged in.');
    } finally {
      setLoading(false);
    }
  };

  // Guest track search (public tracking)
  const handleTrackSearch = async (e) => {
    e.preventDefault();
    if (!searchOrderId.trim()) {
      setErrorMessage("Please enter an Order ID.");
      return;
    }
    if (!searchPhone.trim()) {
      setErrorMessage("Please enter your mobile phone number.");
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setOrder(null);

    try {
      const res = await apiClient.post('/orders/public/track', {
        orderId: searchOrderId.trim(),
        phone: searchPhone.trim()
      });
      if (res.data) {
        setOrder(res.data);
      } else {
        setErrorMessage("Order details not found. Verify details.");
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 
        err.response?.data?.message || 
        "Unauthorized: Mobile number does not match this Order ID."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTrackAnother = () => {
    setOrder(null);
    setTrackingOrderId(null);
    setCurrentView('orders');
  };

  const [cancelling, setCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!order) return;
    
    const confirmCancel = await window.showConfirm("Are you sure you want to cancel this order? This action cannot be undone.", "Cancel Order");
    if (!confirmCancel) return;

    setCancelling(true);
    try {
      const phoneToUse = searchPhone || order.shippingPhone || order.address?.phone;
      const res = await apiClient.put(`/orders/${order.id}/cancel`, { phone: phoneToUse });
      if (res.data && res.data.success) {
        showToast('Order cancelled successfully.', 'success');
        setOrder({
          ...order,
          status: 'cancelled',
          paymentStatus: order.paymentMethod === 'cod' ? 'failed' : order.paymentStatus
        });
      } else {
        showToast(res.data?.message || 'Failed to cancel order.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel order. Please login and try again.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!trackingOrderId && !order) {
      setCurrentView('orders');
    }
  }, [trackingOrderId, order, setCurrentView]);

  // Print friendly GST Invoice Helper
  const handlePrintInvoice = () => {
    if (!order) return;
    const invoiceWindow = window.open("", "_blank", "width=800,height=900");
    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Tax Invoice - ${order.orderId}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; color: #222; padding: 30px; font-size: 13px; line-height: 1.4; }
            .header { border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 5px; }
            .subtitle { font-size: 11px; text-align: center; color: #555; }
            .grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .grid-col { width: 48%; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
            th { border-bottom: 1px dashed #000; padding: 8px 4px; text-align: left; font-weight: bold; }
            td { padding: 8px 4px; border-bottom: 1px dotted #ccc; }
            .total-table { width: 45%; margin-left: auto; margin-top: 15px; }
            .total-table td { border-bottom: none; }
            .footer { border-top: 2px dashed #000; padding-top: 15px; text-align: center; font-size: 10px; margin-top: 40px; }
            .badge { border: 1px solid #000; padding: 2px 5px; display: inline-block; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="title">RK PEEDIKA</div>
            <div class="subtitle">E-Commerce Hub | GSTIN: 07AAACK8432K1ZX</div>
            <div class="subtitle">Registered Office: Kasaragod, Kerala, India - 671320</div>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="badge">TAX INVOICE / CASH MEMORANDUM</span>
          </div>

          <div class="grid">
            <div class="grid-col">
              <strong>SOLD BY (Seller):</strong><br/>
              RK Peedika Fulfillment Hub<br/>
              Kasaragod, Kerala, India - 671320<br/>
              GST Verified Partner: YES
            </div>
            <div class="grid-col" style="text-align: right;">
              <strong>INVOICE DETAILS:</strong><br/>
              Invoice No: RKP-${order.orderId}<br/>
              Date of Order: ${order.date || new Date(order.createdAt).toISOString().split('T')[0]}<br/>
              Payment Method: ${(order.paymentMethod || 'COD').toUpperCase()}<br/>
              Shipping Speed: ${(order.shippingMethod || 'Standard').toUpperCase()}
            </div>
          </div>

          <div class="grid" style="border-top: 1px dashed #000; padding-top: 15px;">
            <div class="grid-col">
              <strong>BILL TO / SHIP TO:</strong><br/>
              ${order.address?.fullName || order.shippingName || 'Customer'}<br/>
              ${order.address?.houseFlatNumber || ''} ${order.address?.streetRoadName || ''}<br/>
              ${order.address?.city || ''}, ${order.address?.state || ''} - ${order.address?.pincode || ''}<br/>
              Phone Contact: +91 ${order.address?.phone || order.shippingPhone || ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description of Goods</th>
                <th>HSN Code</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>GST Rate</th>
                <th style="text-align: right;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || order.orderItems || []).map(item => `
                <tr>
                  <td>
                    ${item.name || item.product?.name || 'Product'}<br/>
                    <small>Variant: ${item.size || 'Standard'} / ${item.color || 'Default'}</small>
                  </td>
                  <td>73239390</td>
                  <td>${item.quantity}</td>
                  <td>₹${(item.price || 0).toLocaleString('en-IN')}</td>
                  <td>18% (Incl)</td>
                  <td style="text-align: right;">₹${((item.price || 0) * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>This is a computer-generated tax invoice. No signature is required under section 12 of CGST Rules.</p>
            <p>Thank you for shopping with RK Peedika.</p>
          </div>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
  };

  const statuses = [
    { id: 'confirmed', label: 'Confirmed', icon: Check },
    { id: 'packed', label: 'Packed', icon: Package },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle }
  ];

  const currentStatusIndex = order ? statuses.findIndex(s => 
    s.id === order.status?.toLowerCase() || 
    (s.id === 'shipped' && order.status?.toLowerCase() === 'on_the_way') ||
    (s.id === 'confirmed' && order.status?.toLowerCase() === 'placed')
  ) : -1;
  
  const activeIndex = currentStatusIndex >= 0 ? currentStatusIndex : 0;

  if (loading || (!order && trackingOrderId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1B2B]"></div>
      </div>
    );
  }

  if (!order) {
    return null; // Will be redirected by useEffect
  }

  const firstItem = order.items?.[0] || order.orderItems?.[0] || {};
  const firstItemName = firstItem.productName || firstItem.product?.name || firstItem.name || 'RK Peedika Product';
  let firstItemImage = firstItem.productImage || firstItem.image;
  if (!firstItemImage && firstItem.product?.images) {
    try {
      firstItemImage = JSON.parse(firstItem.product.images)[0];
    } catch (e) {
      firstItemImage = null;
    }
  }
  const pricing = {
    subtotal: Math.round((order.amount || 0) + (order.discountAmount || 0)),
    discountAmount: Math.round(order.discountAmount || 0),
    finalTotal: Math.round(order.amount || 0)
  };

  const itemPrice = firstItem.price || pricing.finalTotal || order.amount || 0;
  
  // Get recently viewed products
  const recentlyViewedItems = (recentlyViewed || [])
    .map(id => (products || []).find(p => p.id === id))
    .filter(Boolean);

  // Pad with active products if recentlyViewed is empty or has < 3 products
  const displayRecentlyViewed = [...recentlyViewedItems];
  if (displayRecentlyViewed.length < 3 && products && products.length > 0) {
    const additional = products
      .filter(p => !displayRecentlyViewed.find(rp => rp.id === p.id))
      .slice(0, 3 - displayRecentlyViewed.length);
    displayRecentlyViewed.push(...additional);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 page-content-mobile bg-gray-50/50 min-h-screen pb-20">
      <div className="max-w-2xl mx-auto">
            {/* Product Card */}
            <div className="bg-white p-4 flex gap-4 mt-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)] cursor-pointer active:bg-gray-50 transition">
              <div className="w-[72px] h-[72px] bg-white border border-gray-200 p-0.5 rounded shrink-0 overflow-hidden flex items-center justify-center">
                <img 
                  src={getImageUrl(firstItemImage) || "/images/coffee_maker_1.jpg"} 
                  alt="Product" 
                  className="w-full h-full object-contain rounded-sm"
                  onError={(e) => { e.currentTarget.src = "/images/coffee_maker_1.jpg"; }}
                />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-bold text-charcoal tracking-tight">Order #{order.orderId || order.id}</h3>
                  <span className="text-sm font-black text-charcoal">₹{itemPrice}</span>
                </div>
                <p className="text-xs text-gray-700 mt-1 line-clamp-2 font-semibold">
                  {firstItemName}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 font-medium">
                  {firstItem.size ? `${firstItem.size} • ` : ''}{order.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
                </p>
              </div>
            </div>

            {/* Tracking Timeline */}
            <div className="bg-white px-4 py-5 mt-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex items-start gap-3 mb-8">
                <div className="bg-orange-100 p-1.5 rounded relative mt-0.5">
                  <div className="absolute -top-1 -left-1 bg-[#1F9D55] rounded-full p-0.5">
                    <ArrowLeft className="h-2.5 w-2.5 text-white rotate-180" strokeWidth={3} />
                  </div>
                  <Truck className="h-6 w-6 text-orange-500 fill-orange-500" strokeWidth={1} />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-charcoal">{order.status || 'Confirmed'}</h4>
                  <p className="text-xs text-gray-500 font-medium">Delivery by {new Date(new Date().setDate(new Date().getDate() + 5)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short'})}</p>
                </div>
              </div>

              <div className="relative mt-8 px-2 pb-6">
                {/* Horizontal Line Background */}
                <div className="absolute top-[11px] left-8 right-8 h-[3px] bg-gray-200"></div>
                {/* Horizontal Line Progress */}
                <div className="absolute top-[11px] left-8 h-[3px] bg-[#1F9D55] transition-all duration-500" style={{ width: `${(activeIndex / (statuses.length - 1)) * 100}%` }}></div>
                
                <div className="relative flex justify-between z-10">
                  {statuses.map((step, index) => {
                    const isCompleted = index <= activeIndex;
                    return (
                      <div key={step.id} className="flex flex-col items-center flex-1">
                        <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center border-[3px] border-white ring-2 ${
                          isCompleted ? 'bg-[#1F9D55] ring-[#1F9D55] text-white' : 'bg-gray-200 ring-gray-200 text-transparent'
                        }`}>
                          <Check className="h-3 w-3" strokeWidth={4} />
                        </div>
                        <span className={`text-[11px] font-bold mt-2 text-center leading-tight w-full ${isCompleted ? 'text-charcoal' : 'text-gray-500'}`}>{step.label}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{isCompleted ? new Date().toLocaleDateString('en-GB', {day:'numeric', month:'short'}) : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center px-1">
                {['shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'].includes((order.status || '').toLowerCase()) ? (
                  order.trackingUrl ? (
                    <a 
                      href={order.trackingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-[#1F9D55] hover:text-[#187c43] flex items-center justify-center gap-1.5 py-1 px-2.5 rounded bg-green-50 hover:bg-green-100 border border-green-200 transition-colors uppercase tracking-wider"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Track Live on {order.courier || 'Courier'} Website
                    </a>
                  ) : (
                    <span className="text-xs font-medium text-gray-500">Order confirmed, cancel unavailable.</span>
                  )
                ) : (
                  <button 
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    className="text-xs font-black text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 py-1.5 px-3 rounded text-center uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
                <button 
                  onClick={() => setIsKnowMoreOpen(true)}
                  className="text-xs font-bold text-[#b0076a] hover:underline text-center sm:text-right py-1"
                >
                  KNOW MORE
                </button>
              </div>
            </div>

            {/* Detailed Tracking Events Timeline */}
            {order.trackingEvents && order.trackingEvents.length > 0 && (
              <div className="bg-white p-5 mt-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <h4 className="text-xs font-black text-charcoal uppercase tracking-wider mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
                  <RefreshCcw className="h-3.5 w-3.5 text-orange-500" />
                  Live Tracking Updates
                </h4>
                <div className="relative pl-6 border-l-2 border-gray-100 ml-3 space-y-6 py-2">
                  {order.trackingEvents.map((evt, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div key={evt.id || idx} className="relative flex flex-col gap-1">
                        {/* Dot Indicator */}
                        <div className={`absolute -left-[31px] top-1.5 w-[9px] h-[9px] rounded-full border-2 border-white ring-2 ${
                          isFirst ? 'bg-orange-500 ring-orange-200' : 'bg-gray-300 ring-gray-100'
                        }`} />
                        
                        <div className="flex justify-between items-start gap-4">
                          <p className={`text-xs font-bold leading-tight ${isFirst ? 'text-charcoal' : 'text-gray-500'}`}>
                            {evt.message}
                          </p>
                          <span className="text-[10px] text-gray-400 font-medium shrink-0 text-right">
                            {new Date(evt.eventDate || evt.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                            <br />
                            {new Date(evt.eventDate || evt.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${
                          evt.status === 'delivered' ? 'text-[#1F9D55]' : evt.status === 'failed' ? 'text-red-500' : 'text-orange-500'
                        }`}>
                          {evt.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {order.address && (
              <div className="bg-white p-5 mt-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <h4 className="text-sm font-bold text-charcoal mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#4a90e2]" fill="currentColor" stroke="white" />
                  Delivery Address
                </h4>
                <div className="text-[13px] text-gray-600 space-y-1 pl-1">
                  <p className="font-medium text-charcoal">{order.address.fullName || order.shippingName}</p>
                  <p>{order.address.streetRoadName || order.address.street || ''}</p>
                  <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
                  <p className="mt-2 font-medium">Ph: {order.address.phone || order.shippingPhone}</p>
                </div>
              </div>
            )}
            
            {/* Price Details */}
            <div className="bg-white p-5 mt-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <h4 className="text-sm font-bold text-charcoal mb-3">Price Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-600">Total Product Price</span>
                  <span className="text-[13px] font-semibold text-charcoal">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-[#1F9D55]">Total Discounts</span>
                  <span className="text-[13px] font-semibold text-[#1F9D55]">-₹{pricing.discountAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-600">Shipping</span>
                  <span className="text-[13px] font-semibold text-[#1F9D55]">FREE</span>
                </div>
              </div>
              <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-charcoal">Total Amount</span>
                <span className="text-sm font-black text-charcoal">₹{pricing.finalTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-2 bg-gray-50 p-2 rounded flex justify-between items-center">
                <span className="text-[12px] text-gray-600">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid (Paid)'}</span>
                <span className="text-[12px] font-bold text-charcoal">₹{pricing.finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Recently Viewed Products */}
            {displayRecentlyViewed.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-charcoal mb-2 px-2">Recently Viewed</h3>
                <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar px-2">
                  {displayRecentlyViewed.map(item => {
                    const rawImg = typeof item.images === 'string' ? (() => { try { return JSON.parse(item.images)[0]; } catch { return ''; } })() : (Array.isArray(item.images) ? item.images[0] : '');
                    const mainImg = getImageUrl(rawImg);
                    return (
                      <div 
                        key={item.id}
                        onClick={() => { setSelectedProductId(item.id); setCurrentView('product'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="min-w-[130px] w-[130px] bg-white rounded-lg border border-gray-100 overflow-hidden flex flex-col shadow-sm cursor-pointer hover:border-gray-300 transition-premium"
                      >
                        <img src={mainImg || "/images/coffee_maker_1.jpg"} alt={item.name} className="w-full h-[110px] object-cover" />
                        <div className="p-2 flex flex-col gap-1">
                          <p className="text-[11px] font-semibold text-charcoal line-clamp-1">{item.name}</p>
                          <p className="text-xs font-black">₹{Number(item.price || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Help Button */}
            <div className="mt-6 flex justify-center pb-6">
              <a href="https://wa.me/919188072646" target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-sm font-bold text-[#b0076a] bg-pink-50 px-6 py-3 rounded-full border border-pink-100 shadow-sm transition hover:bg-pink-100">
                <MessageCircle className="h-5 w-5" />
                <span>NEED HELP WITH THIS ORDER?</span>
              </a>
            </div>

          </div>

      {/* Know More Cancellation Policy Modal */}
      {isKnowMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/35 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-premium p-6 flex flex-col relative animate-pop-in">
            <button 
              onClick={() => setIsKnowMoreOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-150 hover:text-gray-700 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-extrabold text-charcoal mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#b0076a]" />
              Cancellation Policy
            </h3>

            <div className="text-xs text-gray-500 space-y-3 font-semibold mb-6 leading-relaxed">
              <p>
                RK Peedika orders can only be cancelled before they are shipped. 
              </p>
              <p>
                You can cancel your order directly from this tracking screen anytime <strong className="text-charcoal">before it enters the "Shipped" status</strong>.
              </p>
              <p>
                Once an order is shipped, we cannot recall it from our logistics partners. If you need urgent assistance, changes, or address updates, please contact us.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <a 
                href="https://wa.me/919188072646?text=Hello%20RK%20Peedika,%20I%2520need%20help%20with%20my%20order" 
                target="_blank" 
                rel="noreferrer" 
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1F9D55] py-3 text-xs font-bold text-white hover:bg-[#187c43] transition shadow-sm"
              >
                <MessageCircle className="h-4.5 w-4.5" />
                Contact +91 9188072646 on WhatsApp
              </a>
              <button 
                onClick={() => setIsKnowMoreOpen(false)}
                className="w-full rounded-xl border border-gray-250 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
