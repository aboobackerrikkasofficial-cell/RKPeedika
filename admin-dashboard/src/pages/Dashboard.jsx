import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import Table from '../components/Table';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalRevenue: "₹0",
    totalProducts: 0,
    todayOrders: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [salesTrend, setSalesTrend] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const kpiRes = await apiClient.get('/admin/dashboard');
        if (kpiRes.data && kpiRes.data.success) {
          setMetrics(kpiRes.data.metrics);
        }

        const analyticsRes = await apiClient.get('/admin/analytics');
        if (analyticsRes.data && analyticsRes.data.success) {
          setSalesTrend(analyticsRes.data.weeklySalesTrend || []);
          setCategoryDistribution(analyticsRes.data.categoryDistribution || []);
        }
      } catch (err) {
        console.error("Failed to fetch admin dashboard analytics", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const kpis = [
    { title: "Total Revenue", value: metrics.totalRevenue, icon: <DollarSign className="h-5 w-5 text-emerald-500" /> },
    { title: "Total Products", value: (metrics.totalProducts || 0).toString(), icon: <ShoppingBag className="h-5 w-5 text-blue-500" /> },
    { title: "Today's Orders", value: (metrics.todayOrders || 0).toString(), icon: <ShoppingBag className="h-5 w-5 text-orange-500" /> },
    { title: "Pending Orders", value: (metrics.pendingOrders || 0).toString(), icon: <ShoppingBag className="h-5 w-5 text-amber-500" /> },
    { title: "Completed Orders", value: (metrics.completedOrders || 0).toString(), icon: <ShoppingBag className="h-5 w-5 text-green-500" /> }
  ];

  const salesData = salesTrend.length > 0 ? salesTrend : [
    { name: 'Mon', Sales: 0 },
    { name: 'Tue', Sales: 0 },
    { name: 'Wed', Sales: 0 },
    { name: 'Thu', Sales: 0 },
    { name: 'Fri', Sales: 0 },
    { name: 'Sat', Sales: 0 },
    { name: 'Sun', Sales: 0 }
  ];

  const categoryData = categoryDistribution.length > 0 ? categoryDistribution : [
    { name: 'Kitchenware', Orders: 0 },
    { name: 'Wellness', Orders: 0 },
    { name: 'Textiles', Orders: 0 }
  ];

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold text-xs text-gray-400 animate-pulse">
        Loading analytics dashboard...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
           {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Overview Dashboard</h2>
        <p className="text-xs font-semibold text-gray-400 mt-1">Monitor sales performance, active products catalog, and orders flow.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm hover:shadow-premium transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{kpi.title}</p>
                <p className="text-xl font-black text-gray-900 mt-1.5">{kpi.value}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg shrink-0">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend Chart (Area) */}
        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm lg:col-span-2 flex flex-col h-[360px]">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Weekly Revenue Flow (₹)</h3>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Track daily gross value receipts</p>
          </div>
          
          <div className="flex-1 w-full text-xs font-medium">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F7941D" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F7941D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="Sales" stroke="#F7941D" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown (Bar) */}
        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col h-[360px]">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Orders by Collection</h3>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Top performing segments</p>
          </div>

          <div className="flex-1 w-full text-xs font-medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={9} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value) => [value, 'Orders']} />
                <Bar dataKey="Orders" fill="#F7941D" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* LOWER SECTION: Connection Panel */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Database Connection Panel</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold mt-2">
            This admin dashboard is connected directly to the primary SQLite store database.
          </p>
          <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">
            All views are dynamically loaded with live customer orders and sales statistics. Inventory/stock checks have been completely removed.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5 text-right text-xs font-bold text-[#F7941D]">
          <span>SQLite Database Status: 🟢 Online</span>
          <Link to="/settings" className="hover:underline text-[11px] font-semibold text-gray-400">Manage policy rules</Link>
        </div>
      </div>

    </div>
  );
}
