import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Home, Grid2x2, Package, ShoppingCart, User } from 'lucide-react';

export default function BottomNav() {
  const {
    currentView,
    setCurrentView,
    cart,
    wishlist,
  } = useContext(AppContext);

  const cartCount = cart.reduce((t, i) => t + i.quantity, 0);
  const wishlistCount = wishlist?.length || 0;

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      action: () => setCurrentView('home'),
      activeViews: ['home'],
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Grid2x2,
      action: () => setCurrentView('categories'),
      activeViews: ['categories'],
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: Package,
      action: () => setCurrentView('orders'),
      activeViews: ['orders'],
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      badge: cartCount,
      action: () => setCurrentView('cart'),
      activeViews: ['cart'],
    },
    {
      id: 'profile',
      label: 'Account',
      icon: User,
      action: () => setCurrentView('profile'),
      activeViews: ['profile'],
    },
  ];

  // Don't render on non-customer views
  if (['admin', 'success', 'payment-failed'].includes(currentView)) {
    return null;
  }

  return (
    <nav className="bottom-nav md:hidden" role="navigation" aria-label="Main navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.activeViews.includes(currentView);

        return (
          <button
            key={tab.id}
            id={`bottom-nav-${tab.id}`}
            onClick={tab.action}
            className={`bottom-nav-item${isActive ? ' active' : ''} ${tab.isCenter ? 'relative' : ''} ${tab.id === 'orders' ? 'border border-white rounded-lg p-1 mx-1 bg-white/5' : ''}`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
                <span className="relative flex items-center justify-center">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  {/* Cart badge */}
                  {tab.badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2.5 flex items-center justify-center rounded-full bg-[#F5A623] text-white font-extrabold leading-none shadow-sm animate-bounce"
                      style={{ minWidth: 16, height: 16, fontSize: 9, padding: '0 3px' }}
                    >
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </span>
                <span className="bottom-nav-item-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
