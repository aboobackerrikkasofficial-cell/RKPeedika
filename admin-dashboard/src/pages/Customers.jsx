import React, { useState, useEffect } from 'react';
import Table from '../components/Table';
import apiClient from '../api/client';
import { Search, UserCheck, ShieldAlert, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customersList, setCustomersList] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/users/admin/users');
      if (res.data && Array.isArray(res.data.data)) {
        setCustomersList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch customers list", err);
      showStatus('error', "Could not retrieve user database list.");
    }
    setIsLoading(false);
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const handleToggleBlock = async (user) => {
    const nextStatus = user.status === 'active' ? 'banned' : 'active';
    const ok = await window.showConfirm(`Change account access status of ${user.name || user.email} to ${nextStatus.toUpperCase()}?`, "Confirm User Status Change");
    if (ok) {
      try {
        const res = await apiClient.put(`/users/admin/users/${user.id}/block`, { status: nextStatus });
        if (res.data.success) {
          showStatus('success', `User account status updated successfully to ${nextStatus}.`);
          fetchCustomers();
        }
      } catch (err) {
        console.error("Failed to toggle block", err);
        showStatus('error', "Failed to update user block status.");
      }
    }
  };

  const handleDelete = async (user) => {
    const ok = await window.showConfirm(`Are you sure you want to permanently delete user ${user.name || user.email}? This action is irreversible and deletes all orders and addresses.`, "Delete User");
    if (ok) {
      try {
        const res = await apiClient.delete(`/users/admin/users/${user.id}`);
        if (res.data.success) {
          showStatus('success', "User account permanently removed.");
          fetchCustomers();
        }
      } catch (err) {
        console.error("Failed to delete user", err);
        showStatus('error', "Failed to delete user profile.");
      }
    }
  };

  // Filtering
  const filteredCustomers = customersList.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "id", label: "User ID", sortable: true, render: (row) => <span className="font-mono text-[10px] text-gray-500">{row.id}</span> },
    { key: "name", label: "Customer Name", sortable: true, render: (row) => <span>{row.name || 'N/A'}</span> },
    { key: "email", label: "Email Address", sortable: true },
    { key: "phone", label: "Phone Number", sortable: false, render: (row) => <span>{row.phone || 'N/A'}</span> },
    { key: "role", label: "Account Role", sortable: true, render: (row) => <span className="capitalize">{row.role}</span> },
    { 
      key: "status", 
      label: "Account Status", 
      sortable: true,
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
          row.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
        }`}>
          {row.status}
        </span>
      )
    },
    {
      key: "actions",
      label: "Control",
      render: (row) => (
        <div className="flex items-center gap-1">
          {/* Prevent banning self */}
          {row.role !== 'admin' && (
            <>
              <button 
                onClick={() => handleToggleBlock(row)}
                className={`rounded-lg p-1.5 hover:bg-gray-50 transition-all ${
                  row.status === 'active' ? 'text-gray-400 hover:text-red-500' : 'text-red-400 hover:text-emerald-500'
                }`}
                title={row.status === 'active' ? "Ban User" : "Activate User"}
              >
                {row.status === 'active' ? <ShieldAlert className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </button>
              <button 
                onClick={() => handleDelete(row)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-all"
                title="Delete User Account"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold text-xs text-gray-400 animate-pulse">
        Fetching customer database...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Customer Database</h2>
        <p className="text-xs font-semibold text-gray-400 mt-1">Audit customer accounts, review historical expenditures, and adjust access permissions.</p>
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
          placeholder="Search by customer name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none placeholder:text-gray-400 text-charcoal font-medium"
        />
      </div>

      {/* Customers table */}
      <Table 
        columns={columns}
        data={filteredCustomers}
        itemsPerPage={10}
        emptyMessage="No customers found in database."
      />

    </div>
  );
}
