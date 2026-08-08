import React, { useState, useEffect } from 'react';
import Table from '../components/Table';
import apiClient from '../api/client';
import { FolderTree, Plus, Search, Trash2, Edit3, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function Categories() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriesList, setCategoriesList] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      if (Array.isArray(res.data)) {
        setCategoriesList(res.data);
      }
    } catch (err) {
      console.error("Failed to load categories", err);
      showStatus('error', "Could not retrieve categories from database.");
    }
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setImage("");
    setEditingCategory(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setImage(category.image || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      window.showAlert("Category name is required.", "Validation Error");
      return;
    }

    const payload = {
      name,
      description,
      image
    };

    try {
      if (editingCategory) {
        const res = await apiClient.put(`/categories/${editingCategory.id}`, payload);
        if (res.data.success) {
          showStatus('success', "Category updated successfully.");
        }
      } else {
        const res = await apiClient.post('/categories', payload);
        if (res.data.success) {
          showStatus('success', "New category created successfully.");
        }
      }
      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      console.error("Failed to save category", err);
      showStatus('error', err.response?.data?.message || "Failed to save category.");
    }
  };

  const handleDelete = async (category) => {
    const ok = await window.showConfirm(`Are you sure you want to permanently delete category ${category.name}? Products mapping to this category will be deleted.`, "Delete Category");
    if (ok) {
      try {
        const res = await apiClient.delete(`/categories/${category.id}`);
        if (res.data.success) {
          showStatus('success', "Category removed successfully.");
          fetchCategories();
        }
      } catch (err) {
        console.error("Failed to delete category", err);
        showStatus('error', "Failed to delete category.");
      }
    }
  };

  // Filtering
  const filteredCategories = categoriesList.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "id", label: "Cat ID", sortable: true, render: (row) => <span className="font-mono text-[10px] text-gray-500">{row.id}</span> },
    { key: "name", label: "Category Name", sortable: true },
    { key: "slug", label: "URL Slug", sortable: false },
    { key: "description", label: "Description", sortable: false },
    { 
      key: "productsCount", 
      label: "Products Count", 
      sortable: true, 
      render: (row) => <strong>{row._count?.products || 0} products</strong> 
    },
    {
      key: "actions",
      label: "Control",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => handleOpenEditModal(row)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-all"
            title="Edit Category"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button 
            onClick={() => handleDelete(row)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-all"
            title="Delete Category"
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
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Categories & Collections</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">Configure department mappings and product classifications.</p>
        </div>
        
        <button 
          onClick={handleOpenAddModal}
          className="w-max flex items-center justify-center gap-1.5 rounded-xl bg-[#F7941D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#E07D10] transition-all shadow-sm"
        >
          <Plus className="h-4.5 w-4.5" /> Add Category
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

      {/* Search Filter */}
      <div className="flex items-center rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs shadow-sm max-w-md">
        <Search className="h-4 w-4 text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Search categories by name or slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none placeholder:text-gray-400 text-charcoal font-medium"
        />
      </div>

      {/* Categories table */}
      <Table 
        columns={columns}
        data={filteredCategories}
        itemsPerPage={10}
        emptyMessage="No categories found in database."
      />

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/30 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-premium p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-extrabold text-charcoal flex items-center gap-2">
                <FolderTree className="h-4.5 w-4.5 text-[#F7941D]" /> {editingCategory ? "Edit Category" : "Add New Category"}
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
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="E.g., Handicrafts"
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tell us about products in this category..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  placeholder="/images/category.jpg"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
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
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
