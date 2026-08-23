import React, { useEffect, useState } from 'react';
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalRevenue: '₹0',
    totalProducts: 0,
    activeProducts: 0,
    todayOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Single call — dashboard API now returns both metrics AND recent orders
        const kpiRes = await apiClient.get('/admin/dashboard');

        if (kpiRes.data?.success) {
          setMetrics(kpiRes.data.metrics);
          if (Array.isArray(kpiRes.data.recentOrders)) {
            setRecentOrders(kpiRes.data.recentOrders);
          }
        }
      } catch (err) {
        console.error('Failed to fetch admin dashboard data', err);
        setError('Unable to load dashboard data. Please refresh.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const kpis = [
    {
      title: 'Total Products',
      value: metrics.totalProducts ?? 0,
      sub: `${metrics.activeProducts ?? 0} active`,
      icon: <Package className="h-5 w-5" />,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      link: '/products',
    },
    {
      title: "Today's Orders",
      value: metrics.todayOrders ?? 0,
      sub: 'placed today',
      icon: <ShoppingBag className="h-5 w-5" />,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      link: '/orders',
    },
    {
      title: 'Pending Orders',
      value: metrics.pendingOrders ?? 0,
      sub: 'need attention',
      icon: <Clock className="h-5 w-5" />,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      link: '/orders',
    },
    {
      title: 'Delivered Orders',
      value: metrics.deliveredOrders ?? metrics.completedOrders ?? 0,
      sub: 'completed',
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      link: '/orders',
    },
    {
      title: 'Total Sales',
      value: metrics.totalRevenue,
      sub: 'paid orders',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      link: '/orders',
    },
  ];

  const STATUS_STYLES = {
    pending: 'bg-yellow-50 text-yellow-700',
    confirmed: 'bg-blue-50 text-blue-700',
    packed: 'bg-indigo-50 text-indigo-700',
    shipped: 'bg-sky-50 text-sky-700',
    out_for_delivery: 'bg-teal-50 text-teal-700',
    delivered: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
    completed: 'bg-emerald-50 text-emerald-700',
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-[#F7941D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h2>
        <p className="text-xs font-semibold text-gray-400 mt-1">
          Overview of your store — products, orders and sales.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.title}
            to={kpi.link}
            className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className={`${kpi.bg} ${kpi.color} p-2.5 rounded-lg`}>
                {kpi.icon}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{kpi.title}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{kpi.value}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{kpi.sub}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h3 className="text-sm font-black text-gray-900">Recent Orders</h3>
          <Link
            to="/orders"
            className="text-xs font-bold text-[#F7941D] hover:underline"
          >
            View All →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-gray-400">
            No orders yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Order</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-bold text-gray-900">
                      {order.orderId || order.id?.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {order.shippingName || order.user?.name || 'Guest'}
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-900">
                      ₹{(order.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[order.status?.toLowerCase()] || 'bg-gray-100 text-gray-500'}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/products"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#F7941D]/30 transition-all group"
        >
          <div className="bg-blue-50 text-blue-500 p-3 rounded-xl group-hover:scale-105 transition-transform">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm">Manage Products</p>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Add, edit, activate or deactivate products</p>
          </div>
        </Link>

        <Link
          to="/orders"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#F7941D]/30 transition-all group"
        >
          <div className="bg-orange-50 text-orange-500 p-3 rounded-xl group-hover:scale-105 transition-transform">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm">Manage Orders</p>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">View and update order statuses</p>
          </div>
        </Link>
      </div>

    </div>
  );
}
