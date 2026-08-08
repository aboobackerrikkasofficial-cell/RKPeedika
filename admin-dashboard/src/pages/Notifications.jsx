import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Warehouse, ShoppingBag } from 'lucide-react';
import apiClient from '../api/client';

export default function Notifications() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/admin/notifications');
        if (res.data && res.data.status === 'success') {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAllRead = () => {
    setLogs(prev => prev.map(l => ({ ...l, unread: false })));
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold text-xs text-gray-400 animate-pulse">
        Fetching alerts and logs...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Alerts & Logs</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">Audit warehouse warnings, system gateway authentications, and transaction logs.</p>
        </div>
        
        <button 
          onClick={markAllRead}
          className="text-xs font-bold text-[#F7941D] hover:underline"
        >
          Mark all as read
        </button>
      </div>

      {/* Notifications list */}
      <div className="space-y-4">
        {logs.map((log) => {
          const icons = {
            "order": <ShoppingBag className="h-5 w-5 text-orange-500" />,
            "inventory": <Warehouse className="h-5 w-5 text-amber-500" />,
            "system": <ShieldCheck className="h-5 w-5 text-emerald-500" />
          };

          return (
            <div 
              key={log.id}
              className={`p-4 rounded-xl border flex gap-4 items-start transition-all ${
                log.unread 
                  ? 'border-[#FFE8CC] bg-[#FFF8F0] shadow-sm' 
                  : 'border-gray-50 bg-white'
              }`}
            >
              <div className="bg-gray-50 p-2.5 rounded-lg shrink-0 mt-0.5">{icons[log.type] || <Bell />}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-xs font-extrabold text-charcoal">{log.title}</h4>
                  <span className="text-[10px] text-gray-400 font-bold">{log.time}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">{log.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
