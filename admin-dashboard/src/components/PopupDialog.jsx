import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

let activeResolve = null;

export default function PopupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('confirm'); // 'confirm' | 'alert'
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Expose helper functions globally
    window.showConfirm = (msg, customTitle = "Confirm Action") => {
      return new Promise((resolve) => {
        activeResolve = resolve;
        setMessage(msg);
        setTitle(customTitle);
        setType('confirm');
        setIsOpen(true);
      });
    };

    window.showAlert = (msg, customTitle = "Notification") => {
      return new Promise((resolve) => {
        activeResolve = resolve;
        setMessage(msg);
        setTitle(customTitle);
        setType('alert');
        setIsOpen(true);
      });
    };

    return () => {
      window.showConfirm = null;
      window.showAlert = null;
    };
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (activeResolve) activeResolve(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (activeResolve) activeResolve(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1917]/35 backdrop-blur-[3px] font-sans">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-premium border border-gray-100 overflow-hidden transform scale-100 transition-all p-5 space-y-4">
        
        {/* Icon & Title */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${type === 'confirm' ? 'bg-orange-50 text-[#F7941D]' : 'bg-blue-50 text-blue-600'}`}>
            {type === 'confirm' ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Info className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-extrabold text-charcoal tracking-tight">
              {title}
            </h4>
            <p className="text-xs font-semibold text-gray-500 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons Action bar */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-50">
          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="rounded-xl bg-[#F7941D] px-5 py-2 text-xs font-bold text-white hover:bg-[#E07D10] transition-all shadow-sm shadow-orange-500/10"
          >
            {type === 'confirm' ? 'Confirm' : 'Got it'}
          </button>
        </div>

      </div>
    </div>
  );
}
