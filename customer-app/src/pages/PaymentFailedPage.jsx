import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { XCircle, RefreshCcw, ArrowRight, ArrowLeft } from 'lucide-react';

export default function PaymentFailedPage() {
  const { setCurrentView } = useContext(AppContext);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20 text-center">
      
      {/* Animated Failure Icon */}
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 mb-6">
        <XCircle className="h-12 w-12" />
        <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-pulse"></div>
      </div>

      <h2 className="text-2xl font-black text-charcoal tracking-tight">Payment Failed</h2>
      
      <p className="text-xs text-gray-400 font-semibold mt-2.5 max-w-md mx-auto">
        We were unable to process your payment. Your bank may have declined the transaction or there was a network issue. No charges were made.
      </p>

      {/* ACTION CONTROLS */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={() => setCurrentView('checkout')}
          className="rounded-premium border border-gray-200 px-6 py-3.5 text-xs font-bold text-charcoal hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 transition-premium"
        >
          <ArrowLeft className="h-4.5 w-4.5" /> Return to Checkout
        </button>

        <button 
          onClick={() => setCurrentView('payment-select')}
          className="rounded-premium border border-gray-200 px-6 py-3.5 text-xs font-bold text-charcoal hover:border-[#F7941D] hover:bg-orange-50/50 flex items-center justify-center gap-2 transition-premium"
        >
          <RefreshCcw className="h-4.5 w-4.5 text-[#F7941D]" /> Try Again
        </button>

        <button 
          onClick={() => setCurrentView('payment-select')}
          className="rounded-premium bg-[#F7941D] px-8 py-3.5 text-xs font-black text-white hover:bg-[#E07D10] flex items-center justify-center gap-2 transition-premium shadow-md shadow-orange-500/10"
        >
          Choose Another Method <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
