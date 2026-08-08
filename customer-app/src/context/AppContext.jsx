import React, { createContext, useState, useEffect } from 'react';
import { DEFAULT_PRODUCTS } from '../constants/products';
import { DEFAULT_ADDRESSES } from '../constants/addresses';
import { PINCODE_DATABASE } from '../constants/pincodes';
import apiClient from '../api/client';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // App routing & views
  const [currentView, setCurrentView] = useState('home'); // home | product | checkout | success | admin | login
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("prod-1");
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  
  // E-commerce items
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
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
      // 1. Profile
      const profileRes = await apiClient.get('/users/profile');
      setUserProfile(profileRes.data);

      // 2. Address book
      const addrRes = await apiClient.get('/users/addresses');
      if (addrRes.data && Array.isArray(addrRes.data) && addrRes.data.length > 0) {
        setAddresses(addrRes.data);
        setSelectedAddressId(addrRes.data[0].id);
      } else {
        setAddresses([]);
      }

      // 3. Order history
      const orderRes = await apiClient.get('/orders/user/history');
      if (orderRes.data && Array.isArray(orderRes.data)) {
        const formattedOrders = orderRes.data.map(o => {
          const subtotal = o.amount;
          return {
            orderId: o.id,
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
      const wishlistRes = await apiClient.get('/users/wishlist');
      if (wishlistRes.data && Array.isArray(wishlistRes.data)) {
        setWishlist(wishlistRes.data.map(item => item.productId));
      }

      // 5. Cart
      const cartRes = await apiClient.get('/users/cart');
      if (cartRes.data && Array.isArray(cartRes.data)) {
        const formattedCart = cartRes.data.map(item => ({
          cartItemId: `${item.productId}-${item.size}-${item.color}`,
          id: item.productId,
          name: item.product.name,
          price: item.product.price,
          originalPrice: item.product.originalPrice,
          discount: item.product.discount,
          image: JSON.parse(item.product.images)[0],
          seller: item.product.seller,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          codPrice: item.product.codPrice,
          onlinePrice: item.product.onlinePrice,
          enableOnlineDiscount: item.product.enableOnlineDiscount,
          onlineDiscount: item.product.onlineDiscount
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
      const res = await apiClient.post('/auth/send-otp', { phone });
      if (res.data && res.data.success) {
        showToast('✓ OTP Sent successfully!', 'success');
        // Return development OTP for dev console logging if present
        return { success: true, developmentOtp: res.data.developmentOtp };
      }
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
      const res = await apiClient.post('/auth/simple-login', { name, phone, rememberMe });
      if (res.data && res.data.success) {
        const { token, refreshToken, user } = res.data;

        localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('session_active', 'true');

        // Merge guest cart to DB
        if (cart.length > 0) {
          try {
            await apiClient.post('/users/cart/merge', { cart });
          } catch (mergeErr) {
            console.error("Failed to merge guest cart", mergeErr);
          }
        }

        // Load data
        setUserProfile(user);
        await fetchUserData();

        showToast('✓ Logged In Successfully!', 'success');

        // Broadcast to other tabs
        const authChannel = new BroadcastChannel('auth_channel');
        authChannel.postMessage({ type: 'LOGIN', user });
        authChannel.close();

        // Redirect after login
        if (redirectAfterLogin) {
          setCurrentView(redirectAfterLogin);
          setRedirectAfterLogin(null);
        } else {
          setCurrentView('profile');
        }

        return { success: true };
      }
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
      const res = await apiClient.post('/auth/verify-otp', { phone, code: otp, rememberMe });
      if (res.data && res.data.success) {
        const { token, refreshToken, user, isNewUser } = res.data;

        localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('session_active', 'true');

        // Merge guest cart to DB
        if (cart.length > 0) {
          try {
            await apiClient.post('/users/cart/merge', { cart });
          } catch (mergeErr) {
            console.error("Failed to merge guest cart", mergeErr);
          }
        }

        // Load data
        setUserProfile(user);
        await fetchUserData();

        showToast('✓ OTP Verified Successfully!', 'success');

        // Broadcast to other tabs
        const authChannel = new BroadcastChannel('auth_channel');
        authChannel.postMessage({ type: 'LOGIN', user });
        authChannel.close();

        // Redirect after login if not a new user completing profile
        if (!isNewUser) {
          if (redirectAfterLogin) {
            setCurrentView(redirectAfterLogin);
            setRedirectAfterLogin(null);
          } else {
            setCurrentView('profile');
          }
        }

        return { success: true, isNewUser };
      }
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
      const res = await apiClient.put('/users/profile', profileData);
      if (res.data && res.data.success) {
        setUserProfile(res.data.user);
        showToast('✓ Profile completed successfully!', 'success');
        
        // Redirect after profile completion
        if (redirectAfterLogin) {
          setCurrentView(redirectAfterLogin);
          setRedirectAfterLogin(null);
        } else {
          setCurrentView('profile');
        }
        
        return { success: true };
      }
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

  // Helper: Logout User
  const logoutUser = async (skipApi = false) => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!skipApi && refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch (err) {
        console.error("Backend logout failed", err);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
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

    const authChannel = new BroadcastChannel('auth_channel');
    authChannel.postMessage({ type: 'LOGOUT' });
    authChannel.close();
  };

  // Intercept view navigation to protect routes
  const customSetCurrentView = (viewName) => {
    const token = localStorage.getItem('accessToken');
    if (['checkout', 'wishlist', 'profile'].includes(viewName) && !token) {
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

  // Initialize session and public data on load
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        // Products
        const prodRes = await apiClient.get('/products');
        if (prodRes.data && Array.isArray(prodRes.data)) {
          setProducts(prodRes.data);
        }

        // Settings
        const settingsRes = await apiClient.get('/settings');
        if (settingsRes.data && settingsRes.data.status === 'success' && settingsRes.data.data) {
          setStoreSettings(settingsRes.data.data);
          setCouponConfig(prev => ({
            ...prev,
            discountPct: settingsRes.data.data.onlineDiscount
          }));
        }

        // Categories
        const catRes = await apiClient.get('/categories');
        if (catRes.data) {
          setCategories(catRes.data);
        }
      } catch (err) {
        console.error("Failed to load storefront assets:", err);
      }
    };

    const verifySavedSession = async () => {
      // Check Remember Me criteria
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const sessionActive = sessionStorage.getItem('session_active') === 'true';

      if (!rememberMe && !sessionActive) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      sessionStorage.setItem('session_active', 'true');

      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetchUserData();
      } else {
        // Silent guest auto-login for frictionless shopping, unless admin login is specified in the URL query string
        const isAdminLoginMode = new URLSearchParams(window.location.search).get('admin_login') === 'true';
        if (!isAdminLoginMode) {
          try {
            const res = await apiClient.post('/auth/guest-login');
            if (res.data && res.data.success) {
              const { token: gToken, refreshToken: gRefreshToken, user: gUser } = res.data;
              localStorage.setItem('accessToken', gToken);
              localStorage.setItem('refreshToken', gRefreshToken);
              setUserProfile(gUser);
              
              const tokenHeader = gToken.startsWith('Bearer ') ? gToken : `Bearer ${gToken}`;
              try {
                const profileRes = await apiClient.get('/users/profile', { headers: { 'Authorization': tokenHeader } });
                setUserProfile(profileRes.data);
                const addrRes = await apiClient.get('/users/addresses', { headers: { 'Authorization': tokenHeader } });
                if (addrRes.data && Array.isArray(addrRes.data) && addrRes.data.length > 0) {
                  setAddresses(addrRes.data);
                  setSelectedAddressId(addrRes.data[0].id);
                }
                const orderRes = await apiClient.get('/orders/user/history', { headers: { 'Authorization': tokenHeader } });
                if (orderRes.data && Array.isArray(orderRes.data)) {
                  setOrderHistory(orderRes.data.map(o => ({
                    orderId: o.id,
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
                }
              } catch (innerErr) {
                console.error("Failed to load guest data:", innerErr);
              }
            }
          } catch (err) {
            console.error("Guest auto-login failed:", err);
          }
        }
      }
    };

    fetchPublicData();
    verifySavedSession();
  }, []);

  // Listen to multi-tab events and local logout triggers
  useEffect(() => {
    const authChannel = new BroadcastChannel('auth_channel');
    
    const handleAuthBroadcast = (e) => {
      if (e.data.type === 'LOGOUT') {
        setUserProfile(null);
        setCart([]);
        setWishlist([]);
        setAddresses(DEFAULT_ADDRESSES);
        setOrderHistory([]);
        setCurrentView('home');
        showToast('Session logged out on another tab', 'warning');
      } else if (e.data.type === 'LOGIN') {
        setUserProfile(e.data.user);
        fetchUserData();
        showToast('Session logged in on another tab', 'success');
      }
    };

    authChannel.addEventListener('message', handleAuthBroadcast);

    const handleLocalLogoutEvent = () => {
      logoutUser(true);
    };

    window.addEventListener('auth-logout', handleLocalLogoutEvent);
    
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
      window.removeEventListener('show-toast', handleShowToastEvent);
    };
  }, [cart]);

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
          image: product.images[0] || (Array.isArray(product.images) ? product.images[0] : JSON.parse(product.images || '[]')[0]),
          seller: product.seller,
          size: selectedSize,
          color: selectedColor,
          quantity,
          codPrice: product.codPrice,
          onlinePrice: product.onlinePrice,
          enableOnlineDiscount: product.enableOnlineDiscount,
          onlineDiscount: product.onlineDiscount
        }];
      }
    });

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

  const clearCart = async () => {
    setCart([]);
    if (localStorage.getItem('accessToken')) {
      try {
        for (const item of cart) {
          await apiClient.delete(`/users/cart/${item.id}?size=${item.size || ''}&color=${item.color || ''}`);
        }
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
      const res = await apiClient.put('/users/profile', updatedData);
      if (res.data && res.data.success) {
        setUserProfile(res.data.user);
        return { success: true };
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    }
    return { success: false };
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
      image: product.images[0] || (Array.isArray(product.images) ? product.images[0] : JSON.parse(product.images || '[]')[0]),
      seller: product.seller,
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
      codPrice: product.codPrice,
      onlinePrice: product.onlinePrice,
      enableOnlineDiscount: product.enableOnlineDiscount,
      onlineDiscount: product.onlineDiscount
    };
    
    setSelectedPaymentMethod(paymentOption === 'cod' ? 'cod' : 'upi');
    setCart([quickItem]);
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
    
    // Calculate final pricing totals
    const subtotal = cart.reduce((acc, item) => {
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
    
    const itemsPayload = cart.map(item => ({
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
                let fetchedItems = [...cart];
                try {
                  const fullOrderRes = await apiClient.get(`/orders/${dbOrder.id}`);
                  if (fullOrderRes.data && fullOrderRes.data.orderItems) {
                    fetchedItems = fullOrderRes.data.orderItems;
                  }
                } catch (e) {}

                const newOrder = {
                  orderId: dbOrder.id,
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
                setCart([]);
                showToast("Payment successful. Your order has been confirmed.", "success");
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
            color: "#F7941D"
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
        
        let fetchedItems = [...cart];
        try {
          const fullOrderRes = await apiClient.get(`/orders/${dbOrder.id}`);
          if (fullOrderRes.data && fullOrderRes.data.orderItems) {
            fetchedItems = fullOrderRes.data.orderItems;
          }
        } catch (e) {
          console.error("Could not fetch full order details", e);
        }

        const newOrder = {
          orderId: dbOrder.id,
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
        setCart([]); // Clear local cart state
        showToast('✓ Order Placed Successfully!', 'success');
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

  return (
    <AppContext.Provider value={{
      // View router
      currentView,
      setCurrentView: customSetCurrentView,
      selectedProductId,
      setSelectedProductId,
      recentlyViewed,
      
      // Products list
      products,
      setProducts,
      addProductFromAdmin,

      // Cart/Wishlist
      cart,
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
    }}>
      {children}
    </AppContext.Provider>
  );
};
