import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-12 text-center font-sans">
      <div className="rounded-full bg-orange-50 p-5 text-[#F7941D] mb-4">
        <AlertCircle className="h-12 w-12" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 tracking-tight">404 - Page Not Found</h1>
      <p className="text-xs font-semibold text-gray-400 mt-2 max-w-sm leading-relaxed">
        The administration resource you are trying to view does not exist or has been shifted in the database layout.
      </p>
      
      <Link 
        to="/" 
        className="mt-6 flex items-center gap-1.5 rounded-xl bg-charcoal px-6 py-3 text-xs font-bold text-white hover:bg-black transition-all shadow"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
    </div>
  );
}
