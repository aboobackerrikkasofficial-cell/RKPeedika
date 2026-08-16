import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package,
  Settings, 
  Bell, 
  Menu, 
  X, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import apiClient from '../api/client';
import SessionTimeoutHandler from '../components/SessionTimeoutHandler';

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        if (res.data) {
          setAdminUser(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch admin profile in layout", err);
      }
    };
    fetchAdminProfile();
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    { name: 'Products', path: '/products', icon: <Package className="h-4 w-4" /> },
    { name: 'Orders', path: '/orders', icon: <ShoppingBag className="h-4 w-4" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/admin/notifications');
        if (res.data && res.data.status === 'success') {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications in layout", err);
      }
    };
    if (isNotificationsOpen || notifications.length === 0) {
      fetchNotifications();
    }
  }, [isNotificationsOpen]);

  // Resolve breadcrumbs
  const getBreadcrumbs = () => {
    const paths = currentPath.split('/').filter(p => p !== '');
    if (paths.length === 0) return [{ name: 'Home', path: '/' }, { name: 'Overview', path: '/' }];
    
    return [
      { name: 'Home', path: '/' },
      ...paths.map((p, idx) => ({
        name: p.charAt(0).toUpperCase() + p.slice(1),
        path: '/' + paths.slice(0, idx + 1).join('/')
      }))
    ];
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch (err) {
        console.error("Logout request failed", err);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('session_active');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden font-sans">
      <SessionTimeoutHandler />
      
      {/* SIDEBAR NAVIGATION - Collapsible & Animated */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden lg:flex flex-col border-r border-gray-100 bg-white p-5 h-full shrink-0 shadow-sm"
          >
            {/* Header Brand */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
              <Link to="/" className="flex items-center space-x-2">
                <img src="/images/logo.jpg" alt="RK Peedika Logo" className="h-8 w-auto object-contain" />
                <span className="text-lg font-extrabold tracking-tight text-gray-900">
                  RK Peedika
                </span>
                <span className="text-[9px] bg-orange-50 text-[#F7941D] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Admin
                </span>
              </Link>
            </div>

            {/* Menu Links */}
            <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar pr-1">
              {menuItems.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive 
                        ? 'bg-orange-50 text-[#F7941D]' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout Trigger */}
            <div className="pt-4 border-t border-gray-50">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Log Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MOBILE NAV DRAWER */}
      <div className="lg:hidden">


        <AnimatePresence>
          {isSidebarOpen && (
            <div className="fixed inset-0 z-40 flex">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black"
              />
              <motion.aside 
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: "tween", duration: 0.25 }}
                className="relative flex w-64 flex-col bg-white p-5 shadow-2xl h-full"
              >
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <img src="/images/logo.jpg" alt="RK Peedika Logo" className="h-8 w-auto object-contain" />
                    <span className="text-lg font-extrabold text-gray-900">RK Peedika</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400"><X className="h-5 w-5" /></button>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                  {menuItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isActive 
                            ? 'bg-orange-50 text-[#F7941D]' 
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="pt-4 border-t border-gray-100">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT SIDE MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* NAVBAR */}
        <header className="sticky top-0 z-30 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
          
          {/* Breadcrumbs resolver & Hamburger toggle for desktop */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="block rounded-xl p-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs List */}
            <nav className="flex items-center space-x-1 text-xs font-semibold text-gray-400">
              {getBreadcrumbs().map((b, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="h-3 w-3 mx-0.5 text-gray-300" />}
                  <Link 
                    to={b.path}
                    className={idx === getBreadcrumbs().length - 1 ? "text-gray-600 font-bold" : "hover:text-gray-600 transition-all"}
                  >
                    {b.name}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Action Center (Notifications, Profile) */}
          <div className="flex items-center space-x-4">

            {/* Notifications Button */}
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`relative rounded-full p-2 text-gray-500 hover:bg-gray-50 hover:text-[#F7941D] transition-all ${isNotificationsOpen ? 'text-[#F7941D] bg-orange-50' : ''}`}
            >
              <Bell className="h-5 w-5" />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#F7941D]" />
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 rounded-xl border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs font-semibold hover:border-gray-200 transition-all"
              >
                <div className="h-6.5 w-6.5 rounded-full bg-[#FFE8CC] text-[#F7941D] font-black flex items-center justify-center border border-orange-100 uppercase">
                  {adminUser?.name ? adminUser.name.trim().charAt(0) : 'A'}
                </div>
                <span className="hidden md:inline text-gray-600 font-bold">{adminUser?.name || 'Admin'}</span>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white p-2.5 shadow-premium text-xs text-gray-500 space-y-1"
                  >
                    <Link 
                      to="/profile" 
                      onClick={() => setIsProfileOpen(false)}
                      className="block px-3 py-2 rounded-lg font-semibold hover:bg-gray-50 hover:text-gray-800"
                    >
                      Manage Profile
                    </Link>
                    <Link 
                      to="/settings" 
                      onClick={() => setIsProfileOpen(false)}
                      className="block px-3 py-2 rounded-lg font-semibold hover:bg-gray-50 hover:text-gray-800"
                    >
                      Store Settings
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left block px-3 py-2 rounded-lg font-bold text-red-500 hover:bg-red-50"
                    >
                      Logout Session
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* NOTIFICATION PANEL - Slide Out Drawer */}
        <AnimatePresence>
          {isNotificationsOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" 
                onClick={() => setIsNotificationsOpen(false)} 
              />
              <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: "tween", duration: 0.25 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white shadow-2xl p-6 flex flex-col border-l border-gray-100"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                  <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="h-4.5 w-4.5 text-[#F7941D]" /> Notifications
                  </h3>
                  <button onClick={() => setIsNotificationsOpen(false)} className="text-gray-400"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        notif.unread 
                          ? 'border-[#FFE8CC] bg-[#FFF8F0] shadow-sm' 
                          : 'border-gray-50 bg-white'
                      }`}
                    >
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-xs font-bold text-charcoal">{notif.title}</h4>
                        <span className="text-[9px] text-gray-400 font-semibold">{notif.time}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">{notif.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => { navigate('/notifications'); setIsNotificationsOpen(false); }}
                    className="w-full text-center rounded-xl bg-gray-50 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    View All Notifications
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* CONTAINER VIEWPORT FOR CHILD PAGES */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                adminUser,
                onProfileUpdate: (updatedUser) => setAdminUser(updatedUser)
              });
            }
            return child;
          })}
        </div>
      </div>
    </div>
  );
}
