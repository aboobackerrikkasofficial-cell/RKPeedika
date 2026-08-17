import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { CheckCircle, ArrowRight, Truck, FileText } from 'lucide-react';
import getImageUrl from '../utils/imageUrl';

export default function SuccessPage() {
  const { activeOrder, setCurrentView, setTrackingOrderId } = useContext(AppContext);

  const order = activeOrder;
  
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center font-sans">
        <h2 className="text-2xl font-black text-charcoal tracking-tight mb-4">No order found</h2>
        <button 
          onClick={() => setCurrentView('home')}
          className="rounded-xl bg-[#0F7A6B] px-8 py-4 text-base font-black text-white hover:bg-[#0A5A4F] transition shadow-md shadow-teal-500/10"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  const handlePrintInvoice = () => {
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

  const firstItem = order.items?.[0] || order.orderItems?.[0];
  const firstItemName = firstItem?.name || firstItem?.productName || firstItem?.product?.name || 'Order Item';
  const firstItemImage = firstItem?.image || firstItem?.productImage || (firstItem?.product?.images ? JSON.parse(firstItem.product.images)[0] : null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20 text-center font-sans">
      
      {/* Animated Success Check */}
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-6">
        <CheckCircle className="h-12 w-12" />
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping"></div>
      </div>

      <h2 className="text-2xl font-black text-charcoal tracking-tight">Order Placed Successfully!</h2>
      
      <p className="text-sm text-gray-400 font-semibold mt-2">
        Your order has been registered. You can track progress and download invoice below.
      </p>

      {/* Ordered Item block (Meesho-inspired) */}
      <div className="mt-8 rounded-2xl border border-gray-150 bg-white p-5 shadow-sm text-left flex gap-4 items-center">
        <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 flex items-center justify-center">
          <img
            src={getImageUrl(firstItemImage) || '/images/coffee_maker_1.jpg'}
            alt={firstItemName}
            className="w-full h-full object-contain bg-white"
            onError={(e) => {
              e.currentTarget.src = '/images/coffee_maker_1.jpg';
            }}
          />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-base font-extrabold text-charcoal leading-snug line-clamp-1">{firstItemName}</h4>
          {order.items && order.items.length > 1 && (
            <p className="text-xs text-gray-450 font-bold">
              + {order.items.length - 1} more items
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-500">Qty: {firstItem?.quantity || 1}</span>
            <span className="text-base font-black text-[#0F7A6B]">₹{(order.pricing?.finalTotal || order.amount).toLocaleString('en-IN')}</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
              order.paymentMethod === 'cod' ? 'bg-amber-50 text-amber-600 border border-amber-250' : 'bg-emerald-50 text-emerald-600 border border-emerald-250'
            }`}>
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
            </span>
          </div>
        </div>
      </div>

      {/* Simple Details box */}
      <div className="mt-6 rounded-2xl bg-gray-50 border border-gray-100 p-5 text-left text-sm text-gray-500 space-y-3">
        <div className="flex justify-between border-b border-gray-200/60 pb-2.5">
          <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Order ID</span>
          <span className="font-black text-charcoal">#{order.orderId}</span>
        </div>
        <div className="flex justify-between border-b border-gray-200/60 pb-2.5">
          <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Estimated Delivery</span>
          <span className="font-bold text-emerald-600">
            {order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            }) : '3-4 Business Days'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Delivery to</span>
          <span className="font-semibold text-charcoal max-w-[70%] text-right truncate">
            {order.address?.fullName || order.shippingName}, {order.address?.city}
          </span>
        </div>
      </div>

      {/* ACTION CONTROLS */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={handlePrintInvoice}
          className="rounded-xl border border-gray-200 px-6 py-4 text-base font-bold text-charcoal hover:border-[#0F7A6B] hover:bg-teal-50/50 flex items-center justify-center gap-2 transition-all"
          style={{ minHeight: 48 }}
        >
          <FileText className="h-5 w-5 text-[#0F7A6B]" /> Print Invoice
        </button>

        <button 
          onClick={() => { setTrackingOrderId(order.orderId); setCurrentView('order-tracking'); }}
          className="rounded-xl border border-gray-200 px-6 py-4 text-base font-bold text-charcoal hover:border-[#0F7A6B] hover:bg-teal-50/50 flex items-center justify-center gap-2 transition-all"
          style={{ minHeight: 48 }}
        >
          <Truck className="h-5 w-5 text-[#0F7A6B]" /> Track Order
        </button>

        <button 
          onClick={() => setCurrentView('home')}
          className="rounded-xl bg-[#0F7A6B] px-8 py-4 text-base font-black text-white hover:bg-[#0A5A4F] flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-500/10"
          style={{ minHeight: 48 }}
        >
          Continue Shopping <ArrowRight className="h-5 w-5" />
        </button>
      </div>

    </div>
  );
}
