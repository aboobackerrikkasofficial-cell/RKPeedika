import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Delay showing it slightly for a smoother load experience
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-[120] bg-white border-t border-gray-200 shadow-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex-1 text-sm text-gray-600 pr-4">
            <h4 className="font-bold text-[#0B1B2B] mb-1">We value your privacy</h4>
            <p className="text-xs md:text-sm">
              We securely store a unique identifier on your device to remember your cart, addresses, and orders without requiring an OTP login. This guarantees your information stays private to this device. By continuing to use our site, you consent to our use of these necessary technologies.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={acceptCookies}
              className="flex-1 md:flex-none bg-[#0B1B2B] text-white px-6 py-2.5 rounded font-bold hover:bg-[#071320] transition text-sm"
            >
              Accept & Continue
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-2 text-gray-400 hover:text-gray-600 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
