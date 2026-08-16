import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeft, Check, Truck, MapPin, Package, RefreshCcw, CheckCircle, Search, AlertCircle, FileText } from 'lucide-react';
import apiClient from '../api/client';

export default function OrderTrackingPage() {
  const { trackingOrderId, setTrackingOrderId, setCurrentView, showToast } = useContext(AppContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states for guest track lookup
  const [searchOrderId, setSearchOrderId] = useState(trackingOrderId || '');
  const [searchPhone, setSearchPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (trackingOrderId) {
      setSearchOrderId(trackingOrderId);
      fetchOrderAuthenticated(trackingOrderId);
    } else {
      setLoading(false);
    }
  }, [trackingOrderId]);

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
    setSearchOrderId('');
    setSearchPhone('');
    setErrorMessage('');
  };

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 page-content-mobile">
      
      {/* Search/Lookup form shown when no order details are active */}
      {!order ? (
        <div className="mx-auto max-w-md bg-white rounded-premium border border-gray-100 p-6 shadow-premium">
          <h2 className="text-lg font-black text-charcoal mb-2 flex items-center gap-2">
            <Search className="h-5 w-5 text-[#F7941D]" /> Track Your Order
          </h2>
          <p className="text-xs text-gray-400 font-semibold mb-6">
            Enter your Order ID and mobile number to see real-time shipment updates.
          </p>

          {errorMessage && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-100 flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleTrackSearch} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Order ID Number</label>
              <input
                type="text"
                required
                value={searchOrderId}
                onChange={e => setSearchOrderId(e.target.value)}
                placeholder="e.g. 10001 or ID"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Mobile Phone Number</label>
              <input
                type="tel"
                required
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#F7941D] py-3 text-xs font-bold text-white shadow hover:bg-[#E07D10] disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Searching...' : 'Track Shipment'}
            </button>
          </form>
        </div>
      ) : (
        // TIMELINE AND SHIPPED LOGS CONTAINER
        <div>
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={handleTrackAnother}
              className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-charcoal"
            >
              <ArrowLeft className="h-4 w-4" /> <span>Track Another Order</span>
            </button>
            <button 
              onClick={handlePrintInvoice}
              className="flex items-center gap-1.5 text-xs font-bold text-[#F7941D] hover:underline"
            >
              <FileText className="h-4 w-4" /> Print Receipt
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Status Timeline */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
                <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-5 border-b border-gray-50 pb-3 flex items-center justify-between">
                  <span>Order Status: #{order.orderId || order.id}</span>
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    {order.status || 'Confirmed'}
                  </span>
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

                {/* Real-time Tracking Events Logs */}
                <div className="mt-8 border-t border-gray-50 pt-6">
                  <h4 className="text-xs font-extrabold text-charcoal uppercase tracking-wider mb-5 flex items-center gap-1.5">
                    📦 Real-time Shipment Logs ({order.courier || 'RK Delivery'})
                  </h4>
                  <div className="relative pl-6 border-l-2 border-orange-100/70 ml-2 space-y-6">
                    {(order.trackingEvents && order.trackingEvents.length > 0) ? (
                      order.trackingEvents.map((evt, idx) => {
                        return (
                          <div key={evt.id || idx} className="relative">
                            <div className={`absolute -left-[31px] top-0.5 h-3 w-3 rounded-full border-2 bg-white ${
                              idx === 0 ? 'border-[#F7941D] bg-[#F7941D]/10' : 'border-gray-300'
                            }`}></div>
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-black text-charcoal block">
                                {evt.status || 'Update'}
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
                        Awaiting shipping provider logs... Order is confirmed and processing at the hub.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Details summary */}
            <div className="space-y-6">
              <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
                <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 border-b border-gray-50 pb-3">
                  Summary Details
                </h3>
                
                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 no-scrollbar mb-6">
                  {(order.items || order.orderItems || []).map((item, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <div className="flex-1 space-y-0.5">
                        <h4 className="font-bold text-charcoal line-clamp-1">{item.name || item.product?.name || `Product ID: ${item.productId}`}</h4>
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
                     <p className="text-gray-500 font-semibold">{order.address.fullName}</p>
                     <p className="text-gray-500">{order.address.city}, {order.address.state} - {order.address.pincode}</p>
                   </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
