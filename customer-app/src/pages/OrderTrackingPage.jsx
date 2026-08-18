import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeft, Check, Truck, MapPin, Package, RefreshCcw, CheckCircle, Search, AlertCircle, FileText, ChevronRight, MessageCircle } from 'lucide-react';
import apiClient from '../api/client';

export default function OrderTrackingPage() {
  const { trackingOrderId, setTrackingOrderId, setCurrentView, showToast, orderHistory } = useContext(AppContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

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
            <Search className="h-5 w-5 text-[#0B1B2B]" /> Track Your Order
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
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#0B1B2B]"
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
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#0B1B2B]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0B1B2B] py-3 text-xs font-bold text-white shadow hover:bg-[#071320] disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Searching...' : 'Track Shipment'}
            </button>
          </form>
        </div>
      ) : (
        // MEESHO STYLE TRACKING UI
        <div className="bg-gray-50/50 -mx-4 md:-mx-8 -mt-8 pb-10 min-h-screen">
          {/* Header */}
          <div className="bg-white flex items-center justify-between px-4 py-4 border-b border-gray-100 shadow-sm sticky top-0 z-10">
            <button 
              onClick={handleTrackAnother}
              className="flex items-center space-x-3 text-sm font-bold text-charcoal hover:bg-gray-50 px-2 py-1 rounded"
            >
              <ArrowLeft className="h-5 w-5" /> <span>ORDER DETAILS</span>
            </button>
            <a href="https://wa.me/919188072646" target="_blank" rel="noreferrer" className="flex items-center space-x-1.5 text-sm font-bold text-[#b0076a] hover:bg-pink-50 px-2 py-1 rounded">
              <MessageCircle className="h-5 w-5" />
              <span>HELP</span>
            </a>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* Product Card */}
            <div className="bg-white p-4 flex gap-4 mt-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)] cursor-pointer active:bg-gray-50 transition">
              <div className="w-[72px] h-[72px] bg-white border border-gray-200 p-0.5 rounded shrink-0 overflow-hidden">
                <img 
                  src={(order.items && order.items[0]?.image) || "https://res.cloudinary.com/akg9ozdu/image/upload/v1723700000/rkpeedika_products/default_prod.jpg"} 
                  alt="Product" 
                  className="w-full h-full object-cover rounded-sm"
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-bold text-charcoal tracking-tight">Order #{order.orderId || order.id}</h3>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-medium">
                  {(order.items && order.items[0]?.name) || "RK Peedika Product"}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 font-medium">
                  Free Size • {order.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
                </p>
                <p className="text-[11px] text-gray-500 mt-1 font-medium">All issue easy returns</p>
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

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center px-1">
                <span className="text-xs font-medium text-gray-500">Order confirmed, cancel unavailable.</span>
                <button className="text-xs font-bold text-[#b0076a]">KNOW MORE</button>
              </div>
            </div>

            {/* Delivery Address */}
            {order.address && (
              <div className="bg-white p-5 mt-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <h4 className="text-sm font-bold text-charcoal mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#4a90e2]" fill="currentColor" stroke="white" />
                  Delivery Address
                </h4>
                <div className="text-[13px] text-gray-600 space-y-1 pl-1">
                  <p className="font-medium text-charcoal">{order.address.fullName}</p>
                  <p>{order.address.street || ''}</p>
                  <p>{order.address.city}, {order.address.state}, {order.address.pincode}</p>
                  <p className="mt-2 font-medium">{order.address.phone}</p>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-5 flex justify-between items-center pl-1">
                  <span className="text-xs font-medium text-gray-500">Address change unavailable!</span>
                  <button className="text-xs font-bold text-[#b0076a]">KNOW MORE</button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
