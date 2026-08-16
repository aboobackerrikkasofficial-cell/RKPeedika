import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Settings from './pages/Settings';
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
        <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><DashboardLayout><Products /></DashboardLayout></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><DashboardLayout><Orders /></DashboardLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
