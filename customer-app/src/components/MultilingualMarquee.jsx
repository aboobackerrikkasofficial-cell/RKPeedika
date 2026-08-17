import React from 'react';
import { ShieldCheck, Truck, RefreshCcw, CreditCard, Star, Box } from 'lucide-react';

export default function MultilingualMarquee() {
  const messages = [
    // English
    { text: "All India Delivery", icon: <Truck className="h-3 w-3 text-[#0F7A6B]" />, lang: "en" },
    { text: "Cash on Delivery Available", icon: <CreditCard className="h-3 w-3 text-[#0F7A6B]" />, lang: "en" },
    { text: "Easy Returns & Exchanges", icon: <RefreshCcw className="h-3 w-3 text-[#0F7A6B]" />, lang: "en" },
    { text: "Trusted Indian Sellers", icon: <ShieldCheck className="h-3 w-3 text-[#0F7A6B]" />, lang: "en" },
    // Malayalam
    { text: "ഇന്ത്യയിലുടനീളം ഡെലിവറി", icon: <Truck className="h-3 w-3 text-[#0F7A6B]" />, lang: "ml" },
    { text: "ക്യാഷ് ഓൺ ഡെലിവറി ലഭ്യമാണ്", icon: <CreditCard className="h-3 w-3 text-[#0F7A6B]" />, lang: "ml" },
    { text: "എളുപ്പത്തിലുള്ള റിട്ടേൺ & എക്സ്ചേഞ്ച്", icon: <RefreshCcw className="h-3 w-3 text-[#0F7A6B]" />, lang: "ml" },
    { text: "വിശ്വസനീയമായ ഇന്ത്യൻ വിൽപ്പനക്കാർ", icon: <ShieldCheck className="h-3 w-3 text-[#0F7A6B]" />, lang: "ml" },
  ];

  return (
    <div 
      className="w-full bg-[#FFFBEB] border-b border-teal-100 overflow-hidden flex items-center h-10 relative"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
      }}
    >
      <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] group">
        {/* Repeat twice for continuous seamless scroll effect */}
        {[...messages, ...messages].map((item, index) => (
          <div key={index} className="flex items-center space-x-2 px-6 md:px-8">
            {item.icon}
            <span className="text-xs font-medium text-gray-600 tracking-wide">
              {item.text}
            </span>
            <span className="text-gray-300 opacity-40 px-2">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
