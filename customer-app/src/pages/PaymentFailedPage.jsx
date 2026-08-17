import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { XCircle, RefreshCcw, CreditCard } from 'lucide-react';

export default function PaymentFailedPage() {
  const { setCurrentView } = useContext(AppContext);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20 text-center font-sans">
      
      {/* Animated Failure Icon */}
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 mb-6">
        <XCircle className="h-12 w-12" />
        <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-pulse"></div>
      </div>

      <h2 className="text-2xl font-black text-charcoal tracking-tight">Payment not completed</h2>
      
      <p className="text-base text-gray-500 font-bold mt-2.5 max-w-md mx-auto">
        Your order has not been placed.
      </p>

      {/* ACTION CONTROLS */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={() => setCurrentView('checkout')}
          className="rounded-xl border border-gray-200 px-6 py-4 text-base font-bold text-charcoal hover:border-[#0F7A6B] hover:bg-teal-50/50 flex items-center justify-center gap-2 transition-all"
          style={{ minHeight: 48 }}
        >
          <RefreshCcw className="h-5 w-5 text-[#0F7A6B]" /> Try Payment Again
        </button>

        <button 
          onClick={() => setCurrentView('checkout')}
          className="rounded-xl bg-[#0F7A6B] px-8 py-4 text-base font-black text-white hover:bg-[#0A5A4F] flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-500/10"
          style={{ minHeight: 48 }}
        >
          <CreditCard className="h-5 w-5 text-white" /> Change Payment Method
        </button>
      </div>
    </div>
  );
}
