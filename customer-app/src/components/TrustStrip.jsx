import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  ShieldCheck, 
  Banknote, 
  Truck, 
  RotateCcw, 
  CheckSquare, 
  Headphones 
} from 'lucide-react';

const iconMap = {
  ShieldCheck: <ShieldCheck className="h-6 w-6 stroke-[1.5] text-[#0B1B2B]" />,
  Banknote: <Banknote className="h-6 w-6 stroke-[1.5] text-[#0B1B2B]" />,
  Truck: <Truck className="h-6 w-6 stroke-[1.5] text-[#0B1B2B]" />,
  RotateCcw: <RotateCcw className="h-6 w-6 stroke-[1.5] text-[#0B1B2B]" />,
  CheckSquare: <CheckSquare className="h-6 w-6 stroke-[1.5] text-[#0B1B2B]" />,
  Headphones: <Headphones className="h-6 w-6 stroke-[1.5] text-[#0B1B2B]" />
};

export default function TrustStrip() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback data in case DB is not seeded or fails
  const fallbackBadges = [
    { title: "100% Secure Payments", description: "SSL Protected transactions", iconName: "ShieldCheck" },
    { title: "Cash On Delivery", description: "Pay at your doorstep", iconName: "Banknote" },
    { title: "Fast Delivery Across India", description: "Quick delivery to your doorstep", iconName: "Truck" },
    { title: "Easy Exchange", description: "Exchange requests accepted within 3 days of delivery. No Refunds • Exchange Only", iconName: "RotateCcw" },
    { title: "Quality Checked Products", description: "Carefully selected products", iconName: "CheckSquare" },
    { title: "Customer Support", description: "Support via WhatsApp & Email", iconName: "Headphones", actionUrl: "mailto:rikkas.aboo@gmail.com" }
  ];

  useEffect(() => {
    apiClient.get('/badges')
      .then(res => {
        if (res.data && res.data.status === 'success' && res.data.data.length > 0) {
          setBadges(res.data.data);
        } else {
          setBadges(fallbackBadges);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch badges', err);
        setBadges(fallbackBadges);
        setLoading(false);
      });
  }, []);

  const renderCardContent = (item) => (
    <div className="flex flex-col items-center text-center p-3 rounded-premium border border-gray-50 bg-white shadow-sm hover:shadow-premium transition-premium h-full">
      <div className="mb-2.5 rounded-full bg-[#0B1B2B]/10/50 p-2.5 flex items-center justify-center">
        {iconMap[item.iconName] || iconMap['CheckSquare']}
      </div>
      <h4 className="text-xs font-bold text-charcoal tracking-tight">{item.title}</h4>
      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{item.description}</p>
    </div>
  );

  return (
    <div className="w-full bg-white border-y border-gray-100 py-6 my-2">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1B2B]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
            {badges.map((item, index) => (
              <div key={index} className="h-full">
                {item.actionUrl ? (
                  <a href={item.actionUrl} className="block h-full cursor-pointer">
                    {renderCardContent(item)}
                  </a>
                ) : (
                  <div className="h-full">
                    {renderCardContent(item)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
