import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Settings, PlusCircle, Database, Percent, ShoppingBag, Landmark, ArrowLeft, Users, RefreshCcw, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client';

export default function AdminPanel() {
  const { 
    couponConfig, 
    setCouponConfig, 
    products, 
    addProductFromAdmin, 
    orderHistory,
    setCurrentView,
    categories
  } = useContext(AppContext);

  // Form states
  const [configForm, setConfigForm] = useState(couponConfig);
  const [successMsg, setSuccessMsg] = useState("");
  
  const [newProduct, setNewProduct] = useState({
    name: "",
    tagline: "",
    description: "",
    price: "",
    originalPrice: "",
    category: categories[0]?.name || "Kitchen & Dining",
    seller: "",
    image: ""
  });

  // Backend States
  const [subscribers, setSubscribers] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [badges, setBadges] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [otpLogs, setOtpLogs] = useState([]);
  const [showOtpLogsModal, setShowOtpLogsModal] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    fetchSubscribers();
    fetchExchanges();
    fetchBadges();
    fetchUsers();
    fetchOtpLogs();
  }, []);

  const fetchUsers = async (searchVal = "") => {
    try {
      const res = await apiClient.get(`/users/admin/users?search=${searchVal}`);
      if (res.data) setUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchUserLoginHistory = async (userId) => {
    try {
      const res = await apiClient.get(`/users/admin/users/${userId}/login-history`);
      if (res.data) setLoginHistory(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch user login history', err);
    }
  };

  const fetchOtpLogs = async () => {
    try {
      const res = await apiClient.get('/users/admin/otp-logs');
      if (res.data) {
        setOtpLogs(res.data.data || []);
        setIsDevMode(true);
      } else {
        setIsDevMode(false);
      }
    } catch (err) {
      setIsDevMode(false);
    }
  };

  const handleToggleUserBlock = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'banned' : 'active';
    try {
      const res = await apiClient.put(`/users/admin/users/${userId}/block`, { status: nextStatus });
      if (res.data) {
        setSuccessMsg(`User account successfully ${nextStatus === 'active' ? 'activated' : 'disabled'}!`);
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchUsers(userSearch);
      }
    } catch (err) {
      console.error('Failed to toggle block status', err);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const res = await apiClient.get('/admin/newsletter/subscribers');
      if (res.data) setSubscribers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch subscribers', err);
    }
  };

  const fetchExchanges = async () => {
    try {
      const res = await apiClient.get('/admin/exchanges');
      if (res.data) setExchanges(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch exchanges', err);
    }
  };

  const fetchBadges = async () => {
    try {
      const res = await apiClient.get('/admin/badges');
      if (res.data) setBadges(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch badges', err);
    }
  };

  const handleUpdateExchangeStatus = async (id, status) => {
    try {
      const res = await apiClient.put(`/admin/exchanges/${id}/status`, { status });
      if (res.data) {
        setSuccessMsg(`Exchange request ${status} successfully!`);
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchExchanges();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleUpdateBadge = async (e, id) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedBadge = {
      title: formData.get('title'),
      description: formData.get('description'),
      iconName: formData.get('iconName'),
      isVisible: formData.get('isVisible') === 'on',
      order: Number(formData.get('order')),
      actionUrl: formData.get('actionUrl')
    };

    try {
      const res = await apiClient.put(`/admin/badges/${id}`, updatedBadge);
      if (res.data) {
        setSuccessMsg("Badge updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchBadges();
      }
    } catch (err) {
      console.error('Failed to update badge', err);
    }
  };

  const handleExportSubscribers = () => {
    if (subscribers.length === 0) {
      window.showAlert("No subscribers to export.", "Subscriber Export");
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Email,Status,SubscribedAt\n" 
      + subscribers.map(sub => `${sub.id},${sub.email},${sub.status},${sub.subscribedAt}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "newsletter_subscribers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSubscriber = async (id) => {
    const ok = await window.showConfirm("Permanently delete this subscriber?", "Delete Subscriber");
    if (ok) {
      try {
        const res = await apiClient.delete(`/admin/newsletter/subscribers/${id}`);
        if (res.data) {
          setSuccessMsg("Subscriber deleted successfully.");
          setTimeout(() => setSuccessMsg(""), 3000);
          fetchSubscribers();
        }
      } catch (err) {
        console.error('Failed to delete subscriber', err);
      }
    }
  };

  const handleUpdateDiscount = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.put('/settings', {
        onlineDiscount: Number(configForm.discountPct)
      });
      if (res.data) {
        setCouponConfig(configForm);
        setSuccessMsg("Discount configurations persisted in database!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Failed to persist discount settings", err);
    }
  };

  const handleAddProductSubmit = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.originalPrice) {
      window.showAlert("Please fill in all mandatory fields.", "Validation Error");
      return;
    }
    addProductFromAdmin(newProduct);
    setSuccessMsg("Premium product added to store catalog!");
    setNewProduct({
      name: "",
      tagline: "",
      description: "",
      price: "",
      originalPrice: "",
      category: categories[0]?.name || "Kitchen & Dining",
      seller: "",
      image: ""
    });
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      
      {/* Return Navigation */}
      <button 
        onClick={() => setCurrentView('home')}
        className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-charcoal mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> <span>Back to Storefront</span>
      </button>

      <div className="flex flex-col md:flex-row items-baseline justify-between mb-8 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-charcoal tracking-tight flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-[#F7941D]" /> Admin Dashboard
          </h2>
          <p className="text-xs font-medium text-gray-400 mt-1">Configure pricing engines, add physical collections, and monitor operations.</p>
        </div>
        {successMsg && (
          <div className="mt-2 md:mt-0 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-premium">
            {successMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Pricing Engine & Discount Controller */}
        <div className="space-y-6">
          <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 flex items-center gap-2">
              <Percent className="h-4.5 w-4.5 text-[#F7941D]" /> Coupon Management
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Configure dynamic top-bar coupon parameters.
            </p>

            <form onSubmit={handleUpdateDiscount} className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox" 
                  checked={configForm.enabled}
                  onChange={(e) => setConfigForm({...configForm, enabled: e.target.checked})}
                  className="w-4 h-4 text-[#F7941D] border-gray-300 rounded focus:ring-[#F7941D]"
                />
                <label className="text-xs font-bold text-charcoal">Enable Coupon System</label>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Coupon Code</label>
                <input 
                  type="text" 
                  value={configForm.code}
                  onChange={(e) => setConfigForm({...configForm, code: e.target.value})}
                  className="w-full rounded-premium border border-gray-200 px-3 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Discount %</label>
                  <input 
                    type="number" 
                    value={configForm.discountPct}
                    onChange={(e) => setConfigForm({...configForm, discountPct: Number(e.target.value)})}
                    className="w-full rounded-premium border border-gray-200 px-3 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Min Purchase</label>
                  <input 
                    type="number" 
                    value={configForm.minPurchase}
                    onChange={(e) => setConfigForm({...configForm, minPurchase: Number(e.target.value)})}
                    className="w-full rounded-premium border border-gray-200 px-3 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Expiry Date</label>
                <input 
                  type="date" 
                  value={configForm.expiry}
                  onChange={(e) => setConfigForm({...configForm, expiry: e.target.value})}
                  className="w-full rounded-premium border border-gray-200 px-3 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>
              <button 
                type="submit"
                className="w-full rounded-premium bg-[#F7941D] py-2 mt-2 text-xs font-bold text-white hover:bg-[#E07D10] transition-premium shadow-sm"
              >
                Apply Coupon Settings
              </button>
            </form>
          </div>

          {/* Active stats details */}
          <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-3.5 flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-[#F7941D]" /> Inventory Status
            </h3>
            <div className="space-y-3.5">
              <div className="flex justify-between text-xs border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-medium">Catalog Products count</span>
                <span className="font-bold text-charcoal">{products.length} Items</span>
              </div>
              <div className="flex justify-between text-xs border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-medium">Total Orders Placed</span>
                <span className="font-bold text-[#F7941D]">{orderHistory.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Payment Gateway Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">● UPI/Cards Sandbox Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Add Product Form */}
        <div className="rounded-premium border border-gray-100 bg-white p-6 shadow-premium lg:col-span-2">
          <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 flex items-center gap-2">
            <PlusCircle className="h-4.5 w-4.5 text-[#F7941D]" /> Add New Product Listing
          </h3>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Populate custom artisanal items directly into the store catalog. All products are initialized with automatic image zoom and premium card rendering.
          </p>

          <form onSubmit={handleAddProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Product Name *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Pure Copper Water Jug"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Tagline / Short description</label>
              <input 
                type="text" 
                placeholder="e.g. Crafted in Pune, purifies naturally."
                value={newProduct.tagline}
                onChange={(e) => setNewProduct({...newProduct, tagline: e.target.value})}
                className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Detailed Description</label>
              <textarea 
                rows={3}
                placeholder="Write highlights about the craft material, maker history..."
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Final Sale Price (₹) *</label>
              <input 
                type="number" 
                required
                placeholder="e.g. 1299"
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Original MRP Price (₹) *</label>
              <input 
                type="number" 
                required
                placeholder="e.g. 1999"
                value={newProduct.originalPrice}
                onChange={(e) => setNewProduct({...newProduct, originalPrice: e.target.value})}
                className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Category *</label>
              <select 
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-sm text-charcoal bg-white outline-none focus:border-[#F7941D]"
              >
                {categories.map(cat => (
                  <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Verified Seller Name</label>
              <input 
                type="text" 
                placeholder="e.g. Jaipur Crafts Coop"
                value={newProduct.seller}
                onChange={(e) => setNewProduct({...newProduct, seller: e.target.value})}
                className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-sm text-charcoal outline-none focus:border-[#F7941D]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Product Image (URL / Mock Name)</label>
              <select 
                value={newProduct.image}
                onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                className="w-full rounded-premium border border-gray-200 px-3.5 py-2 text-sm text-charcoal bg-white outline-none focus:border-[#F7941D]"
              >
                <option value="/images/coffee_maker_1.jpg">Use Brass Filter Coffee Asset</option>
                <option value="/images/ayurvedic_1.jpg">Use Ayurvedic Serum Asset</option>
                <option value="/images/spice_box_1.jpg">Use Wooden Spice Box Asset</option>
                <option value="/images/silk_stole_1.jpg">Use Silk Stole Asset</option>
              </select>
            </div>

            <div className="md:col-span-2 mt-2">
              <button 
                type="submit"
                className="w-full rounded-premium bg-[#F7941D] py-3 text-xs font-bold text-white hover:bg-[#E07D10] transition-premium shadow-sm"
              >
                Publish Product to Catalog
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* NEW SECTION: Trust Badges Configuration */}
      <div className="mt-8 rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
        <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-[#F7941D]" /> Trust Badges Configuration
        </h3>
        
        {badges.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium text-xs">
            No trust badges found. Make sure to seed the database.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {badges.map((badge) => (
              <form key={badge.id} onSubmit={(e) => handleUpdateBadge(e, badge.id)} className="border p-4 rounded-premium bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-center mb-2 border-b pb-2">
                  <span className="font-bold text-xs uppercase text-charcoal">Edit Badge</span>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="isVisible" defaultChecked={badge.isVisible} className="w-4 h-4 text-[#F7941D]" />
                    <label className="text-[10px] font-bold text-gray-400">Visible</label>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Title</label>
                    <input type="text" name="title" defaultValue={badge.title} required className="w-full border px-2 py-1.5 text-xs rounded outline-none focus:border-[#F7941D]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Description</label>
                    <input type="text" name="description" defaultValue={badge.description} required className="w-full border px-2 py-1.5 text-xs rounded outline-none focus:border-[#F7941D]" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Icon (Lucide)</label>
                    <input type="text" name="iconName" defaultValue={badge.iconName} required className="w-full border px-2 py-1.5 text-xs rounded outline-none focus:border-[#F7941D]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Order</label>
                    <input type="number" name="order" defaultValue={badge.order} required className="w-full border px-2 py-1.5 text-xs rounded outline-none focus:border-[#F7941D]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Action URL</label>
                    <input type="text" name="actionUrl" defaultValue={badge.actionUrl || ''} placeholder="e.g. mailto:..." className="w-full border px-2 py-1.5 text-xs rounded outline-none focus:border-[#F7941D]" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-charcoal text-white text-xs font-bold py-2 rounded hover:bg-black transition-premium">
                  Save Changes
                </button>
              </form>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: Orders Monitor Dashboard */}
      <div className="mt-8 rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
        <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShoppingBag className="h-4.5 w-4.5 text-[#F7941D]" /> Realtime Orders Monitor
        </h3>
        
        {orderHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium text-xs">
            No orders placed yet in this session. Complete a checkout flow to view logs here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-2">Order ID</th>
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2">Customer & Pincode</th>
                  <th className="py-3 px-2">Items Bought</th>
                  <th className="py-3 px-2">Payment Method</th>
                  <th className="py-3 px-2">Order Value</th>
                  <th className="py-3 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orderHistory.map((order, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-2 font-bold text-charcoal">{order.orderId}</td>
                    <td className="py-3.5 px-2 text-gray-500">{order.date}</td>
                    <td className="py-3.5 px-2 text-gray-500">
                      <div className="font-semibold text-charcoal">{order.address?.fullName}</div>
                      <div>Pin: {order.address?.pincode} ({order.address?.city})</div>
                    </td>
                    <td className="py-3.5 px-2 text-gray-500 max-w-[200px] truncate">
                      {order.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}
                    </td>
                    <td className="py-3.5 px-2 font-semibold uppercase text-[#F7941D]">{order.paymentMethod}</td>
                    <td className="py-3.5 px-2 font-bold text-charcoal">₹{order.pricing?.finalTotal.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-2 text-right">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold uppercase tracking-wider text-emerald-600">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW SECTION: Exchange Requests Dashboard */}
      <div className="mt-8 rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
        <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4 flex items-center gap-2">
          <RefreshCcw className="h-4.5 w-4.5 text-[#F7941D]" /> Exchange Requests
        </h3>
        
        {exchanges.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium text-xs">
            No exchange requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-2">Request ID</th>
                  <th className="py-3 px-2">Order ID</th>
                  <th className="py-3 px-2">Customer Details</th>
                  <th className="py-3 px-2">Reason</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {exchanges.map((ex, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-2 text-gray-500">{ex.id}</td>
                    <td className="py-3.5 px-2 font-bold text-charcoal">{ex.orderId}</td>
                    <td className="py-3.5 px-2 text-gray-500">
                      <div className="font-semibold text-charcoal">{ex.customerName}</div>
                      <div>{ex.phone}</div>
                    </td>
                    <td className="py-3.5 px-2 text-gray-500 max-w-[200px] truncate">{ex.reason}</td>
                    <td className="py-3.5 px-2">
                      <span className={`rounded px-2 py-0.5 font-bold uppercase tracking-wider ${
                        ex.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                        ex.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right space-x-2">
                      {ex.status === 'pending' && (
                        <>
                          <button onClick={() => handleUpdateExchangeStatus(ex.id, 'approved')} className="text-emerald-600 hover:underline font-bold">Approve</button>
                          <button onClick={() => handleUpdateExchangeStatus(ex.id, 'rejected')} className="text-red-600 hover:underline font-bold">Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW SECTION: Newsletter Subscribers Dashboard */}
      <div className="mt-8 rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-[#F7941D]" /> Newsletter Subscribers
          </h3>
          <button 
            onClick={handleExportSubscribers}
            className="rounded bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-xs font-bold text-charcoal transition-premium"
          >
            Export CSV
          </button>
        </div>
        
        {subscribers.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium text-xs">
            No subscribers yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-2">Email</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Subscribed At</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subscribers.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-2 font-bold text-charcoal">{sub.email}</td>
                    <td className="py-3.5 px-2">
                      <span className={`rounded px-2 py-0.5 font-bold uppercase tracking-wider ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-gray-500">
                      {new Date(sub.subscribedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <button 
                        onClick={() => handleDeleteSubscriber(sub.id)}
                        className="text-red-500 hover:text-red-700 font-bold hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW SECTION: Users Management Dashboard */}
      <div className="mt-8 rounded-premium border border-gray-100 bg-white p-6 shadow-premium">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-[#F7941D]" /> User Accounts Management
            </h3>
            <p className="text-xs text-gray-400 mt-1">Search, enable/disable customer and admin accounts, and audit login sessions.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isDevMode && (
              <button 
                onClick={() => { fetchOtpLogs(); setShowOtpLogsModal(true); }}
                className="rounded-premium bg-orange-50 border border-orange-100 hover:bg-orange-100 px-4 py-2 text-xs font-bold text-[#F7941D] transition-premium flex items-center gap-1.5"
              >
                <Database className="h-3.5 w-3.5" /> View OTP Logs (Dev Only)
              </button>
            )}
            
            <div className="flex h-10 rounded-premium overflow-hidden border border-gray-200 focus-within:border-[#F7941D] max-w-xs w-full shadow-sm bg-white">
              <input 
                type="text" 
                placeholder="Search by phone..." 
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  fetchUsers(e.target.value);
                }}
                className="flex-grow px-3.5 text-xs text-charcoal outline-none bg-transparent"
              />
            </div>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium text-xs">
            No users found matching search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-2">Name</th>
                  <th className="py-3 px-2">Phone Number</th>
                  <th className="py-3 px-2">Email</th>
                  <th className="py-3 px-2">Role</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Created At</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-2 font-bold text-charcoal flex items-center gap-2">
                      <div className="h-7 w-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-black text-charcoal border">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-bold">{user.name || 'N/A'}</div>
                        <div className="text-[10px] text-gray-400 font-medium">ID: {user.id}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 font-semibold text-gray-600">+91 {user.phone || 'N/A'}</td>
                    <td className="py-3.5 px-2 text-gray-500">{user.email || 'N/A'}</td>
                    <td className="py-3.5 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                        user.role === 'seller' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-gray-50 text-gray-600 border border-gray-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className={`rounded px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] ${
                        user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-2 text-right space-x-2.5 font-bold">
                      <button 
                        onClick={() => { setSelectedUserHistory(user); fetchUserLoginHistory(user.id); }}
                        className="text-blue-600 hover:underline"
                      >
                        History
                      </button>
                      <button 
                        onClick={() => handleToggleUserBlock(user.id, user.status)}
                        className={`${user.status === 'active' ? 'text-red-500' : 'text-emerald-500'} hover:underline`}
                      >
                        {user.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Login History Modal */}
      {selectedUserHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col relative">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-charcoal">Login History</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-semibold">Auditing sessions for {selectedUserHistory.name || selectedUserHistory.phone}</p>
              </div>
              <button 
                onClick={() => setSelectedUserHistory(null)}
                className="text-gray-400 hover:text-charcoal bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-grow">
              {loginHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No login history recorded for this user.</div>
              ) : (
                <div className="space-y-3">
                  {loginHistory.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between font-bold text-charcoal">
                        <span>{log.ip || 'Unknown IP'}</span>
                        <span className="text-gray-400 font-normal">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <div>Device: {log.device || 'Unknown Device'}</div>
                      <div>Browser: {log.browser || 'Unknown Browser'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OTP Logs Modal (Development Mode Only) */}
      {showOtpLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col relative">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-charcoal flex items-center gap-1.5">
                  <Database className="h-4.5 w-4.5 text-[#F7941D]" /> OTP Verification Logs
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-semibold">Development database records of requested verification codes.</p>
              </div>
              <button 
                onClick={() => setShowOtpLogsModal(false)}
                className="text-gray-400 hover:text-charcoal bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-grow">
              {otpLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No OTP log history found.</div>
              ) : (
                <div className="overflow-x-auto text-left">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                        <th className="py-2">Mobile Number</th>
                        <th className="py-2">OTP Code</th>
                        <th className="py-2">Verified</th>
                        <th className="py-2">Attempts</th>
                        <th className="py-2">IP & Browser</th>
                        <th className="py-2">Requested At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {otpLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 font-semibold text-gray-600">+91 {log.phone}</td>
                          <td className="py-2.5"><code className="bg-orange-50 text-[#F7941D] px-1.5 py-0.5 rounded font-bold">{log.otp}</code></td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {log.verified ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="py-2.5 font-bold">{log.attempts}/5</td>
                          <td className="py-2.5 text-gray-500">
                            <div>{log.ip}</div>
                            <div className="text-[10px] text-gray-400">{log.browser} ({log.device})</div>
                          </td>
                          <td className="py-2.5 text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
