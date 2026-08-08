import React, { useState, useEffect } from 'react';
import Table from '../components/Table';
import apiClient from '../api/client';
import { Tag, Plus, Search, Trash2, Edit3, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function Coupons() {
  const [searchTerm, setSearchTerm] = useState("");
  const [couponsList, setCouponsList] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  
  // Form states
  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage"); // percentage | flat
  const [value, setValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState("active"); // active | disabled | expired

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await apiClient.get('/coupons');
      if (Array.isArray(res.data)) {
        setCouponsList(res.data);
      }
    } catch (err) {
      console.error("Failed to load coupons", err);
      showStatus('error', "Failed to retrieve coupons from database.");
    }
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const resetForm = () => {
    setCode("");
    setType("percentage");
    setValue("");
    setMinSpend("");
    setMaxDiscount("");
    setExpiresAt("");
    setStatus("active");
    setEditingCoupon(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(coupon.value.toString());
    setMinSpend(coupon.minSpend ? coupon.minSpend.toString() : "");
    setMaxDiscount(coupon.maxDiscount ? coupon.maxDiscount.toString() : "");
    setExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : "");
    setStatus(coupon.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || !type || !value) {
      window.showAlert("Please fill in code, type, and value.", "Validation Error");
      return;
    }

    const payload = {
      code,
      type,
      value: Number(value),
      minSpend: minSpend ? Number(minSpend) : 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      status
    };

    try {
      if (editingCoupon) {
        const res = await apiClient.put(`/coupons/${editingCoupon.id}`, payload);
        if (res.data.success) {
          showStatus('success', "Coupon updated successfully.");
        }
      } else {
        const res = await apiClient.post('/coupons', payload);
        if (res.data.success) {
          showStatus('success', "New coupon created successfully.");
        }
      }
      setIsModalOpen(false);
      resetForm();
      fetchCoupons();
    } catch (err) {
      console.error("Failed to save coupon", err);
      showStatus('error', err.response?.data?.message || "Failed to save coupon to database.");
    }
  };

  const handleDelete = async (coupon) => {
    const ok = await window.showConfirm(`Are you sure you want to permanently delete coupon ${coupon.code}?`, "Delete Coupon");
    if (ok) {
      try {
        const res = await apiClient.delete(`/coupons/${coupon.id}`);
        if (res.data.success) {
          showStatus('success', "Coupon deleted successfully.");
          fetchCoupons();
        }
      } catch (err) {
        console.error("Failed to delete coupon", err);
        showStatus('error', "Could not delete coupon.");
      }
    }
  };

  // Filtering
  const filteredCoupons = couponsList.filter(c => 
    (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { 
      key: "code", 
      label: "Promo Code", 
      sortable: true, 
      render: (row) => <code className="bg-gray-100 px-2 py-0.5 rounded text-charcoal font-bold">{row.code}</code> 
    },
    { 
      key: "type", 
      label: "Discount Type", 
      sortable: true,
      render: (row) => <span className="capitalize">{row.type}</span>
    },
    { 
      key: "value", 
      label: "Value Amount", 
      sortable: true, 
      render: (row) => (
        <span className="font-black text-charcoal">
          {row.type === 'percentage' ? `${row.value}%` : `₹${row.value}`}
        </span>
      ) 
    },
    { 
      key: "minSpend", 
      label: "Min Order Value", 
      sortable: true,
      render: (row) => <span>₹{row.minSpend || 0}</span>
    },
    { 
      key: "status", 
      label: "Campaign Status", 
      sortable: true, 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
          row.status === "active" ? "bg-emerald-50 text-emerald-600" : 
          row.status === "expired" ? "bg-amber-50 text-amber-600" :
          "bg-red-50 text-red-500"
        }`}>
          {row.status}
        </span>
      )
    },
    {
      key: "actions",
      label: "Control",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => handleOpenEditModal(row)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-all"
            title="Edit Coupon"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button 
            onClick={() => handleDelete(row)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-all"
            title="Delete Coupon"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Vouchers & Coupons</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">Configure active customer promotions, discount percentages, and minimum order policies.</p>
        </div>
        
        <button 
          onClick={handleOpenAddModal}
          className="w-max flex items-center justify-center gap-1.5 rounded-xl bg-[#F7941D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#E07D10] transition-all shadow-sm"
        >
          <Plus className="h-4.5 w-4.5" /> Add Coupon
        </button>
      </div>

      {/* Status Msg */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-bold ${
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {statusMsg.text}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs shadow-sm max-w-md">
        <Search className="h-4 w-4 text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Search active promotional codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none placeholder:text-gray-400 text-charcoal font-medium"
        />
      </div>

      {/* Coupons table */}
      <Table 
        columns={columns}
        data={filteredCoupons}
        itemsPerPage={5}
        emptyMessage="No coupons found in database."
      />

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/30 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-premium p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-extrabold text-charcoal flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-[#F7941D]" /> {editingCoupon ? "Edit Coupon" : "Add New Coupon"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Coupon Promo Code</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="E.g., RIKKAS20"
                  required
                  disabled={!!editingCoupon}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Discount Type</label>
                  <select 
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Discount Value</label>
                  <input 
                    type="number" 
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="E.g., 15"
                    required
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Min Order Spend (₹)</label>
                  <input 
                    type="number" 
                    value={minSpend}
                    onChange={e => setMinSpend(e.target.value)}
                    placeholder="E.g., 999"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Expiry Date</label>
                  <input 
                    type="date" 
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Campaign Status</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D]"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-xl bg-[#F7941D] px-6 py-2 text-xs font-bold text-white hover:bg-[#E07D10] transition-all shadow"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
