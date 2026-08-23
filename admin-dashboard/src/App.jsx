import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ErrorBoundary from './pages/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import PopupDialog from './components/PopupDialog';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Products = React.lazy(() => import('./pages/Products'));
const Categories = React.lazy(() => import('./pages/Categories'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Login = React.lazy(() => import('./pages/Login'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const PaymentSettings = React.lazy(() => import('./pages/PaymentSettings'));

// Skeleton shown while page JS chunks are downloading
function AdminSkeleton() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-100 bg-white p-5 shrink-0">
        <div className="h-8 w-32 rounded-lg bg-gray-100 animate-pulse mb-8" />
        <div className="space-y-2 flex-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-9 rounded-xl bg-gray-100 animate-pulse mt-4" />
      </aside>
      {/* Main area skeleton */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-gray-100 bg-white flex items-center px-6 gap-4 shrink-0">
          <div className="h-8 w-8 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-4 w-48 rounded bg-gray-100 animate-pulse" />
          <div className="ml-auto h-8 w-24 rounded-xl bg-gray-100 animate-pulse" />
        </header>
        <div className="flex-1 p-8 space-y-6">
          <div className="h-7 w-48 rounded-lg bg-gray-200 animate-pulse" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-white border border-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Wake up Render backend immediately on app mount (before any data fetch fires)
    const API = import.meta.env.VITE_API_URL || 'https://rkpeedika.onrender.com/api';
    fetch(`${API}/health`, { method: 'HEAD' }).catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <PopupDialog />
      <Suspense fallback={<AdminSkeleton />}>
      <Routes>
        {/* Auth Gate */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Layout routes */}
        <Route element={<ProtectedRoute><LayoutWrapper /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/payment-settings" element={<PaymentSettings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function LayoutWrapper() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
