import React, { useState, useEffect } from 'react';
import Table from '../components/Table';
import { Warehouse, RefreshCcw, Search, PlusCircle, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryList, setInventoryList] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const res = await apiClient.get('/products');
      if (res.data && Array.isArray(res.data)) {
        setInventoryList(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory products list", err);
      showStatus('error', "Could not retrieve warehouse inventory database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  // Quick refill trigger
  const handleRefill = async (productId, productName) => {
    try {
      const res = await apiClient.post('/admin/restock', {
        productId,
        quantity: 10,
        reason: "Manual warehouse replenishment"
      });
      if (res.data && res.data.success) {
        showStatus('success', `Successfully restocked +10 units of "${productName}".`);
        fetchInventory();
      }
    } catch (err) {
      console.error("Restock failed", err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || "Failed to restock product.";
      showStatus('error', errMsg);
    }
  };

  // Filtering
  const filteredInventory = inventoryList.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "sku", label: "SKU / UUID", sortable: true, render: (row) => <span className="font-mono text-[10px] text-gray-500">{row.id.substring(0, 8).toUpperCase()}</span> },
    { key: "name", label: "Product Title", sortable: true },
    { 
      key: "stock", 
      label: "Units Available", 
      sortable: true,
      render: (row) => (
        <span className={`font-bold ${row.stock <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
          {row.stock} units {row.stock <= 5 && '⚠️ (Critical)'}
        </span>
      )
    },
    { key: "seller", label: "Supplier / Vendor", sortable: false, render: (row) => <span>{row.seller || 'N/A'}</span> },
    { key: "lastRestocked", label: "Last Updated", sortable: true, render: (row) => <span>{new Date(row.updatedAt).toISOString().split('T')[0]}</span> },
    {
      key: "actions",
      label: "Refill Qty",
      render: (row) => (
        <button 
          onClick={() => handleRefill(row.id, row.name)}
          className="rounded-lg px-2.5 py-1 bg-orange-50 border border-orange-200 text-[#F7941D] hover:bg-orange-100/50 text-[10px] font-bold flex items-center gap-1 transition-all"
        >
          <PlusCircle className="h-3.5 w-3.5" /> +10 Units
        </button>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold text-xs text-gray-400 animate-pulse">
        Checking inventory shelves...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Warehouse & Inventory</h2>
        <p className="text-xs font-semibold text-gray-400 mt-1">Check layout shelf mappings, restock stock levels, and review last replenishment dates.</p>
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

      {/* Filter Action Row */}
      <div className="flex items-center rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs shadow-sm max-w-md">
        <Search className="h-4 w-4 text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Search inventory by title or SKU code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none placeholder:text-gray-400 text-charcoal font-medium"
        />
      </div>

      {/* Table */}
      <Table 
        columns={columns}
        data={filteredInventory}
        itemsPerPage={10}
        emptyMessage="No products registered in warehouse yet. Please add products first."
      />

    </div>
  );
}
