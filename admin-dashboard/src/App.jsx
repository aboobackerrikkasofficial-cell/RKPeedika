import React, { Suspense } from 'react';
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

export default function App() {
  return (
    <ErrorBoundary>
      <PopupDialog />
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>}>
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
