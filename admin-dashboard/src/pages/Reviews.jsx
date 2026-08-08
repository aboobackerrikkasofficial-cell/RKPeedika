import React, { useState, useEffect } from 'react';
import Table from '../components/Table';
import apiClient from '../api/client';
import { 
  Star, 
  Trash2, 
  CheckSquare, 
  XSquare, 
  EyeOff, 
  MessageSquare, 
  CornerDownRight, 
  Search, 
  AlertCircle, 
  CheckCircle,
  Pencil,
  X,
  RefreshCw
} from 'lucide-react';

export default function Reviews() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewsList, setReviewsList] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('all'); // all | pending | approved | rejected | hidden
  
  // Reply Modal States
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyingReviewId, setReplyingReviewId] = useState(null);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await apiClient.get('/admin/reviews');
      if (res.data && Array.isArray(res.data.data)) {
        setReviewsList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load reviews", err);
      showStatus('error', "Failed to load reviews list. Check admin session auth.");
    }
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await apiClient.put(`/reviews/${id}/moderation`, { status });
      if (res.data.success) {
        showStatus('success', `Review status updated to ${status}`);
        fetchReviews();
      }
    } catch (err) {
      console.error("Failed to update review status", err);
      showStatus('error', "Could not update review moderation status.");
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const res = await apiClient.put(`/admin/reviews/${replyingReviewId}/reply`, { reply: replyText });
      if (res.data.success) {
        showStatus('success', "Reply posted successfully.");
        setIsReplyModalOpen(false);
        setReplyText("");
        fetchReviews();
      }
    } catch (err) {
      console.error("Reply failed", err);
      showStatus('error', "Failed to save admin reply.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingReview) return;

    try {
      const res = await apiClient.put(`/reviews/${editingReview.id}/moderation`, {
        rating: editingReview.rating,
        comment: editingReview.comment,
        customerName: editingReview.customerName,
        title: editingReview.title,
        purchaseMonth: editingReview.purchaseMonth,
        status: editingReview.status
      });
      if (res.data.success) {
        showStatus('success', "Review updated successfully.");
        setIsEditModalOpen(false);
        setEditingReview(null);
        fetchReviews();
      }
    } catch (err) {
      console.error("Edit failed", err);
      showStatus('error', "Failed to update review details.");
    }
  };

  const handleDelete = async (id) => {
    const ok = await window.showConfirm("Delete this review permanently?", "Delete Review");
    if (ok) {
      try {
        await apiClient.delete(`/reviews/${id}`);
        showStatus('success', "Review listing removed.");
        fetchReviews();
      } catch (err) {
        console.error("Delete review failed", err);
        showStatus('error', "Failed to delete review listing.");
      }
    }
  };

  const handleUpdateImageStatus = async (imgId, status) => {
    try {
      const res = await apiClient.put(`/admin/reviews/images/${imgId}/status`, { status });
      if (res.data.success || res.data.status === 'success') {
        showStatus('success', `Image status updated to ${status}`);
        fetchReviews();
      }
    } catch (err) {
      console.error("Failed to update image status", err);
      showStatus('error', "Could not update image moderation status.");
    }
  };

  const handleDeleteImage = async (imgId) => {
    const ok = await window.showConfirm("Delete this image permanently?", "Delete Review Image");
    if (ok) {
      try {
        await apiClient.delete(`/admin/reviews/images/${imgId}`);
        showStatus('success', "Image removed.");
        fetchReviews();
      } catch (err) {
        console.error("Delete image failed", err);
        showStatus('error', "Failed to delete image.");
      }
    }
  };

  const handleReplaceImage = async (imgId, file) => {
    if (!file) return;
    showStatus('success', "Image replacement uploaded (Simulated)");
    // Real implementation would upload the file and update the database
  };

  // Filtering based on tab & search term
  const filteredReviews = reviewsList.filter(rev => {
    const matchesTab = activeTab === 'all' || rev.status === activeTab;
    const matchesSearch = 
      (rev.customerName || rev.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (rev.product?.name || rev.product || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rev.comment || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const columns = [
    { 
      key: "product", 
      label: "Product Name", 
      sortable: true,
      render: (row) => <span>{row.product?.name || row.product || 'General'}</span>
    },
    { 
      key: "customerName", 
      label: "Customer Name", 
      sortable: true,
      render: (row) => <span>{row.customerName || row.user?.name || 'Anonymous'}</span>
    },
    { 
      key: "orderId", 
      label: "Order ID", 
      sortable: true,
      render: (row) => <span className="font-mono text-[10px] text-gray-500">{row.orderId || "MOCK-ORDER"}</span>
    },
    { 
      key: "rating", 
      label: "Score", 
      sortable: true,
      render: (row) => (
        <div className="flex items-center text-amber-400 gap-0.5">
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="font-bold text-charcoal">{row.rating}</span>
        </div>
      )
    },
    { 
      key: "comment", 
      label: "Customer Comment", 
      sortable: false, 
      render: (row) => {
        let parsedImages = [];
        try {
          parsedImages = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []);
        } catch (e) {
          parsedImages = [];
        }
        return (
          <div className="flex flex-col gap-1 max-w-sm">
            {row.title && <span className="font-bold text-charcoal text-xs">"{row.title}"</span>}
            <span className="italic text-gray-600 text-xs">"{row.comment}"</span>
            {row.purchaseMonth && (
              <span className="text-[10px] text-gray-400 font-semibold">Purchased in {row.purchaseMonth}</span>
            )}
            
            {/* Show attached review images with Moderation options */}
            {parsedImages.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {parsedImages.map((imgObj, index) => {
                  const url = imgObj.imageUrl || imgObj;
                  const imgId = imgObj.id;
                  const status = imgObj.status || 'active';
                  return (
                    <div key={index} className="relative group w-14 h-14 rounded border border-gray-200 overflow-hidden bg-gray-50 flex flex-col">
                      <a href={url} target="_blank" rel="noreferrer" className="w-full h-full block relative">
                        <img src={url} alt="review attachment" className={`w-full h-full object-cover transition-all ${status === 'rejected' ? 'opacity-30 grayscale' : ''}`} />
                      </a>
                      
                      {imgId && (
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-wrap items-center justify-center gap-1.5 transition-all">
                           {status !== 'approved' && (
                             <button onClick={() => handleUpdateImageStatus(imgId, 'approved')} className="text-emerald-400 hover:text-emerald-300 p-0.5" title="Approve Image">
                               <CheckSquare className="w-3.5 h-3.5" />
                             </button>
                           )}
                           {status !== 'rejected' && (
                             <button onClick={() => handleUpdateImageStatus(imgId, 'rejected')} className="text-red-400 hover:text-red-300 p-0.5" title="Reject Image">
                               <XSquare className="w-3.5 h-3.5" />
                             </button>
                           )}
                           <button onClick={() => handleDeleteImage(imgId)} className="text-gray-300 hover:text-white p-0.5" title="Delete Image">
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                           <label className="text-blue-400 hover:text-blue-300 p-0.5 cursor-pointer" title="Replace Image">
                             <input type="file" className="hidden" accept="image/*" onChange={(e) => handleReplaceImage(imgId, e.target.files[0])} />
                             <RefreshCw className="w-3.5 h-3.5" />
                           </label>
                        </div>
                      )}
                      {status && status !== 'active' && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center font-bold uppercase py-0.5">
                          {status}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {row.reply && (
              <div className="text-[10px] bg-orange-50/50 border-l border-[#F7941D] pl-2 py-0.5 mt-1 text-gray-500 flex items-center gap-1">
                <CornerDownRight className="h-3 w-3 shrink-0" />
                <span>Seller: "{row.reply}"</span>
              </div>
            )}
          </div>
        );
      } 
    },
    { 
      key: "createdAt", 
      label: "Review Date", 
      sortable: true,
      render: (row) => <span>{new Date(row.createdAt).toLocaleDateString('en-IN')}</span>
    },
    { 
      key: "status", 
      label: "Status", 
      sortable: true,
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
          row.status === "approved" ? "bg-emerald-50 text-emerald-600" :
          row.status === "rejected" ? "bg-red-50 text-red-500" :
          row.status === "hidden" ? "bg-gray-100 text-gray-500" :
          "bg-amber-50 text-amber-500"
        }`}>
          {row.status}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status !== "approved" && (
            <button 
              onClick={() => handleUpdateStatus(row.id, 'approved')}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-emerald-600 transition-all"
              title="Approve Review"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
          )}
          {row.status !== "rejected" && (
            <button 
              onClick={() => handleUpdateStatus(row.id, 'rejected')}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-all"
              title="Reject Review"
            >
              <XSquare className="h-4 w-4" />
            </button>
          )}
          {row.status !== "hidden" && (
            <button 
              onClick={() => handleUpdateStatus(row.id, 'hidden')}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-500 transition-all"
              title="Hide Review"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          )}
          <button 
            onClick={() => {
              setEditingReview(row);
              setIsEditModalOpen(true);
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-all"
            title="Edit Review"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button 
            onClick={() => {
              setReplyingReviewId(row.id);
              setReplyText(row.reply || "");
              setIsReplyModalOpen(true);
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-orange-500 transition-all"
            title="Reply to Review"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.id)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-all"
            title="Delete Review"
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
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Reviews Moderation</h2>
        <p className="text-xs font-semibold text-gray-400 mt-1">Audit customer comments, verify ratings and purchase details, and manage approvals.</p>
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

      {/* Tab Selectors & Search row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        
        {/* Tab triggers */}
        <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-bold text-gray-500">
          {[
            { id: 'all', label: 'All Reviews' },
            { id: 'pending', label: 'Pending ⚠️' },
            { id: 'approved', label: 'Approved ✔' },
            { id: 'rejected', label: 'Rejected ✖' },
            { id: 'hidden', label: 'Hidden 👁️‍🗨️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-charcoal shadow-sm' 
                  : 'hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-sm w-full sm:max-w-xs">
          <Search className="h-4 w-4 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search by product, customer, or comment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-gray-400 text-charcoal font-medium"
          />
        </div>

      </div>

      {/* Table */}
      <Table 
        columns={columns}
        data={filteredReviews}
        itemsPerPage={10}
        emptyMessage={`No reviews found matching ${activeTab} filters.`}
      />

      {/* EDIT MODAL POPUP */}
      {isEditModalOpen && editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/30 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-premium p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-extrabold text-charcoal flex items-center gap-2">
                ✏ Edit Review Details
              </h3>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingReview(null); }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Customer Name</label>
                <input 
                  type="text" 
                  value={editingReview.customerName || ""}
                  onChange={e => setEditingReview({ ...editingReview, customerName: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rating (1-5)</label>
                  <select 
                    value={editingReview.rating || 5}
                    onChange={e => setEditingReview({ ...editingReview, rating: Number(e.target.value) })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D]"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Purchase Month</label>
                  <input 
                    type="text" 
                    placeholder="July 2026"
                    value={editingReview.purchaseMonth || ""}
                    onChange={e => setEditingReview({ ...editingReview, purchaseMonth: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Review Title</label>
                <input 
                  type="text" 
                  value={editingReview.title || ""}
                  onChange={e => setEditingReview({ ...editingReview, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Review Comment</label>
                <textarea 
                  value={editingReview.comment || ""}
                  onChange={e => setEditingReview({ ...editingReview, comment: e.target.value })}
                  rows={3}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Moderation Status</label>
                <select 
                  value={editingReview.status || "pending"}
                  onChange={e => setEditingReview({ ...editingReview, status: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D]"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingReview(null); }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-xl bg-[#F7941D] px-6 py-2 text-xs font-bold text-white hover:bg-[#E07D10] transition-all shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPLY MODAL POPUP */}
      {isReplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/30 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-premium p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-extrabold text-charcoal flex items-center gap-2">
                ✍ Reply to Review comment
              </h3>
              <button 
                onClick={() => { setIsReplyModalOpen(false); setReplyingReviewId(null); setReplyText(""); }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReplySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Write your Reply</label>
                <textarea 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={4}
                  required
                  placeholder="Thank you for sharing your feedback with us! We have noted down your thoughts..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => { setIsReplyModalOpen(false); setReplyingReviewId(null); setReplyText(""); }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-xl bg-[#F7941D] px-6 py-2 text-xs font-bold text-white hover:bg-[#E07D10] transition-all shadow"
                >
                  Submit Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
