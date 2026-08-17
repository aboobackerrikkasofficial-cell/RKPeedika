import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ErrorBoundary from './pages/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import PopupDialog from './components/PopupDialog';

export default function App() {
  return (
    <ErrorBoundary>
      <PopupDialog />
      <Routes>
        {/* Auth Gate */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Layout routes */}
        <Route element={<ProtectedRoute><LayoutWrapper /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
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
