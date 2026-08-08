import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { CheckCircle, Download, FileText, ArrowRight, Truck, MapPin } from 'lucide-react';

export default function SuccessPage() {
  const { activeOrder, setCurrentView, setTrackingOrderId } = useContext(AppContext);
  const [trackingStep, setTrackingStep] = useState(0);

  const order = activeOrder;
  
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h2 className="text-2xl font-black text-charcoal tracking-tight mb-4">No order found</h2>
        <button 
          onClick={() => setCurrentView('home')}
          className="rounded-premium bg-[#F7941D] px-8 py-3.5 text-xs font-black text-white hover:bg-[#E07D10] transition-premium shadow-md shadow-orange-500/10"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  const handlePrintInvoice = () => {
    // Open a print-friendly window with a full GST Invoice receipt layout
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
              Date of Order: ${order.date}<br/>
              Payment Method: ${order.paymentMethod.toUpperCase()}<br/>
              Shipping Speed: ${order.shippingMethod.toUpperCase()}
            </div>
          </div>

          <div class="grid" style="border-top: 1px dashed #000; padding-top: 15px;">
            <div class="grid-col">
              <strong>BILL TO / SHIP TO:</strong><br/>
              ${order.address?.fullName}<br/>
              ${order.address?.houseFlatNumber || ''} ${order.address?.streetRoadName || ''}<br/>
              ${order.address?.city}, ${order.address?.state} - ${order.address?.pincode}<br/>
              Phone Contact: +91 ${order.address?.phone}
            </div>
            <div class="grid-col" style="text-align: right;">
              <strong>GST STATE OF SUPPLY:</strong><br/>
              State: ${order.address?.state}<br/>
              Tax Type: Inter-State IGST / SGST breakdown included
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
              ${order.items.map(item => `
                <tr>
                  <td>
                    ${item.name}<br/>
                    <small>Variant: ${item.size || 'Standard'} / ${item.color || 'Default'}</small>
                  </td>
                  <td>73239390</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price.toLocaleString('en-IN')}</td>
                  <td>18% (Incl)</td>
                  <td style="text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table class="total-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">₹${order.pricing?.subtotal.toLocaleString('en-IN')}</td>
            </tr>
            ${order.pricing?.discountAmount > 0 ? `
            <tr>
              <td>Online Discount (${order.pricing?.discountPercentage}%):</td>
              <td style="text-align: right; color: green;">-₹${order.pricing?.discountAmount.toLocaleString('en-IN')}</td>
            </tr>
            ` : ''}
            <tr>
              <td>Shipping surcharge:</td>
              <td style="text-align: right;">₹${order.pricing?.shipping.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-top: 1px dashed #000; font-weight: bold;">
              <td>Total Payable Value:</td>
              <td style="text-align: right;">₹${order.pricing?.finalTotal.toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <div class="footer">
            <p>This is a computer-generated tax invoice. No signature is required under section 12 of CGST Rules.</p>
            <p>Thank you for shopping with RK Peedika. Have a wonderful day ahead!</p>
          </div>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20 text-center">
      
      {/* Animated Success Check */}
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-6">
        <CheckCircle className="h-12 w-12" />
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping"></div>
      </div>

      <h2 className="text-2xl font-black text-charcoal tracking-tight">Order Placed Successfully!</h2>
      
      <p className="text-xs text-gray-400 font-semibold mt-2.5">
        A copy of your tax receipt and order status tracking has been dispatched via SMS and WhatsApp.
      </p>

      {/* Order Details box */}
      <div className="mt-8 rounded-premium bg-gray-50 border border-gray-100 p-5 text-left text-xs text-gray-500 space-y-3">
        <div className="flex justify-between border-b border-gray-100 pb-2.5">
          <span className="font-bold text-charcoal uppercase">Order ID Number</span>
          <span className="font-black text-charcoal">{order.orderId}</span>
        </div>
        {order.invoiceNumber && (
          <div className="flex justify-between border-b border-gray-100 pb-2.5">
            <span className="font-bold text-charcoal uppercase">Invoice Number</span>
            <span className="font-black text-charcoal">{order.invoiceNumber}</span>
          </div>
        )}
        <div className="flex justify-between border-b border-gray-100 pb-2.5">
          <span className="font-bold text-charcoal uppercase">Order Amount</span>
          <span className="font-black text-charcoal">₹{(order.pricing?.finalTotal || order.amount).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2.5">
          <span className="font-bold text-charcoal uppercase">Payment Method</span>
          <span className="font-black text-charcoal">{order.paymentMethod === 'cod' ? 'Cash On Delivery' : 'Online Payment'}</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2.5">
          <span className="font-bold text-charcoal uppercase">Payment Status</span>
          <span className="font-black text-charcoal">
            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
              order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
            </span>
          </span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2.5">
          <span className="font-bold text-charcoal uppercase">Order Status</span>
          <span className="font-black text-charcoal"><span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">{order.status || 'Confirmed'}</span></span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2.5">
          <span className="font-bold text-charcoal uppercase">Estimated Delivery</span>
          <span className="font-black text-emerald-600">
            {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold text-charcoal uppercase">Shipment Address</span>
          <span className="font-semibold text-charcoal max-w-[60%] text-right truncate">
            {order.address?.fullName}, {order.address?.city}
          </span>
        </div>
      </div>

      {/* TRACKING TIMELINE SIMULATION */}
      <div className="mt-8 rounded-premium border border-gray-100 bg-white p-6 shadow-premium text-left">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-1.5">
          <Truck className="h-4.5 w-4.5 text-[#F7941D]" /> Realtime Shipment Tracking
        </h3>
        
        <div className="relative flex flex-col md:flex-row justify-between gap-6 md:gap-2">
          {/* Tracking Step 1 */}
          <div className="flex md:flex-col items-center gap-3 md:gap-2 text-center md:flex-1">
            <div className={`rounded-full p-1.5 z-10 shrink-0 ${order.status ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              <Check className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-charcoal">Confirmed</p>
              <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{order.status ? 'Order Received' : 'Pending'}</p>
            </div>
          </div>

          <div className="hidden md:block flex-1 border-t-2 border-dashed border-gray-200 mt-3"></div>

          {/* Tracking Step 2 */}
          <div className="flex md:flex-col items-center gap-3 md:gap-2 text-center md:flex-1">
            <div className="rounded-full bg-orange-50 border border-orange-200 p-1.5 text-[#F7941D] z-10 shrink-0 animate-pulse">
              <Truck className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#F7941D]">In Transit</p>
              <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Departed Hub Jaipur</p>
            </div>
          </div>

          <div className="hidden md:block flex-1 border-t-2 border-dashed border-gray-100 mt-3"></div>

          {/* Tracking Step 3 */}
          <div className="flex md:flex-col items-center gap-3 md:gap-2 text-center md:flex-1">
            <div className="rounded-full bg-gray-50 border border-gray-200 p-1.5 text-gray-300 z-10 shrink-0">
              <MapPin className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400">Out for Delivery</p>
              <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Pending courier dispatch</p>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={handlePrintInvoice}
          className="rounded-premium border border-gray-200 px-6 py-3.5 text-xs font-bold text-charcoal hover:border-[#F7941D] hover:bg-orange-50/50 flex items-center justify-center gap-2 transition-premium"
        >
          <FileText className="h-4.5 w-4.5 text-[#F7941D]" /> Print GST Invoice
        </button>

        <button 
          onClick={() => { setTrackingOrderId(order.orderId); setCurrentView('order-tracking'); }}
          className="rounded-premium border border-gray-200 px-6 py-3.5 text-xs font-bold text-charcoal hover:border-[#F7941D] hover:bg-orange-50/50 flex items-center justify-center gap-2 transition-premium"
        >
          <Truck className="h-4.5 w-4.5 text-[#F7941D]" /> Track Order
        </button>

        <button 
          onClick={() => setCurrentView('home')}
          className="rounded-premium bg-[#F7941D] px-8 py-3.5 text-xs font-black text-white hover:bg-[#E07D10] flex items-center justify-center gap-2 transition-premium shadow-md shadow-orange-500/10"
        >
          Continue Shopping <ArrowRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
}

// Small helper Check icon to avoid import errors
function Check({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
    </svg>
  );
}
