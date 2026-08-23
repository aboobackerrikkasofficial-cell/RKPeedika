import React, { useState, useEffect } from 'react';
import Table from '../components/Table';
import apiClient from '../api/client';
import { Search, Eye, Filter, CheckCircle, Clock, Truck, ShieldAlert, X, AlertCircle, MapPin } from 'lucide-react';

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Tracking form states
  const [trackingForm, setTrackingForm] = useState({
    courier: "", trackingNumber: "", trackingUrl: "", estimatedDeliveryDate: "", shippedDate: "", internalNotes: "", customerMessage: ""
  });
  const [eventForm, setEventForm] = useState({ status: "processing", message: "", location: "", date: "" });

  const [ordersList, setOrdersList] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set()); // for checkbox selection

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/orders');
      if (Array.isArray(res.data)) {
        setOrdersList(res.data);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
      showStatus('error', "Could not load order history.");
    }
    setIsLoading(false);
  };
  const showStatus = (type, text) => {
    if (window.showAlert) {
      const title = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification';
      window.showAlert(text, title);
    } else {
      setStatusMsg({ type, text });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
    }
  };
  const handleSaveTracking = async () => {
    try {
      const res = await apiClient.put(`/orders/${selectedOrder.id}/tracking`, trackingForm);
      if (res.data.success) {
        showStatus('success', 'Tracking details updated.');
        const updatedOrder = res.data.order;
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
          setTrackingForm({
            courier: updatedOrder.courier || "",
            trackingNumber: updatedOrder.trackingNumber || "",
            trackingUrl: updatedOrder.trackingUrl || "",
            estimatedDeliveryDate: updatedOrder.estimatedDeliveryDate || updatedOrder.estimatedDelivery || "",
            shippedDate: updatedOrder.shippedDate || updatedOrder.shippedAt || "",
            internalNotes: updatedOrder.internalNotes || "",
            customerMessage: updatedOrder.customerStatusMessage || updatedOrder.customerMessage || ""
          });
        }
        fetchOrders();
      }
    } catch(err) {
      showStatus('error', 'Failed to save tracking.');
    }
  };

  const handleSyncTracking = async () => {
    if (!selectedOrder || !selectedOrder.trackingNumber) {
      showStatus('error', 'No tracking number configured.');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await apiClient.post(`/orders/${selectedOrder.id}/tracking/sync`);
      if (res.data.success) {
        showStatus('success', 'Tracking details synchronized.');
        const updatedOrder = res.data.order;
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
          setTrackingForm({
            courier: updatedOrder.courier || "",
            trackingNumber: updatedOrder.trackingNumber || "",
            trackingUrl: updatedOrder.trackingUrl || "",
            estimatedDeliveryDate: updatedOrder.estimatedDeliveryDate || updatedOrder.estimatedDelivery || "",
            shippedDate: updatedOrder.shippedDate || updatedOrder.shippedAt || "",
            internalNotes: updatedOrder.internalNotes || "",
            customerMessage: updatedOrder.customerStatusMessage || updatedOrder.customerMessage || ""
          });
        }
        fetchOrders();
      }
    } catch(err) {
      showStatus('error', err.response?.data?.message || 'Failed to sync tracking.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddTrackingEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post(`/orders/${selectedOrder.id}/tracking-events`, eventForm);
      if (res.data.success) {
        showStatus('success', 'Event added successfully.');
        setSelectedOrder(res.data.order || { ...selectedOrder, trackingEvents: [...(selectedOrder.trackingEvents||[]), eventForm] });
        fetchOrders();
        setEventForm({ status: "processing", message: "", location: "", date: new Date().toISOString().split('T')[0] });
      }
    } catch(err) {
      showStatus('error', 'Failed to add tracking event.');
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        showStatus('success', `Order status updated to ${newStatus}.`);
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to update status", err);
      showStatus('error', "Failed to update order status.");
    }
  };

  // Optimistic instant delete — removes from UI immediately, API in background
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order? This cannot be undone.")) return;
    // Remove instantly from UI
    setOrdersList(prev => prev.filter(o => o.id !== orderId));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    if (selectedOrder?.id === orderId) setSelectedOrder(null);
    // Fire API in background silently
    apiClient.delete(`/orders/${orderId}`).catch(err => {
      console.error("Delete failed", err);
      showStatus('error', 'Delete failed — please refresh.');
      fetchOrders(); // revert on failure
    });
  };

  // Optimistic bulk delete — removes all ticked orders from UI instantly
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected order(s)? This cannot be undone.`)) return;
    const idsToDelete = [...selectedIds];
    // Remove all ticked instantly from UI
    setOrdersList(prev => prev.filter(o => !selectedIds.has(o.id)));
    setSelectedIds(new Set());
    if (selectedOrder && idsToDelete.includes(selectedOrder.id)) setSelectedOrder(null);
    // Fire all deletes in parallel in background
    Promise.all(idsToDelete.map(id => apiClient.delete(`/orders/${id}`))).catch(err => {
      console.error("Bulk delete failed", err);
      showStatus('error', 'Some deletes failed — please refresh.');
      fetchOrders();
    });
  };

  const handleClearAllOrders = async () => {
    if (!window.confirm("Are you sure you want to CLEAR ALL orders? This action cannot be undone and will delete all order history.")) return;
    // Optimistic: clear UI instantly
    setOrdersList([]);
    setSelectedIds(new Set());
    setSelectedOrder(null);
    apiClient.delete('/orders/clear-all').catch(err => {
      console.error("Failed to clear all orders", err);
      showStatus('error', err.response?.data?.message || "Failed to clear all orders.");
      fetchOrders();
    });
  };

  // Checkbox helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  // Filtering logic
  const filteredOrders = ordersList.filter(ord => {
    const customerName = ord.user?.name || 'Guest';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ord.orderId || ord.id).toLowerCase().includes(searchTerm.toLowerCase());
    
    // Normalize status filters
    const statusLower = (ord.status || '').toLowerCase();
    const matchesStatus = statusFilter === "All" || 
                          (statusFilter === "Pending" && statusLower === "pending") ||
                          (statusFilter === "Processing" && statusLower === "processing") ||
                          (statusFilter === "In Transit" && (statusLower === "shipped" || statusLower === "in transit")) ||
                          (statusFilter === "Delivered" && statusLower === "delivered");
    return matchesSearch && matchesStatus;
  });

  const isAllSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.id));
  const isIndeterminate = filteredOrders.some(o => selectedIds.has(o.id)) && !isAllSelected;

  const columns = [
    {
      key: "checkbox",
      label: (
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={el => { if (el) el.indeterminate = isIndeterminate; }}
          onChange={toggleSelectAll}
          className="w-4 h-4 accent-[#F7941D] cursor-pointer"
          title={isAllSelected ? "Deselect All" : "Select All"}
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelectOne(row.id)}
          onClick={e => e.stopPropagation()}
          className="w-4 h-4 accent-[#F7941D] cursor-pointer"
        />
      )
    },
    { key: "id", label: "Order ID", sortable: true, render: (row) => <span className="font-mono text-gray-700">{row.orderId || row.id}</span> },
    { key: "customer", label: "Customer Name", sortable: true, render: (row) => <span>{row.user?.name || 'Guest'}</span> },
    { key: "date", label: "Date", sortable: true, render: (row) => <span>{new Date(row.createdAt).toLocaleDateString()}</span> },
    { key: "amount", label: "Total Value", sortable: true, render: (row) => <span className="font-black text-charcoal">₹{row.amount}</span> },
    { key: "payment", label: "Payment", sortable: false, render: (row) => <span className="uppercase">{row.paymentMethod}</span> },
    { 
      key: "status", 
      label: "Status", 
      sortable: true,
      render: (row) => {
        const statusLower = (row.status || '').toLowerCase();
        const styles = {
          "delivered": "bg-emerald-50 text-emerald-600",
          "shipped": "bg-orange-50 text-orange-600",
          "in transit": "bg-orange-50 text-orange-600",
          "processing": "bg-blue-50 text-blue-600",
          "pending": "bg-amber-50 text-amber-500",
          "returned": "bg-purple-50 text-purple-600",
          "cancelled": "bg-red-50 text-red-500"
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide ${styles[statusLower] || "bg-gray-100"}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center space-x-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOrder(row);
              setTrackingForm({
                courier: row.courier || "",
                trackingNumber: row.trackingNumber || "",
                trackingUrl: row.trackingUrl || "",
                estimatedDeliveryDate: row.estimatedDeliveryDate || "",
                shippedDate: row.shippedDate || "",
                internalNotes: row.internalNotes || "",
                customerMessage: row.customerMessage || ""
              });
              setEventForm({ status: "processing", message: "", location: "", date: new Date().toISOString().split('T')[0] });
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-[#F7941D] transition-all"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteOrder(row.id);
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
            title="Delete Order"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold text-xs text-gray-400 animate-pulse">
        Fetching order logs...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order Management</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">Review customer receipts, billing addresses, and transit status updates.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="rounded-xl bg-red-500 text-white px-4 py-2 text-xs font-bold hover:bg-red-600 transition-all flex items-center gap-2 shadow-sm"
            >
              <X className="h-4 w-4" /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={handleClearAllOrders}
            className="rounded-xl bg-red-50 text-red-600 px-4 py-2 text-xs font-bold border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2"
          >
            <X className="h-4 w-4" /> Clear All
          </button>
        </div>
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

      {/* Filter and Search Action Row */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 border border-gray-100 rounded-xl shadow-sm">
        
        {/* Search */}
        <div className="relative flex items-center rounded-xl border border-gray-200 px-3 py-2 text-xs flex-1 max-w-md">
          <Search className="h-4 w-4 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-gray-400 text-charcoal font-medium"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <Filter className="h-4 w-4 text-gray-400 mr-1 hidden sm:block" />
          {["All", "Pending", "Processing", "In Transit", "Delivered"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === status 
                  ? 'bg-orange-50 border-orange-200 text-[#F7941D]' 
                  : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

      </div>

      {/* Orders Table */}
      <Table 
        columns={columns}
        data={filteredOrders}
        itemsPerPage={10}
        emptyMessage="No orders match your filter criteria."
      />

      {/* ORDER DETAILS MODAL POPUP */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/30 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-premium p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-extrabold text-charcoal flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#F7941D]" /> Details for {selectedOrder.orderId || selectedOrder.id}
              </h3>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scroll area */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 text-xs font-semibold text-gray-500">
              
              {/* Status Section */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Transit Status</p>
                  <p className="text-sm font-black text-charcoal mt-0.5 capitalize">{selectedOrder.status}</p>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Modify Status</label>
                  <select 
                    value={selectedOrder.status}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D]"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Customer logs */}
              <div className="space-y-2 pb-3 border-b border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer Details</h4>
                <div className="grid grid-cols-2 gap-2 text-charcoal">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block">Name</span>
                    {selectedOrder.user?.name || 'Guest'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block">Contact</span>
                    {selectedOrder.user?.phone || 'N/A'}
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 block">Email Address</span>
                    {selectedOrder.user?.email || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-2 pb-3 border-b border-gray-100 bg-orange-50/20 p-3 rounded-xl border border-orange-100/50">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Information</h4>
                <div className="grid grid-cols-2 gap-2.5 text-charcoal">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block">Method</span>
                    <span className="uppercase font-bold">
                      {selectedOrder.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 
                       selectedOrder.paymentMethod === 'razorpay' ? 'Razorpay Online' : selectedOrder.paymentMethod}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block">Status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedOrder.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                      selectedOrder.paymentStatus === 'failed' ? 'bg-red-50 text-red-500' :
                      'bg-amber-50 text-amber-500'
                    }`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                  {selectedOrder.paymentMethod === 'razorpay' && (
                    <>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block">Razorpay Order ID</span>
                        <span className="font-mono text-[10px] select-all">{selectedOrder.razorpayOrderId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block">Razorpay Payment ID</span>
                        <span className="font-mono text-[10px] select-all">{selectedOrder.razorpayPaymentId || 'N/A'}</span>
                      </div>
                      {selectedOrder.paidAt && (
                        <div className="col-span-2">
                          <span className="text-[10px] font-bold text-gray-400 block">Payment Verified Date</span>
                          <span>{new Date(selectedOrder.paidAt).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedOrder.paymentFailureReason && (
                        <div className="col-span-2 text-red-600">
                          <span className="text-[10px] font-bold text-red-400 block">Failure Reason</span>
                          <span>{selectedOrder.paymentFailureReason}</span>
                        </div>
                      )}
                    </>
                  )}
                  {selectedOrder.paymentMethod === 'cod' && (
                    <div className="col-span-2 text-gray-400 text-[10px]">
                      COD payments are pending until shipment delivery.
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="space-y-2 pb-3 border-b border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shipping Destination Details</h4>
                <div className="text-charcoal flex flex-col gap-1 text-xs">
                  <p className="font-semibold">{selectedOrder.shippingName || selectedOrder.user?.name || 'Name not provided'}</p>
                  <p>{selectedOrder.shippingPhone || selectedOrder.user?.phone || 'Phone not provided'}</p>
                  <p className="leading-relaxed">
                    {selectedOrder.shippingStreet && <>{selectedOrder.shippingStreet}<br /></>}
                    {selectedOrder.shippingCity && <>{selectedOrder.shippingCity}, </>}
                    {selectedOrder.shippingState && <>{selectedOrder.shippingState} </>}
                    <span className="font-semibold">{selectedOrder.pincode || selectedOrder.shippingPincode}</span>
                  </p>
                </div>
              </div>

              {/* Shipping & Tracking Module */}
              <div className="space-y-4 pb-4 border-b border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#F7941D]" /> Shipping & Tracking
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Courier</label>
                    <input type="text" value={trackingForm.courier} onChange={e => setTrackingForm({...trackingForm, courier: e.target.value})} className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#F7941D]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tracking Number</label>
                    <input type="text" value={trackingForm.trackingNumber} onChange={e => setTrackingForm({...trackingForm, trackingNumber: e.target.value})} className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#F7941D]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tracking URL</label>
                    <input type="url" value={trackingForm.trackingUrl} onChange={e => setTrackingForm({...trackingForm, trackingUrl: e.target.value})} className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#F7941D]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Shipped Date</label>
                    <input type="date" value={trackingForm.shippedDate ? trackingForm.shippedDate.split('T')[0] : ''} onChange={e => setTrackingForm({...trackingForm, shippedDate: e.target.value})} className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#F7941D]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Est. Delivery</label>
                    <input type="date" value={trackingForm.estimatedDeliveryDate ? trackingForm.estimatedDeliveryDate.split('T')[0] : ''} onChange={e => setTrackingForm({...trackingForm, estimatedDeliveryDate: e.target.value})} className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#F7941D]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Internal Notes</label>
                    <input type="text" value={trackingForm.internalNotes} onChange={e => setTrackingForm({...trackingForm, internalNotes: e.target.value})} className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#F7941D]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Customer Message</label>
                    <input type="text" value={trackingForm.customerMessage} onChange={e => setTrackingForm({...trackingForm, customerMessage: e.target.value})} className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#F7941D]" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <button onClick={handleSaveTracking} className="flex-1 bg-[#F7941D] text-white py-1.5 rounded text-xs font-bold shadow hover:bg-[#E07D10]">Save Tracking Info</button>
                    {(selectedOrder?.trackingNumber || trackingForm.trackingNumber) && (
                      <button 
                        onClick={handleSyncTracking} 
                        disabled={isSyncing}
                        className="px-3 bg-charcoal text-white py-1.5 rounded text-xs font-bold shadow hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSyncing ? 'Syncing...' : 'Sync Courier'}
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 font-medium leading-tight">
                    Tip: Pasting a tracking URL (e.g., from SF Express or 17track) into either field will automatically parse the tracking ID and auto-detect the courier.
                  </p>
                </div>
              </div>

              {/* Add Tracking Event Form */}
              <div className="space-y-3 pb-4 border-b border-gray-100 bg-gray-50/50 p-3 rounded-xl border">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Log Tracking Event</h4>
                <form onSubmit={handleAddTrackingEvent} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select required value={eventForm.status} onChange={e => setEventForm({...eventForm, status: e.target.value})} className="rounded border border-gray-200 px-2 py-1 text-xs outline-none">
                      <option value="pending">Pending</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                    </select>
                    <input type="date" required value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="rounded border border-gray-200 px-2 py-1 text-xs outline-none" />
                  </div>
                  <input type="text" required placeholder="Event Message (e.g. Arrived at facility)" value={eventForm.message} onChange={e => setEventForm({...eventForm, message: e.target.value})} className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none" />
                  <button type="submit" className="w-full bg-charcoal text-white py-1.5 rounded text-xs font-bold hover:bg-black">Add Event & Update Order Status</button>
                </form>
                {selectedOrder.trackingEvents && selectedOrder.trackingEvents.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                    {selectedOrder.trackingEvents.map((evt, idx) => (
                      <div key={idx} className="flex justify-between border-b border-gray-100 pb-1 text-[10px]">
                        <span className="font-bold text-charcoal">{evt.status.toUpperCase()}: {evt.message}</span>
                        <span className="text-gray-400">{new Date(evt.date || evt.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2 pb-3 border-b border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items Ordered</h4>
                <div className="space-y-1">
                  {selectedOrder.orderItems?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-charcoal text-xs font-semibold py-1">
                      <span>{item.product?.name || "Product"} (x{item.quantity})</span>
                      <span className="font-bold text-charcoal">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial logs */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice Calculations</h4>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span>Gross Order Value</span>
                  <span className="text-charcoal font-black">₹{selectedOrder.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Gateway Provider</span>
                  <span className="text-charcoal uppercase font-bold">{selectedOrder.paymentMethod}</span>
                </div>
              </div>

            </div>

            {/* Modal action footer */}
            <div className="pt-5 border-t border-gray-100 mt-5 flex gap-2 justify-between">
              <button 
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="rounded-xl bg-red-50 text-red-600 px-5 py-2.5 text-xs font-bold border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2"
              >
                <X className="h-4 w-4" /> Delete Order
              </button>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-charcoal px-5 py-2.5 text-xs font-bold text-white hover:bg-black transition-all"
              >
                Close Logs
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
