import React, { createContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DEFAULT_PRODUCTS } from '../constants/products';
import { DEFAULT_ADDRESSES } from '../constants/addresses';
import { PINCODE_DATABASE } from '../constants/pincodes';
import apiClient from '../api/client';
import getImageUrl from '../utils/imageUrl';
import { onMessageListener } from '../utils/firebase';

// Safe JSON parse that never throws
const safeJsonParse = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const authChannelRef = useRef(null);
  const userProfileRef = useRef(null);

  // Safe initializers to prevent SPA refresh state wiping
  const initialParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [currentView, setCurrentView] = useState(initialParams.get('view') || 'home'); // home | product | checkout | success | admin | login
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(initialParams.get('id') || "prod-1");
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // E-commerce items
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [rawApiResponse, setRawApiResponse] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [quickPurchaseItem, setQuickPurchaseItem] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  userProfileRef.current = userProfile;
  const [categories, setCategories] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  // Checkout & Shipping
  const [addresses, setAddresses] = useState(DEFAULT_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState("addr-1");
  const [selectedShippingMethod, setSelectedShippingMethod] = useState("normal"); // normal | express
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("upi"); // upi | card | netbanking | wallet | cod
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState(initialParams.get('search') || "");
  const [selectedCategory, setSelectedCategory] = useState(initialParams.get('category') || "All");
  const [userPincode, setUserPincode] = useState("560001");
  const [locationName, setLocationName] = useState("Bengaluru, KA");

  // Admin Configs
  const [storeSettings, setStoreSettings] = useState({
    storeName: "RK Peedika",
    storeLogo: "/images/logo.jpg",
    supportEmail: "rikkas.aboo@gmail.com",
    supportPhone: "+91 9188072646",
    whatsappNumber: "+91 9188072646",
    announcementBar: "✨ Special Savings on Online Payments",
    onlineDiscount: 12,
    returnWindow: 3,
    returnPolicy: "Return or exchange requests must be submitted within 3 days of delivery. Products must be unused and in original condition. Image upload is mandatory. Only exchanges are available.",
    footerContent: "Your trusted Indian marketplace for everyday essentials, kitchen products, cleaning supplies, and more. Quality products delivered to your door."
  });

  const [couponConfig, setCouponConfig] = useState({
    enabled: true,
    code: 'RIKKAS',
    discountPct: 12,
    minPurchase: 500,
    expiry: '2026-12-31'
  });

  const showToast = (message, type = 'success') => {
    setActiveToast({ message, type });
    setTimeout(() => setActiveToast(null), 3500);
  };

  // Helper: Fetch all authenticated user data
  const fetchUserData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      // Parallel fetch all user data instead of 5 sequential requests
      const [profileRes, addrRes, orderRes, wishlistRes, cartRes] = await Promise.all([
        apiClient.get('/users/profile', { timeout: 10000 }),
        apiClient.get('/users/addresses', { timeout: 10000 }),
        apiClient.get('/orders/user/history', { timeout: 10000 }),
        apiClient.get('/users/wishlist', { timeout: 10000 }),
        apiClient.get('/users/cart', { timeout: 10000 })
      ]);

      // 1. Profile
      setUserProfile(profileRes.data);

      // 2. Address book
      if (addrRes.data && Array.isArray(addrRes.data) && addrRes.data.length > 0) {
        setAddresses(addrRes.data);
        setSelectedAddressId(addrRes.data[0].id);
      } else {
        setAddresses([]);
      }

      // 3. Order history
      if (orderRes.data && Array.isArray(orderRes.data)) {
        const formattedOrders = orderRes.data.map(o => {
          const subtotal = o.amount;
          return {
            orderId: o.orderId || o.id,
            date: new Date(o.createdAt).toISOString().split('T')[0],
            items: o.orderItems || [],
            address: null,
            shippingMethod: "normal",
            paymentMethod: o.paymentMethod || "cod",
            pricing: {
              subtotal,
              shipping: 0,
              discountPercentage: 0,
              discountAmount: 0,
              finalTotal: o.amount
            },
            status: o.status || "Order Confirmed",
            invoiceNumber: o.invoiceNumber,
            estimatedDelivery: new Date(new Date(o.createdAt).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };
        });
        setOrderHistory(formattedOrders);
      }

      // 4. Wishlist
      if (wishlistRes.data && Array.isArray(wishlistRes.data)) {
        setWishlist(wishlistRes.data.map(item => item.productId));
      }

      // 5. Cart
      if (cartRes.data && Array.isArray(cartRes.data)) {
        const formattedCart = cartRes.data.map(item => ({
          cartItemId: `${item.productId}-${item.size}-${item.color}`,
          id: item.productId,
          name: item.product.name,
          price: item.product.price,
          originalPrice: item.product.originalPrice,
          discount: item.product.discount,
          image: getImageUrl(safeJsonParse(item.product.images, [])[0]) || null,
          seller: item.product.seller,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          codPrice: item.product.codPrice,
          onlinePrice: item.product.onlinePrice,
          enableOnlineDiscount: item.product.enableOnlineDiscount,
          onlineDiscount: item.product.onlineDiscount,
          codAvailable: item.product.codAvailable,
          prepaidAvailable: item.product.prepaidAvailable
        }));
        setCart(formattedCart);
      }
    } catch (err) {
      console.error("Failed to load user session data:", err);
    }
  };

  // Helper: Send OTP
  const sendOtp = async (phone) => {
    try {
      const res = await apiClient.post('/auth/send-otp', { phone }, { timeout: 10000 });
      if (res.data && res.data.success) {
        showToast('✓ OTP Sent successfully!', 'success');
        // Return development OTP for dev console logging if present
        return { success: true, developmentOtp: res.data.developmentOtp };
      }
      return { success: false, message: res.data?.message || "Failed to send OTP." };
    } catch (err) {
      console.error("Send OTP failed", err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || "Failed to send OTP.";
      showToast(`✖ ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    }
  };

  // Helper: Simple Name & Mobile Login (Free Validation)
  const simpleLogin = async (name, phone, rememberMe = false) => {
    try {
      const res = await apiClient.post('/auth/simple-login', { name, phone, rememberMe }, { timeout: 10000 });
      if (res.data && res.data.success) {
        const { token, refreshToken, user } = res.data;

        localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('isGuest', 'false');
        sessionStorage.setItem('session_active', 'true');

        // Merge guest cart to DB
        if (cart.length > 0) {
          try {
            await apiClient.post('/users/cart/merge', { cart }, { timeout: 10000 });
          } catch (mergeErr) {
            console.error("Failed to merge guest cart", mergeErr);
          }
        }

        // Load data first before updating user profile to prevent race conditions
        await fetchUserData();
        setUserProfile(user);

        showToast('✓ Logged In Successfully!', 'success');

        // Broadcast to other tabs
        authChannelRef.current?.postMessage({ type: 'LOGIN', user });

        // Redirect after login
        if (redirectAfterLogin) {
          setCurrentView(redirectAfterLogin);
          setRedirectAfterLogin(null);
        } else {
          setCurrentView('home');
        }

        return { success: true };
      }
      return { success: false, message: res.data?.message || "Failed to log in." };
    } catch (err) {
      console.error("Simple login failed", err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || "Failed to log in.";
      showToast(`✖ ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    }
  };

  // Helper: Verify OTP
  const verifyOtp = async (phone, otp, rememberMe = false) => {
    try {
      const res = await apiClient.post('/auth/verify-otp', { phone, code: otp, rememberMe }, { timeout: 10000 });
      if (res.data && res.data.success) {
        const { token, refreshToken, user, isNewUser } = res.data;

        localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('isGuest', 'false');
        sessionStorage.setItem('session_active', 'true');

        // Merge guest cart to DB
        if (cart.length > 0) {
          try {
            await apiClient.post('/users/cart/merge', { cart }, { timeout: 10000 });
          } catch (mergeErr) {
            console.error("Failed to merge guest cart", mergeErr);
          }
        }

        // Load data first before updating user profile to prevent race conditions
        await fetchUserData();
        setUserProfile(user);

        showToast('✓ OTP Verified Successfully!', 'success');

        // Broadcast to other tabs
        authChannelRef.current?.postMessage({ type: 'LOGIN', user });

        // Redirect after login if not a new user completing profile
        if (!isNewUser) {
          if (redirectAfterLogin) {
            setCurrentView(redirectAfterLogin);
            setRedirectAfterLogin(null);
          } else {
            setCurrentView('home');
          }
        }

        return { success: true, isNewUser };
      }
      return { success: false, message: res.data?.message || "Invalid OTP code." };
    } catch (err) {
      console.error("Verify OTP failed", err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || "Invalid OTP code.";
      showToast(`✖ ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    }
  };

  // Helper: Complete Profile
  const completeProfile = async (profileData) => {
    try {
      const res = await apiClient.put('/users/profile', profileData, { timeout: 10000 });
      if (res.data && res.data.success) {
        setUserProfile(res.data.user);
        showToast('✓ Profile completed successfully!', 'success');

        // Redirect after profile completion
        if (redirectAfterLogin) {
          setCurrentView(redirectAfterLogin);
          setRedirectAfterLogin(null);
        } else {
          setCurrentView('home');
        }

        return { success: true };
      }
      return { success: false, message: res.data?.message || "Failed to save profile." };
    } catch (err) {
      console.error("Complete profile failed", err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || "Failed to save profile.";
      showToast(`✖ ${errMsg}`, 'error');
      return { success: false, message: errMsg };
    }
  };

  // Legacy stubs compatibility
  const loginUser = async (email, password, rememberMe = false) => {
    showToast('Traditional login disabled. Use Mobile OTP.', 'warning');
    return { success: false };
  };

  const registerUser = async (email, password, name, phone) => {
    showToast('Traditional registration disabled. Use Mobile OTP.', 'warning');
    return { success: false };
  };

  // Helper: Guest Auto-Login
  const loginAsGuest = async () => {
    const existingToken = localStorage.getItem('accessToken');
    if (existingToken) {
      await fetchUserData();
      return;
    }

    const isAdminLoginMode = new URLSearchParams(window.location.search).get('admin_login') === 'true';
    if (isAdminLoginMode) return;

    try {
      const res = await apiClient.post('/auth/guest-login', {}, { timeout: 10000 });
      if (res.data && res.data.success) {
        const { token: gToken, refreshToken: gRefreshToken, user: gUser } = res.data;
        localStorage.setItem('accessToken', gToken);
        localStorage.setItem('refreshToken', gRefreshToken);
        localStorage.setItem('isGuest', 'true');
        setUserProfile(gUser);

        const tokenHeader = gToken.startsWith('Bearer ') ? gToken : `Bearer ${gToken}`;
        try {
          const [profileRes, addrRes, orderRes] = await Promise.all([
            apiClient.get('/users/profile', { headers: { 'Authorization': tokenHeader }, timeout: 10000 }),
            apiClient.get('/users/addresses', { headers: { 'Authorization': tokenHeader }, timeout: 10000 }),
            apiClient.get('/orders/user/history', { headers: { 'Authorization': tokenHeader }, timeout: 10000 })
          ]);
          setUserProfile(profileRes.data);
          if (addrRes.data && Array.isArray(addrRes.data) && addrRes.data.length > 0) {
            setAddresses(addrRes.data);
            setSelectedAddressId(addrRes.data[0].id);
          } else {
            setAddresses([]);
          }
          if (orderRes.data && Array.isArray(orderRes.data)) {
            setOrderHistory(orderRes.data.map(o => ({
              orderId: o.orderId || o.id,
              date: new Date(o.createdAt).toISOString().split('T')[0],
              items: o.orderItems || [],
              address: null,
              shippingMethod: "normal",
              paymentMethod: o.paymentMethod || "cod",
              pricing: { subtotal: o.amount, shipping: 0, discountPercentage: 0, discountAmount: 0, finalTotal: o.amount },
              status: o.status || "Order Confirmed",
              invoiceNumber: o.invoiceNumber,
              estimatedDelivery: new Date(new Date(o.createdAt).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })));
          } else {
            setOrderHistory([]);
          }
        } catch (innerErr) {
          console.error("Failed to load guest data:", innerErr);
        }
      }
    } catch (err) {
      console.error("Guest auto-login failed:", err);
    }
  };

  // Helper: Logout User
  const logoutUser = async (skipApi = false) => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!skipApi && refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken }, { timeout: 10000 });
      } catch (err) {
        console.error("Backend logout failed", err);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('isGuest');
    sessionStorage.removeItem('session_active');

    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    setUserProfile(null);
    setCart([]);
    setWishlist([]);
    setAddresses(DEFAULT_ADDRESSES);
    setOrderHistory([]);
    setCurrentView('home');

    showToast('✓ Logout Successful!', 'success');

    authChannelRef.current?.postMessage({ type: 'LOGOUT' });

    // Auto-login as a new guest so the visitor has a valid guest session
    await loginAsGuest();
  };

  // Intercept view navigation to protect routes
  const customSetCurrentView = (viewName) => {
    if (viewName !== 'checkout') {
      setQuickPurchaseItem(null);
    }
    const token = localStorage.getItem('accessToken');
    if (['wishlist', 'profile'].includes(viewName) && !token) {
      setRedirectAfterLogin(viewName);
      setCurrentView('profile'); // renders login screen when unauthenticated
      showToast('🔑 Please sign in to access your ' + viewName, 'warning');
    } else if (viewName === 'admin' && (!token || userProfile?.role !== 'admin')) {
      setCurrentView('profile');
      showToast('🛡 Unauthorized: Admin access only.', 'error');
    } else {
      setCurrentView(viewName);
    }
  };

  const fetchPublicData = useCallback(async () => {
    setIsProductsLoading(true);
    setProductsError(null);
    const startTime = Date.now();
    try {
      console.log("[DEBUG API Request]: Initiating public storefront data fetch (/products, /settings, /categories)...");
      
      // Allow up to 60s for Render free tier backend cold start
      const [prodRes, settingsRes, catRes] = await Promise.all([
        apiClient.get('/products', { timeout: 60000 }),
        apiClient.get('/settings', { timeout: 60000 }),
        apiClient.get('/categories', { timeout: 60000 })
      ]);

      const durationMs = Date.now() - startTime;
      console.log(`[DEBUG API Response /products] Succeeded in ${durationMs}ms:`, {
        status: prodRes.status,
        statusText: prodRes.statusText,
        dataType: typeof prodRes.data,
        isArray: Array.isArray(prodRes.data),
        itemCount: Array.isArray(prodRes.data) ? prodRes.data.length : null,
        data: prodRes.data
      });

      setRawApiResponse({
        status: prodRes.status,
        statusText: prodRes.statusText,
        timestamp: new Date().toISOString(),
        durationMs,
        data: prodRes.data,
        error: null
      });

      if (prodRes.data && Array.isArray(prodRes.data)) {
        setProducts(prodRes.data);
      } else {
        console.warn("[DEBUG API Response /products] Response data is not an array:", prodRes.data);
        setProducts([]);
      }

      if (settingsRes.data && settingsRes.data.status === 'success' && settingsRes.data.data) {
        setStoreSettings(settingsRes.data.data);
        setCouponConfig(prev => ({
          ...prev,
          discountPct: settingsRes.data.data.onlineDiscount
        }));
      }

      if (catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err.code === 'ECONNABORTED' 
        ? 'Request timed out after 60s. The backend server on Render free tier may be spinning up from sleep mode (~45s).'
        : (err.response?.data?.message || err.message || 'Failed to connect to backend API server');

      console.error(`[DEBUG API Error /products] Request failed after ${durationMs}ms:`, {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        responseData: err.response?.data,
        errorObj: err
      });

      setProductsError(errorMessage);
      setRawApiResponse({
        status: err.response?.status || 'Network Error / Timeout',
        statusText: err.code || err.name || 'FETCH_ERROR',
        timestamp: new Date().toISOString(),
        durationMs,
        data: err.response?.data || null,
        error: errorMessage
      });
    } finally {
      setIsProductsLoading(false);
    }
  }, []);

  // Initialize session and public data on load
  useEffect(() => {
    fetchPublicData();

    const verifySavedSession = async () => {
      setIsSessionLoading(true);
      try {
        // Always preserve session for guests and OTP users unless explicitly logged out
        sessionStorage.setItem('session_active', 'true');

        const token = localStorage.getItem('accessToken');
        if (token) {
          await fetchUserData();
        } else {
          await loginAsGuest();
        }
      } catch (err) {
        console.error("verifySavedSession failed", err);
      } finally {
        setIsSessionLoading(false);
      }
    };

    fetchPublicData();
    verifySavedSession();
    
    // Foreground FCM listener
    const setupFCMListener = async () => {
      try {
        const payload = await onMessageListener();
        if (payload && payload.notification) {
          showToast(`${payload.notification.title}: ${payload.notification.body}`, 'info');
        }
        setupFCMListener(); // recursive call to keep listening
      } catch (err) {
        console.error("FCM foreground error", err);
      }
    };
    setupFCMListener();
    
  }, []);

  // Listen to multi-tab events and local logout triggers
  useEffect(() => {
    const authChannel = new BroadcastChannel('auth_channel');
    authChannelRef.current = authChannel;

    const handleAuthBroadcast = async (e) => {
      if (e.data.type === 'LOGOUT') {
        setUserProfile(null);
        setCart([]);
        setWishlist([]);
        setAddresses(DEFAULT_ADDRESSES);
        setOrderHistory([]);
        setCurrentView('home');
        showToast('Session logged out on another tab', 'warning');
        await loginAsGuest();
      } else if (e.data.type === 'LOGIN') {
        await fetchUserData();
        showToast('Session logged in on another tab', 'success');
      }
    };

    authChannel.addEventListener('message', handleAuthBroadcast);

    const handleLocalLogoutEvent = async () => {
      await logoutUser(true);
    };

    window.addEventListener('auth-logout', handleLocalLogoutEvent);

    // Storage listener to handle token clearing / changes in other tabs
    const getUserIdFromToken = (t) => {
      if (!t) return null;
      try {
        const parts = t.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          return payload.id;
        }
      } catch (e) {}
      return null;
    };

    const handleStorageChange = async (e) => {
      if (e.key === 'accessToken') {
        const newToken = e.newValue;
        if (!newToken) {
          await logoutUser(true);
        } else {
          const newUserId = getUserIdFromToken(newToken);
          const currentUserId = userProfileRef.current?.id;
          if (newUserId !== currentUserId) {
            await fetchUserData();
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Toast event listener for Axios client integration
    const handleShowToastEvent = (e) => {
      if (e.detail) {
        showToast(e.detail.message, e.detail.type);
      }
    };
    window.addEventListener('show-toast', handleShowToastEvent);

    return () => {
      authChannel.removeEventListener('message', handleAuthBroadcast);
      authChannel.close();
      window.removeEventListener('auth-logout', handleLocalLogoutEvent);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('show-toast', handleShowToastEvent);
    };
  }, []); // Fixed: was [cart] which caused re-registration on every cart change

  // SPA History & URL Parameter Sync
  useEffect(() => {
    const handlePopState = (e) => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || 'home';
      const productId = params.get('id') || 'prod-1';
      const category = params.get('category') || 'All';
      const search = params.get('search') || '';

      setCurrentView(view);
      setSelectedProductId(productId);
      setSelectedCategory(category);
      setSearchQuery(search);

      // Restore scroll position
      if (e.state && typeof e.state.scrollY === 'number') {
        setTimeout(() => {
          window.scrollTo({ top: e.state.scrollY, behavior: 'instant' });
        }, 80);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Track scroll position dynamically to replace state
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (window.history.state) {
          window.history.replaceState(
            { ...window.history.state, scrollY: window.scrollY },
            ''
          );
        }
      }, 150);
    };
    window.addEventListener('scroll', handleScroll);

    // Parse URL on initial load to restore states
    const params = new URLSearchParams(window.location.search);
    const initialView = params.get('view');
    const initialProductId = params.get('id');
    const initialCategory = params.get('category');
    const initialSearch = params.get('search');

    if (initialView && initialView !== 'home') setCurrentView(initialView);
    if (initialProductId && initialProductId !== 'prod-1') setSelectedProductId(initialProductId);
    if (initialCategory && initialCategory !== 'All') setSelectedCategory(initialCategory);
    if (initialSearch) setSearchQuery(initialSearch);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Sync state to URL whenever view/filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentView && currentView !== 'home') params.set('view', currentView);
    if (selectedProductId && currentView === 'product') params.set('id', selectedProductId);
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
    if (searchQuery && searchQuery.trim()) params.set('search', searchQuery);

    const qs = params.toString();
    const newUrl = qs ? `?${qs}` : window.location.pathname;

    if (window.location.search !== `?${qs}` && (window.location.search !== '' || qs !== '')) {
      if (window.history.state) {
        window.history.replaceState(
          { ...window.history.state, scrollY: window.scrollY },
          ''
        );
      }

      window.history.pushState(
        { view: currentView, id: selectedProductId, category: selectedCategory, search: searchQuery, scrollY: 0 },
        '',
        newUrl
      );

      // On click navigation transitions, scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentView, selectedProductId, selectedCategory, searchQuery]);

  // Auto-fill recently viewed products
  useEffect(() => {
    if (selectedProductId) {
      setRecentlyViewed(prev => {
        const filtered = prev.filter(id => id !== selectedProductId);
        return [selectedProductId, ...filtered].slice(0, 4);
      });
    }
  }, [selectedProductId]);

  // Wishlist Manager (with DB sync)
  const toggleWishlist = async (productId) => {
    if (!localStorage.getItem('accessToken')) {
      showToast('⚠ Please log in to use Wishlist', 'warning');
      return;
    }

    const isCurrentlyInWishlist = wishlist.includes(productId);

    // Optimistic UI Update
    setWishlist(prev =>
      isCurrentlyInWishlist
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );

    try {
      if (isCurrentlyInWishlist) {
        await apiClient.delete(`/users/wishlist/${productId}`);
        showToast('💔 Removed from Wishlist', 'success');
      } else {
        await apiClient.post('/users/wishlist', { productId });
        showToast('❤️ Added to Wishlist', 'success');
      }
    } catch (error) {
      console.error("Wishlist sync error", error);
      // Revert optimistic update
      setWishlist(prev =>
        isCurrentlyInWishlist
          ? [...prev, productId]
          : prev.filter(id => id !== productId)
      );
    }
  };

  // Cart Manager
  const addToCart = async (product, variantDetails = {}, quantity = 1) => {
    const selectedSize = variantDetails.size || product.variants?.sizes?.[0] || "";
    const selectedColor = variantDetails.color || product.variants?.colors?.[0] || "";
    const cartItemId = `${product.id}-${selectedSize}-${selectedColor}`;

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [...prevCart, {
          cartItemId,
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          discount: product.discount,
          image: getImageUrl(product.images[0] || (Array.isArray(product.images) ? product.images[0] : JSON.parse(product.images || '[]')[0])),
          seller: product.seller,
          size: selectedSize,
          color: selectedColor,
          quantity,
          codPrice: product.codPrice,
          onlinePrice: product.onlinePrice,
          enableOnlineDiscount: product.enableOnlineDiscount,
          onlineDiscount: product.onlineDiscount,
          codAvailable: product.codAvailable,
          prepaidAvailable: product.prepaidAvailable
        }];
      }
    });
    // Meta Pixel: AddToCart
    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.onlinePrice ?? product.price,
        currency: 'INR',
        contents: [{ id: product.id, quantity }]
      });
    }
    if (localStorage.getItem('accessToken')) {
      try {
        await apiClient.post('/users/cart', {
          productId: product.id,
          quantity,
          size: selectedSize,
          color: selectedColor,
          isOverwrite: false
        });
      } catch (err) {
        console.error("Failed to sync Cart item with database", err);
      }
    }
  };

  const removeFromCart = async (cartItemId) => {
    const item = cart.find(i => i.cartItemId === cartItemId);
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));

    if (localStorage.getItem('accessToken') && item) {
      try {
        await apiClient.delete(`/users/cart/${item.id}?size=${item.size || ''}&color=${item.color || ''}`);
      } catch (err) {
        console.error("Failed to delete item from database cart", err);
      }
    }
  };

  const updateCartQty = async (cartItemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    const item = cart.find(i => i.cartItemId === cartItemId);
    setCart(prev =>
      prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: newQty } : i)
    );

    if (localStorage.getItem('accessToken') && item) {
      try {
        await apiClient.post('/users/cart', {
          productId: item.id,
          quantity: newQty,
          size: item.size || '',
          color: item.color || '',
          isOverwrite: true
        });
      } catch (err) {
        console.error("Failed to update quantity in database cart", err);
      }
    }
  };

  const cartRef = useRef(cart);
  cartRef.current = cart;

  const clearCart = async () => {
    const itemsToDelete = cartRef.current;
    setCart([]);
    if (localStorage.getItem('accessToken') && itemsToDelete.length > 0) {
      try {
        // Parallel delete instead of sequential loop
        await Promise.all(
          itemsToDelete.map(item =>
            apiClient.delete(`/users/cart/${item.id}?size=${item.size || ''}&color=${item.color || ''}`)
          )
        );
      } catch (err) {
        console.error("Failed to clear database cart", err);
      }
    }
  };

  // Address Manager
  const addAddress = async (newAddress) => {
    try {
      const res = await apiClient.post('/users/addresses', newAddress);
      if (res.data) {
        setAddresses(prev => [...prev, res.data]);
        setSelectedAddressId(res.data.id);
        validateAndSetPincode(newAddress.pincode);
        return { success: true };
      }
    } catch (err) {
      console.error("Failed to add address", err);
    }
    return { success: false };
  };

  const updateAddress = async (id, updatedAddress) => {
    try {
      const res = await apiClient.put(`/users/addresses/${id}`, updatedAddress);
      if (res.data) {
        setAddresses(prev => prev.map(addr => addr.id === id ? res.data : addr));
        showToast('✓ Address updated successfully', 'success');
        return { success: true };
      }
    } catch (err) {
      console.error("Failed to update address", err);
      showToast('✖ Failed to update address', 'error');
    }
    return { success: false };
  };

  const deleteAddress = async (id) => {
    try {
      const res = await apiClient.delete(`/users/addresses/${id}`);
      if (res.data && res.data.success) {
        setAddresses(prev => {
          const updated = prev.filter(addr => addr.id !== id);
          // If the deleted address was default, make another one default
          const deletedAddress = prev.find(addr => addr.id === id);
          if (deletedAddress && deletedAddress.isDefault && updated.length > 0) {
            updated[0].isDefault = true;
          }
          return updated;
        });
        if (selectedAddressId === id) {
          setSelectedAddressId(null);
        }
        showToast('✓ Address deleted successfully', 'success');
        return { success: true };
      }
    } catch (err) {
      console.error("Failed to delete address", err);
      showToast('✖ Failed to delete address', 'error');
    }
    return { success: false };
  };

  const updateUserProfile = async (updatedData) => {
    try {
      const res = await apiClient.put('/users/profile', updatedData, { timeout: 10000 });
      if (res.data && res.data.success) {
        setUserProfile(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data?.message || "Failed to update profile details." };
    } catch (err) {
      console.error("Failed to update profile", err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || "Failed to update profile details.";
      return { success: false, message: errMsg };
    }
  };

  // Pincode Validator
  const validateAndSetPincode = (pincode) => {
    const cleaned = pincode.toString().trim();
    if (PINCODE_DATABASE[cleaned]) {
      const data = PINCODE_DATABASE[cleaned];
      setUserPincode(cleaned);
      setLocationName(`${data.city}, ${data.state}`);
      return { success: true, ...data };
    }
    return { success: false };
  };

  // Quick Purchase Shortcut (Skip Cart Checkout)
  const initiateQuickPurchase = (product, variantDetails = {}, paymentOption = 'online') => {
    const selectedSize = variantDetails.size || product.variants?.sizes?.[0] || "";
    const selectedColor = variantDetails.color || product.variants?.colors?.[0] || "";

    const quickItem = {
      cartItemId: `quick-${product.id}`,
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      image: getImageUrl(product.images && (product.images[0] || (Array.isArray(product.images) ? product.images[0] : JSON.parse(product.images || '[]')[0]))),
      seller: product.seller,
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
      codPrice: product.codPrice,
      onlinePrice: product.onlinePrice,
      enableOnlineDiscount: product.enableOnlineDiscount,
      onlineDiscount: product.onlineDiscount,
      codAvailable: product.codAvailable,
      prepaidAvailable: product.prepaidAvailable
    };

    setSelectedPaymentMethod(paymentOption === 'cod' ? 'cod' : 'upi');
    setQuickPurchaseItem(quickItem);
    customSetCurrentView('checkout');
  };

  // Place Order to Database
  // Place Order to Database
  const placeOrder = async () => {
    if (orderProcessing) return;

    if (addresses.length === 0 || !selectedAddressId) {
      showToast("⚠ Please add a delivery address.", "warning");
      return;
    }

    setOrderProcessing(true);
    const address = addresses.find(a => a.id === selectedAddressId) || addresses[0];
    const activeItems = quickPurchaseItem ? [quickPurchaseItem] : cart;

    // Calculate final pricing totals
    const subtotal = activeItems.reduce((acc, item) => {
      const itemPrice = selectedPaymentMethod === 'cod'
        ? (item.codPrice !== null && item.codPrice !== undefined ? item.codPrice : item.price)
        : (item.onlinePrice !== null && item.onlinePrice !== undefined ? item.onlinePrice : item.price);
      return acc + (itemPrice * item.quantity);
    }, 0);
    const shipping = selectedShippingMethod === "express" ? 150 : 0;
    const isOnline = selectedPaymentMethod !== "cod";
    const isCouponValid = couponConfig.enabled && new Date(couponConfig.expiry) > new Date() && subtotal >= couponConfig.minPurchase;
    const discountAmount = (isOnline && isCouponValid) ? Math.round(subtotal * (couponConfig.discountPct / 100)) : 0;
    const discountPercentage = (isOnline && isCouponValid) ? couponConfig.discountPct : 0;
    const finalTotal = subtotal + shipping - discountAmount;

    const itemsPayload = activeItems.map(item => ({
      productId: item.id,
      quantity: item.quantity
    }));

    if (selectedPaymentMethod !== 'cod') {
      // Razorpay Online Flow
      try {
        const createRes = await apiClient.post('/payments/razorpay/create-order', {
          items: itemsPayload,
          pincode: address?.pincode || userPincode,
          addressId: address?.id,
          couponCode: isCouponValid ? couponConfig.code : undefined,
          idempotencyKey: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        });

        if (!createRes.data || !createRes.data.success) {
          showToast("Payment failed. Please try again.", "error");
          setOrderProcessing(false);
          return;
        }

        const { razorpay_order_id, razorpay_key_id, amount, currency, internal_order_id } = createRes.data;

        const options = {
          key: razorpay_key_id,
          amount: amount,
          currency: currency,
          name: "RK Peedika",
          description: "Payment for Order " + internal_order_id,
          image: "/images/logo.jpg",
          order_id: razorpay_order_id,
          handler: async function (response) {
            showToast("Processing your payment...", "info");
            setOrderProcessing(true);
            try {
              const verifyRes = await apiClient.post('/payments/razorpay/verify', {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                internal_order_id: internal_order_id
              });

              if (verifyRes.data && verifyRes.data.success) {
                const dbOrder = verifyRes.data.order;
                let fetchedItems = [...activeItems];
                try {
                  const fullOrderRes = await apiClient.get(`/orders/${dbOrder.id}`);
                  if (fullOrderRes.data && fullOrderRes.data.orderItems) {
                    fetchedItems = fullOrderRes.data.orderItems;
                  }
                } catch (e) { }

                const newOrder = {
                  orderId: dbOrder.orderId || dbOrder.id,
                  date: new Date(dbOrder.createdAt).toISOString().split('T')[0],
                  items: fetchedItems,
                  address,
                  shippingMethod: selectedShippingMethod,
                  paymentMethod: 'razorpay',
                  paymentStatus: 'paid',
                  pricing: {
                    subtotal,
                    shipping,
                    discountPercentage,
                    discountAmount,
                    finalTotal
                  },
                  status: dbOrder.status || "confirmed",
                  invoiceNumber: dbOrder.invoiceNumber || `INV-${dbOrder.id}`,
                  transactionType: "ONLINE",
                  estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                };

                setActiveOrder(newOrder);
                setOrderHistory(prev => [newOrder, ...prev]);
                if (quickPurchaseItem) {
                  setQuickPurchaseItem(null);
                } else {
                  setCart([]);
                }
                showToast("Payment successful. Your order has been confirmed.", "success");
                // Meta Pixel: Purchase (Online)
                if (window.fbq) {
                  window.fbq('track', 'Purchase', {
                    value: finalTotal,
                    currency: 'INR',
                    content_ids: activeItems.map(item => item.id),
                    contents: activeItems.map(item => ({ id: item.id, quantity: item.quantity })),
                    content_type: 'product',
                    order_id: dbOrder.orderId || dbOrder.id
                  });
                }
                setCurrentView('success');
              } else {
                showToast("Payment failed. Please try again.", "error");
              }
            } catch (err) {
              console.error(err);
              showToast("Payment failed. Please try again.", "error");
            } finally {
              setOrderProcessing(false);
            }
          },
          prefill: {
            name: userProfile?.name || "",
            email: userProfile?.email || "",
            contact: userProfile?.phone ? (userProfile.phone.startsWith('+91') ? userProfile.phone : '+91' + userProfile.phone) : ""
          },
          theme: {
            color: "#0B1B2B"
          },
          modal: {
            ondismiss: function () {
              showToast("Payment cancelled. You can try again.", "warning");
              setOrderProcessing(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          showToast("Payment failed. Please try again.", "error");
          setOrderProcessing(false);
        });
        rzp.open();
      } catch (err) {
        console.error(err);
        showToast("Unable to connect to the payment service. Please try again.", "error");
        setOrderProcessing(false);
      }
      return;
    }

    const idempotencyKey = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    try {
      const res = await apiClient.post('/orders', {
        items: itemsPayload,
        paymentMethod: selectedPaymentMethod,
        pincode: address?.pincode || userPincode,
        addressId: address?.id,
        couponCode: isCouponValid ? couponConfig.code : undefined,
        idempotencyKey
      });

      if (res.data && res.data.success && res.data.order) {
        const dbOrder = res.data.order;

        let fetchedItems = [...activeItems];
        try {
          const fullOrderRes = await apiClient.get(`/orders/${dbOrder.id}`);
          if (fullOrderRes.data && fullOrderRes.data.orderItems) {
            fetchedItems = fullOrderRes.data.orderItems;
          }
        } catch (e) {
          console.error("Could not fetch full order details", e);
        }

        const newOrder = {
          orderId: dbOrder.orderId || dbOrder.id,
          date: new Date(dbOrder.createdAt).toISOString().split('T')[0],
          items: fetchedItems,
          address,
          shippingMethod: selectedShippingMethod,
          paymentMethod: selectedPaymentMethod,
          pricing: {
            subtotal,
            shipping,
            discountPercentage,
            discountAmount,
            finalTotal
          },
          status: dbOrder.status || "Order Confirmed",
          invoiceNumber: dbOrder.invoiceNumber || `INV-${dbOrder.id}`,
          transactionType: dbOrder.transactionType || "Cash",
          estimatedDelivery: new Date(Date.now() + (selectedShippingMethod === "express" ? 2 : 4) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        setActiveOrder(newOrder);
        setOrderHistory(prev => [newOrder, ...prev]);
        if (quickPurchaseItem) {
          setQuickPurchaseItem(null);
        } else {
          setCart([]); // Clear local cart state
        }
        showToast('✓ Order Placed Successfully!', 'success');
        // Meta Pixel: Purchase (COD)
        if (window.fbq) {
          window.fbq('track', 'Purchase', {
            value: finalTotal,
            currency: 'INR',
            content_ids: activeItems.map(item => item.id),
            contents: activeItems.map(item => ({ id: item.id, quantity: item.quantity })),
            content_type: 'product',
            order_id: dbOrder.orderId || dbOrder.id
          });
        }
        setCurrentView('success');
      }
    } catch (err) {
      console.error("Failed to place order in database", err);
      showToast('✖ Could not process order.', 'error');
    } finally {
      setOrderProcessing(false);
    }
  };

  // Add customized products (Admin panel helper)
  const addProductFromAdmin = async (newProd) => {
    let catId = categories.find(c => c.name === newProd.category || c.slug === newProd.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'))?.id;
    if (!catId && categories.length > 0) {
      catId = categories[0].id;
    }

    const payload = {
      name: newProd.name,
      tagline: newProd.tagline || "Artisanal Crafted Product",
      description: newProd.description || "",
      price: Number(newProd.price),
      originalPrice: Number(newProd.originalPrice),
      categoryId: catId,
      stock: 10,
      seller: newProd.seller || "Artisanal Seller (GST Verified)",
      images: [newProd.image || "/images/coffee_maker_1.jpg"],
      codPrice: Number(newProd.price),
      onlinePrice: Number(newProd.price) - 100,
      enableOnlineDiscount: true,
      onlineDiscount: 12
    };

    try {
      await apiClient.post('/products', payload);
      const prodRes = await apiClient.get('/products');
      if (prodRes.data) {
        setProducts(prodRes.data);
      }
    } catch (err) {
      console.error("Failed to add product via AdminPanel", err);
    }
  };

  const addCategoryFromAdmin = async (newCat) => {
    try {
      await apiClient.post('/categories', {
        name: newCat.name,
        slug: newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        image: newCat.image || "/images/category_kitchen.jpg",
        description: newCat.description || ""
      });
      const catRes = await apiClient.get('/categories');
      if (catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error("Failed to add category via AdminPanel", err);
    }
  };

  const contextValue = useMemo(() => ({
      // View router
      currentView,
      setCurrentView: customSetCurrentView,
      selectedProductId,
      setSelectedProductId,
      recentlyViewed,

      // Products list
      products,
      setProducts,
      isProductsLoading,
      productsError,
      refetchProducts: fetchPublicData,
      rawApiResponse,
      addProductFromAdmin,
      addCategoryFromAdmin,

      // Cart/Wishlist
      cart,
      quickPurchaseItem,
      setQuickPurchaseItem,
      wishlist,
      toggleWishlist,
      addToCart,
      removeFromCart,
      updateCartQty,
      clearCart,
      initiateQuickPurchase,

      // Checkout/Shipping
      addresses,
      selectedAddressId,
      setSelectedAddressId,
      addAddress,
      updateAddress,
      deleteAddress,
      selectedShippingMethod,
      setSelectedShippingMethod,
      selectedPaymentMethod,
      setSelectedPaymentMethod,
      placeOrder,
      activeOrder,
      orderHistory,

      // Location details
      userPincode,
      locationName,
      validateAndSetPincode,
      pincodeDatabase: PINCODE_DATABASE,

      // Filter settings
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,

      // Admin config
      couponConfig,
      setCouponConfig,

      // User details & store settings
      userProfile,
      isSessionLoading,
      loginUser,
      registerUser,
      sendOtp,
      verifyOtp,
      completeProfile,
      simpleLogin,
      logoutUser,
      updateUserProfile,
      storeSettings,
      categories,

      // UI Utils
      activeToast,
      showToast,
      orderProcessing,
      setOrderProcessing,
      trackingOrderId,
      setTrackingOrderId
  }), [
    currentView, selectedProductId, recentlyViewed, products, isProductsLoading,
    productsError, fetchPublicData, rawApiResponse,
    cart, quickPurchaseItem, wishlist, addresses, selectedAddressId,
    selectedShippingMethod, selectedPaymentMethod, activeOrder, orderHistory,
    userPincode, locationName, searchQuery, selectedCategory, couponConfig,
    userProfile, isSessionLoading, storeSettings, categories, activeToast, orderProcessing, trackingOrderId
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
