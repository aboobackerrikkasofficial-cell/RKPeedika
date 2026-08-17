import React, { useState, useEffect } from 'react';

let activeResolve = null;

export default function PopupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('confirm'); // 'confirm' | 'alert'
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-sm font-sans animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-premium border border-gray-100 overflow-hidden transform scale-100 transition-all p-6 space-y-4 shadow-premium">
        
        {/* Header/Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {type === 'confirm' ? '⚠️' : '🔔'}
            </span>
            <h4 className="text-sm font-extrabold text-charcoal tracking-tight uppercase">
              {title}
            </h4>
          </div>
          <p className="text-xs font-semibold text-gray-500 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Buttons Action bar */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className="rounded-premium border border-gray-200 px-4 py-2 text-xs font-bold text-gray-400 hover:bg-gray-50 hover:text-charcoal transition-premium"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="rounded-premium bg-[#0F7A6B] px-5 py-2 text-xs font-bold text-white hover:bg-[#0A5A4F] transition-premium shadow-md shadow-teal-500/10"
          >
            {type === 'confirm' ? 'Confirm' : 'Got it'}
          </button>
        </div>

      </div>
    </div>
  );
}
