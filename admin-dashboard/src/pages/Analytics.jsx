import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import apiClient from '../api/client';

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState({
    gmv: "₹0",
    netProfitMargin: "0.0%",
    averageOrderValue: "₹0",
    monthlySalesTrend: [],
    channelData: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await apiClient.get('/admin/analytics');
        if (res.data && res.data.success) {
          setAnalyticsData({
            gmv: res.data.gmv || "₹0",
            netProfitMargin: res.data.netProfitMargin || "0.0%",
            averageOrderValue: res.data.averageOrderValue || "₹0",
            monthlySalesTrend: res.data.monthlySalesTrend || [],
            channelData: res.data.channelData || []
          });
        }
      } catch (err) {
        console.error("Failed to fetch store analytics", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const COLORS = ['#F7941D', '#3B82F6', '#10B981'];

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold text-xs text-gray-400 animate-pulse">
        Loading performance analytics...
      </div>
    );
  }

  // Fallback for monthly trend if database is completely empty
  const performanceData = analyticsData.monthlySalesTrend.length > 0 
    ? analyticsData.monthlySalesTrend 
    : [
        { month: 'N/A', Revenue: 0, Profit: 0 }
      ];

  // Fallback for channels if database is completely empty
  const channelData = analyticsData.channelData.some(c => c.value > 0)
    ? analyticsData.channelData
    : [
        { name: 'No sales channel data yet', value: 100 }
      ];

  const hasSalesData = analyticsData.monthlySalesTrend.some(m => m.Revenue > 0);

  return (
    <div className="p-6 md:p-8 space-y-8">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Performance Analytics</h2>
        <p className="text-xs font-semibold text-gray-400 mt-1">Audit stores revenue projections, profit margin dynamics, and marketing channels.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Gross Merchandise Value (GMV)</p>
          <h3 className="text-2xl font-black text-gray-900 mt-2">{analyticsData.gmv}</h3>
          <span className="text-[10px] text-gray-400 font-bold mt-1 inline-block">
            {hasSalesData ? "▲ Synchronized from real orders" : "No sales data yet"}
          </span>
        </div>
        <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Estimated Profit Margin</p>
          <h3 className="text-2xl font-black text-gray-900 mt-2">{analyticsData.netProfitMargin}</h3>
          <span className="text-[10px] text-gray-400 font-bold mt-1 inline-block">
            {hasSalesData ? "▲ 35% default margin expansion" : "No profit margin yet"}
          </span>
        </div>
        <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Average Order Value (AOV)</p>
          <h3 className="text-2xl font-black text-gray-900 mt-2">{analyticsData.averageOrderValue}</h3>
          <span className="text-[10px] text-gray-400 font-bold mt-1 inline-block">
            {hasSalesData ? "▲ Total GMV / Total orders" : "No orders placed yet"}
          </span>
        </div>
      </div>

      {/* Recharts area and bar comparison chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue & Profit Trends (Area + Bar comparison) */}
        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm lg:col-span-2 flex flex-col h-[380px]">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Monthly Revenue vs. Net Profit (₹)</h3>
              <p className="text-xs font-bold text-gray-400 mt-0.5">Performance tracking for last 6 months</p>
            </div>
            {!hasSalesData && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                No sales data yet
              </span>
            )}
          </div>

          <div className="flex-1 w-full text-xs font-medium">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`]} />
                <Legend />
                <Area type="monotone" dataKey="Revenue" stroke="#F7941D" strokeWidth={2} fillOpacity={0.08} fill="#F7941D" />
                <Area type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={2} fillOpacity={0.05} fill="#10B981" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marketing channels distribution (Pie) */}
        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col h-[380px]">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Conversion Channels</h3>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Share of incoming order payment methods (%)</p>
          </div>

          <div className="flex-1 w-full text-xs font-medium relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
