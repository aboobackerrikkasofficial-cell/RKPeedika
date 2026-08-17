import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  ToggleLeft,
  ToggleRight,
  Package,
  Star,
} from 'lucide-react';

import apiClient from '../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert backend image path/URL to a browser-usable URL.
 */
function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'object') {
    image = image.url || image.path || '';
  }
  const value = String(image).trim();
  if (!value) return '';
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }
  const backendUrl = (
    import.meta.env.VITE_API_URL || 'https://rkpeedika.onrender.com/api'
  ).replace(/\/api\/?$/, '');
  return `${backendUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

/**
 * Safely parse JSON with a fallback.
 */
function safeJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ─── Empty Form ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  tagline: '',
  categoryId: '',
  description: '',
  highlights: '',
  specifications: '{}',
  price: '',          // MRP / base price
  codPrice: '',       // Regular / COD price
  onlinePrice: '',    // Prepaid / online price
  rating: '',
  reviewCount: '',
  averageRating: '',
  active: true,
  codAvailable: true,
  prepaidAvailable: true,
  returnAvailable: true,
  returnWindow: 3,
  returnPolicy: '',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [status, setStatus] = useState({ type: '', message: '' });
  const [images, setImages] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  // New review states
  const [productReviews, setProductReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [uploadingReviewImages, setUploadingReviewImages] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    customerName: '',
    rating: 5,
    comment: '',
    verifiedPurchase: true,
    createdAt: new Date().toISOString().split('T')[0],
    images: []
  });

  // ── Data Loading ─────────────────────────────────────────────────────────────

  const showStatus = useCallback((type, message) => {
    if (window.showAlert) {
      const title = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification';
      window.showAlert(message, title);
    } else {
      setStatus({ type, message });
      window.setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      // Use admin endpoint to see ALL products (active + inactive)
      const response = await apiClient.get('/admin/products');
      const data = response.data;
      let list = [];
      if (Array.isArray(data?.products)) list = data.products;
      else if (Array.isArray(data)) list = data;
      setProducts(list);
    } catch (error) {
      console.error('loadProducts error:', error);
      showStatus(
        'error',
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to load products.'
      );
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/categories');
      const data = response.data;
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.categories)) list = data.categories;
      else if (Array.isArray(data?.data)) list = data.data;
      setCategories(list.filter((c) => c?.id && c?.name));
    } catch (error) {
      console.error('loadCategories error:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  // ── Filtering ─────────────────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchSearch =
        !query ||
        String(p.name || '').toLowerCase().includes(query) ||
        String(p.category?.name || p.category || '').toLowerCase().includes(query);

      const isActive = p.status === 'active' || p.active === true;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchSearch && matchStatus;
    });
  }, [products, search, statusFilter]);

  // ── Toggle Activate/Deactivate ────────────────────────────────────────────────

  async function toggleStatus(product) {
    const isCurrentlyActive = product.status === 'active' || product.active === true;
    const willBeActive = !isCurrentlyActive;
    setTogglingId(product.id);
    try {
      await apiClient.patch(`/admin/products/${product.id}/status`, { active: willBeActive });
      showStatus(
        'success',
        `Product ${willBeActive ? 'activated' : 'deactivated'} successfully.`
      );
      await loadProducts();
    } catch (error) {
      console.error('toggleStatus error:', error);
      showStatus(
        'error',
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update product status.'
      );
    } finally {
      setTogglingId(null);
    }
  }

  // ── Modal Open/Close ──────────────────────────────────────────────────────────

  const fetchReviewsForProduct = useCallback(async (productId) => {
    try {
      setLoadingReviews(true);
      const response = await apiClient.get(`/admin/reviews?productId=${productId}`);
      if (response.data && Array.isArray(response.data.data)) {
        setProductReviews(response.data.data);
      } else {
        setProductReviews([]);
      }
    } catch (error) {
      console.error("Failed to fetch product reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id ? String(categories[0].id) : '',
    });
    setImages([]);
    setProductReviews([]);
  }

  function openAddModal() {
    setEditingProduct(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    const productImages = safeJson(product.images, []);
    const highlights = safeJson(product.highlights, []);
    const specifications = safeJson(product.specifications, {});
    const isActive = product.status === 'active' || product.active === true;

    setForm({
      name: product.name || '',
      tagline: product.tagline || '',
      categoryId: product.categoryId ? String(product.categoryId) : (categories[0]?.id ? String(categories[0].id) : ''),
      description: product.description || '',
      highlights: Array.isArray(highlights) ? highlights.join('\n') : '',
      specifications: JSON.stringify(specifications || {}, null, 2),
      price: product.price ?? '',
      codPrice: product.codPrice ?? '',
      onlinePrice: product.onlinePrice ?? '',
      rating: product.rating ?? '',
      reviewCount: product.reviewCount ?? '',
      averageRating: product.averageRating ?? '',
      active: isActive,
      codAvailable: product.codAvailable !== false,
      prepaidAvailable: product.prepaidAvailable !== false,
      returnAvailable: product.returnAvailable !== false,
      returnWindow: product.returnWindow ?? 3,
      returnPolicy: product.returnPolicy ?? '',
    });

    setImages(
      Array.isArray(productImages)
        ? productImages.map((img) => ({
            url: getImageUrl(img),
            storedUrl: typeof img === 'object' ? img.url : img,
            preview: getImageUrl(img),
          }))
        : []
    );
    fetchReviewsForProduct(product.id);
    setModalOpen(true);
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ── Image Upload ──────────────────────────────────────────────────────────────

  function compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress as JPEG at 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 8) {
      showStatus('error', 'Maximum 8 images per product.');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showStatus('error', `${file.name} is not a valid image.`);
        return;
      }
    }

    try {
      setUploading(true);
      const newImages = await Promise.all(
        files.map(async (file) => {
          const base64Url = await compressImageToBase64(file);
          return {
            url: base64Url,
            storedUrl: base64Url,
            preview: base64Url,
          };
        })
      );

      setImages((prev) => [...prev, ...newImages]);
      showStatus(
        'success',
        `${newImages.length} image${newImages.length > 1 ? 's' : ''} processed.`
      );
    } catch (error) {
      console.error('Image processing failed:', error);
      showStatus('error', 'Image processing failed. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Save Product ──────────────────────────────────────────────────────────────

  async function saveProduct(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      showStatus('error', 'Product name is required.');
      return;
    }
    if (!form.categoryId) {
      showStatus('error', 'Please select a category.');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      showStatus('error', 'Please enter a valid MRP (price).');
      return;
    }
    if (images.length === 0) {
      showStatus('error', 'Please upload at least one product image.');
      return;
    }

    // Payment configuration validation
    if (!form.codAvailable && !form.prepaidAvailable && form.active) {
      showStatus('error', 'Please enable at least one payment method for active products.');
      return;
    }

    if (form.codAvailable && (!form.codPrice || Number(form.codPrice) <= 0)) {
      showStatus('error', 'Please enter a valid COD price since COD is enabled.');
      return;
    }

    if (form.prepaidAvailable && (!form.onlinePrice || Number(form.onlinePrice) <= 0)) {
      showStatus('error', 'Please enter a valid Prepaid price since Prepaid is enabled.');
      return;
    }

    let specifications = {};
    try {
      specifications = JSON.parse(form.specifications || '{}');
    } catch {
      showStatus('error', 'Specifications contain invalid JSON.');
      return;
    }

    const imageUrls = images.map((img) => img.storedUrl || img.url).filter(Boolean);

    const highlights = form.highlights
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      name: form.name.trim(),
      tagline: form.tagline || `${form.name.trim()} for everyday use.`,
      description: form.description,
      price: Number(form.price),
      codPrice: form.codPrice === '' || !form.codAvailable ? null : Number(form.codPrice),
      onlinePrice: form.onlinePrice === '' || !form.prepaidAvailable ? null : Number(form.onlinePrice),
      categoryId: String(form.categoryId),
      images: imageUrls,
      highlights,
      specifications,
      rating: form.rating === '' ? undefined : Number(form.rating),
      reviewCount: form.reviewCount === '' ? undefined : Number(form.reviewCount),
      averageRating: form.averageRating === '' ? undefined : Number(form.averageRating),
      active: Boolean(form.active),
      codAvailable: Boolean(form.codAvailable),
      prepaidAvailable: Boolean(form.prepaidAvailable),
      returnAvailable: Boolean(form.returnAvailable),
      returnWindow: form.returnAvailable ? Number(form.returnWindow) : 0,
      returnPolicy: form.returnPolicy,
      // Keep stock alive so backend doesn't fail validation
      stock: 9999,
      seller: 'RK Peedika',
      inStock: true,
    };

    try {
      setSaving(true);
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, payload);
        showStatus('success', 'Product updated successfully.');
      } else {
        await apiClient.post('/products', payload);
        showStatus('success', 'Product created successfully.');
      }
      setModalOpen(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('saveProduct error:', error);
      showStatus(
        'error',
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to save product. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReviewImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    
    try {
      setUploadingReviewImages(true);
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      
      const response = await apiClient.post('/uploads/review-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data && response.data.success) {
        const urls = response.data.images.map(img => img.url);
        setReviewForm(prev => ({ ...prev, images: [...prev.images, ...urls] }));
      }
    } catch (error) {
      console.error("Failed to upload review images:", error);
      showStatus('error', 'Review image upload failed.');
    } finally {
      setUploadingReviewImages(false);
      event.target.value = '';
    }
  }

  function removeReviewImage(indexToRemove) {
    setReviewForm(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== indexToRemove) }));
  }

  function openAddReview() {
    setEditingReview(null);
    setReviewForm({
      customerName: '',
      rating: 5,
      comment: '',
      verifiedPurchase: true,
      createdAt: new Date().toISOString().split('T')[0],
      images: []
    });
    setReviewModalOpen(true);
  }

  function openEditReview(review) {
    setEditingReview(review);
    setReviewForm({
      customerName: review.customerName || '',
      rating: review.rating || 5,
      comment: review.comment || '',
      verifiedPurchase: review.verifiedPurchase !== false,
      createdAt: new Date(review.createdAt).toISOString().split('T')[0],
      images: Array.isArray(review.images) ? review.images.map(img => typeof img === 'object' ? img.imageUrl : img) : []
    });
    setReviewModalOpen(true);
  }

  async function saveReview(e) {
    e.preventDefault();
    if (!reviewForm.customerName.trim()) {
      showStatus('error', 'Customer name is required.');
      return;
    }
    if (!reviewForm.comment.trim()) {
      showStatus('error', 'Review comment is required.');
      return;
    }

    const payload = {
      productId: editingProduct.id,
      rating: Number(reviewForm.rating),
      comment: reviewForm.comment.trim(),
      customerName: reviewForm.customerName.trim(),
      verifiedPurchase: Boolean(reviewForm.verifiedPurchase),
      createdAt: reviewForm.createdAt,
      images: reviewForm.images,
      status: 'approved'
    };

    try {
      if (editingReview) {
        await apiClient.put(`/reviews/${editingReview.id}/moderation`, payload);
        showStatus('success', 'Review updated successfully.');
      } else {
        await apiClient.post('/reviews', payload);
        showStatus('success', 'Review added successfully.');
      }
      setReviewModalOpen(false);
      setEditingReview(null);
      await fetchReviewsForProduct(editingProduct.id);
      await loadProducts();
    } catch (error) {
      console.error("Failed to save review:", error);
      showStatus('error', 'Failed to save review.');
    }
  }

  async function handleDeleteReview(reviewId) {
    const confirmed = window.confirm("Are you sure you want to delete this review?");
    if (!confirmed) return;

    try {
      await apiClient.delete(`/reviews/${reviewId}`);
      showStatus('success', 'Review deleted successfully.');
      await fetchReviewsForProduct(editingProduct.id);
      await loadProducts();
    } catch (error) {
      console.error("Failed to delete review:", error);
      showStatus('error', 'Failed to delete review.');
    }
  }

  // ── Delete Product ────────────────────────────────────────────────────────────

  async function deleteProduct(product) {
    // Show warning if product has had orders
    const confirmed = window.showConfirm
      ? await window.showConfirm(
          `Delete "${product.name}"?\n\nIf this product has existing orders, deactivating it instead is safer.`,
          "Delete Product"
        )
      : window.confirm(
          `Delete "${product.name}"?\n\n` +
            'If this product has existing orders, deactivating it instead is safer.\n\n' +
            'Press OK to delete permanently, or Cancel to go back.'
        );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/products/${product.id}`);
      showStatus('success', 'Product deleted successfully.');
      await loadProducts();
    } catch (error) {
      console.error('deleteProduct error:', error);
      showStatus(
        'error',
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to delete product.'
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Products</h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            {products.length} total · {products.filter((p) => p.status === 'active' || p.active).length} active
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          disabled={categories.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#F7941D] px-5 py-3 text-xs font-bold text-white shadow hover:bg-[#E07D10] disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Status Message */}
      {status.message && (
        <div
          className={`rounded-xl border p-4 flex items-center gap-2 text-xs font-bold ${
            status.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {status.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center flex-1 max-w-sm rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-transparent outline-none text-xs"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                statusFilter === f
                  ? 'bg-[#F7941D] text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-[#F7941D]" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No products found.</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search or filter.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Image</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Product</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Category</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Pricing</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Rating</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => {
                  const productImages = safeJson(product.images, []);
                  const firstImage = Array.isArray(productImages) ? productImages[0] : null;
                  const isActive = product.status === 'active' || product.active === true;
                  const isToggling = togglingId === product.id;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {firstImage ? (
                          <img
                            src={getImageUrl(firstImage)}
                            alt={product.name}
                            className="h-12 w-12 rounded-lg object-cover border border-gray-100"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                              e.target.style.display = 'none';
                              e.target.nextSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center ${firstImage ? 'hidden' : ''}`}>
                          <ImagePlus className="h-4 w-4 text-gray-400" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 max-w-[180px] truncate">{product.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {product.category?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-gray-800">MRP ₹{product.price ?? '—'}</span>
                          {product.codPrice && (
                            <span className="text-gray-500">COD ₹{product.codPrice}</span>
                          )}
                          {product.onlinePrice && (
                            <span className="text-emerald-600 font-semibold">Prepaid ₹{product.onlinePrice}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {product.rating || product.averageRating
                          ? `★ ${product.rating || product.averageRating}`
                          : '—'}
                        {product.reviewCount ? ` (${product.reviewCount})` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            title="Edit product"
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-[#F7941D] transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {/* Activate / Deactivate */}
                          <button
                            type="button"
                            onClick={() => toggleStatus(product)}
                            disabled={isToggling}
                            title={isActive ? 'Deactivate product' : 'Activate product'}
                            className={`rounded-lg p-2 transition-colors ${
                              isToggling
                                ? 'opacity-50 cursor-not-allowed'
                                : isActive
                                  ? 'text-emerald-500 hover:bg-red-50 hover:text-red-500'
                                  : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => deleteProduct(product)}
                            title="Delete product"
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map((product) => {
              const productImages = safeJson(product.images, []);
              const firstImage = Array.isArray(productImages) ? productImages[0] : null;
              const isActive = product.status === 'active' || product.active === true;
              const isToggling = togglingId === product.id;

              return (
                <div key={product.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="shrink-0">
                      {firstImage ? (
                        <img
                          src={getImageUrl(firstImage)}
                          alt={product.name}
                          className="h-16 w-16 rounded-lg object-cover border border-gray-100"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImagePlus className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900 text-sm truncate">{product.name}</p>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{product.category?.name || '—'}</p>
                      <div className="text-xs mt-1 space-y-0.5">
                        <span className="font-bold text-gray-800">MRP ₹{product.price}</span>
                        {product.codPrice && <span className="ml-2 text-gray-500">COD ₹{product.codPrice}</span>}
                        {product.onlinePrice && <span className="ml-2 text-emerald-600">Prepaid ₹{product.onlinePrice}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => toggleStatus(product)}
                      disabled={isToggling}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                        isActive
                          ? 'border border-red-200 text-red-500 hover:bg-red-50'
                          : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isActive ? (
                        <><ToggleRight className="h-3.5 w-3.5" /> Deactivate</>
                      ) : (
                        <><ToggleLeft className="h-3.5 w-3.5" /> Activate</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── PRODUCT MODAL ─────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="w-full h-[100dvh] md:h-[90vh] md:max-w-[1300px] md:rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0 bg-gray-50/50">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  All changes save to the database and reflect on the customer site immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={saveProduct} className="flex-1 overflow-hidden flex flex-col">

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* LEFT SIDE COLUMN */}
                  <div className="space-y-6">
                    
                    {/* Basic Info */}
                    <div className="border border-gray-100 bg-gray-50/30 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Basic Information</h4>
                      
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                          Product Name *
                        </label>
                        <input
                          value={form.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          placeholder="Stainless Steel Sink Sponge Holder"
                          required
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#F7941D] transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                            Category *
                          </label>
                          <select
                            value={form.categoryId}
                            onChange={(e) => updateField('categoryId', e.target.value)}
                            required
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#F7941D] transition-colors bg-white"
                          >
                            <option value="">Select category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={String(cat.id)}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                            Short Tagline
                          </label>
                          <input
                            value={form.tagline}
                            onChange={(e) => updateField('tagline', e.target.value)}
                            placeholder="Durable kitchen sink organizer"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#F7941D] transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                          Description
                        </label>
                        <textarea
                          value={form.description}
                          onChange={(e) => updateField('description', e.target.value)}
                          rows={3}
                          placeholder="Detailed product description…"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#F7941D] transition-colors resize-none"
                        />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="border border-gray-100 bg-gray-50/30 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Pricing</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                            MRP (Base Price) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                            <input
                              type="number"
                              value={form.price}
                              onChange={(e) => updateField('price', e.target.value)}
                              placeholder="499"
                              min="0"
                              step="0.01"
                              required
                              className="w-full rounded-xl border border-gray-200 pl-6 pr-2 py-2.5 text-xs outline-none focus:border-[#F7941D] transition-colors"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                            COD / Regular Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                            <input
                              type="number"
                              value={form.codPrice}
                              disabled={!form.codAvailable}
                              onChange={(e) => updateField('codPrice', e.target.value)}
                              placeholder="389"
                              min="0"
                              step="0.01"
                              className="w-full rounded-xl border border-gray-200 pl-6 pr-2 py-2.5 text-xs outline-none focus:border-[#F7941D] transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                            Prepaid / Online Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                            <input
                              type="number"
                              value={form.onlinePrice}
                              disabled={!form.prepaidAvailable}
                              onChange={(e) => updateField('onlinePrice', e.target.value)}
                              placeholder="349"
                              min="0"
                              step="0.01"
                              className="w-full rounded-xl border border-gray-200 pl-6 pr-2 py-2.5 text-xs outline-none focus:border-[#F7941D] transition-colors disabled:opacity-50 disabled:bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="border border-gray-100 bg-gray-50/30 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Payment Availability</h4>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.codAvailable}
                            onChange={(e) => updateField('codAvailable', e.target.checked)}
                            className="accent-[#F7941D] h-4 w-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-gray-700">COD Available</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.prepaidAvailable}
                            onChange={(e) => updateField('prepaidAvailable', e.target.checked)}
                            className="accent-[#F7941D] h-4 w-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-gray-700">Prepaid (Online) Available</span>
                        </label>
                      </div>
                    </div>

                    {/* Returns & Delivery */}
                    <div className="border border-gray-100 bg-gray-50/30 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Returns &amp; Delivery</h4>
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer select-none pb-3">
                            <input
                              type="checkbox"
                              checked={form.returnAvailable}
                              onChange={(e) => updateField('returnAvailable', e.target.checked)}
                              className="accent-[#F7941D] h-4 w-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-gray-700">Return Available</span>
                          </label>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                            Return Window (Days)
                          </label>
                          <input
                            type="number"
                            value={form.returnWindow}
                            disabled={!form.returnAvailable}
                            onChange={(e) => updateField('returnWindow', e.target.value)}
                            min="0"
                            placeholder="3"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#F7941D] transition-colors disabled:opacity-50 disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Return / Delivery Policy Details</label>
                        <textarea
                          value={form.returnPolicy}
                          disabled={!form.returnAvailable}
                          onChange={(e) => updateField('returnPolicy', e.target.value)}
                          rows={2}
                          placeholder="E.g. Return or exchange requests accepted within 3 days..."
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#F7941D] transition-colors resize-none disabled:opacity-50 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                  </div>

                  {/* RIGHT SIDE COLUMN */}
                  <div className="space-y-6">

                    {/* Product Images */}
                    <div className="border border-gray-100 bg-gray-50/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Product Images</h4>
                        <label
                          className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors ${
                            uploading ? 'bg-gray-400 cursor-wait' : 'bg-[#F7941D] hover:bg-[#E07D10]'
                          }`}
                        >
                          {uploading ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                          ) : (
                            <><ImagePlus className="h-3 w-3" /> Upload</>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {images.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                          <ImagePlus className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-400 font-semibold">No images yet. Upload above.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-white">
                              <img
                                src={getImageUrl(img.preview || img.url)}
                                alt={`Product image ${idx + 1}`}
                                className="h-16 w-full object-cover"
                                onError={(e) => { e.target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; e.target.style.background = '#f3f4f6'; }}
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-0.5 right-0.5 rounded-full bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                              {idx === 0 ? (
                                <span className="absolute bottom-0.5 left-0.5 text-[8px] font-bold bg-black/60 text-white px-1 py-0.2 rounded">
                                  Main
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImages(prev => {
                                      const updated = [...prev];
                                      const [target] = updated.splice(idx, 1);
                                      updated.unshift(target);
                                      return updated;
                                    });
                                  }}
                                  className="absolute bottom-0.5 left-0.5 text-[8px] font-bold bg-[#F7941D]/80 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Set Main
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ratings & Details (Highlights & Specs) */}
                    <div className="border border-gray-100 bg-gray-50/30 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Product Details</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Highlights (One per line)</label>
                          <textarea
                            value={form.highlights}
                            onChange={(e) => updateField('highlights', e.target.value)}
                            rows={3}
                            placeholder="Stainless steel construction&#10;Rust-resistant coating"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#F7941D] transition-colors resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Specifications (JSON Format)</label>
                          <textarea
                            value={form.specifications}
                            onChange={(e) => updateField('specifications', e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono outline-none focus:border-[#F7941D] transition-colors resize-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Rating</label>
                          <input
                            type="number"
                            value={form.rating}
                            onChange={(e) => updateField('rating', e.target.value)}
                            placeholder="4.5"
                            min="0"
                            max="5"
                            step="0.1"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#F7941D] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Review Count</label>
                          <input
                            type="number"
                            value={form.reviewCount}
                            onChange={(e) => updateField('reviewCount', e.target.value)}
                            placeholder="128"
                            min="0"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#F7941D] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Avg Rating</label>
                          <input
                            type="number"
                            value={form.averageRating}
                            onChange={(e) => updateField('averageRating', e.target.value)}
                            placeholder="4.3"
                            min="0"
                            max="5"
                            step="0.1"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#F7941D] transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => updateField('active', e.target.checked)}
                            className="accent-[#F7941D] h-4 w-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-gray-700">Active (Visible to customers)</span>
                        </label>
                      </div>
                    </div>

                    {/* ── REVIEWS SECTION ────────────────────────────────────────── */}
                    {editingProduct && (
                      <div className="border border-gray-100 bg-gray-50/30 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Customer Reviews</h4>
                          <button
                            type="button"
                            onClick={openAddReview}
                            className="flex items-center gap-1 bg-[#F7941D]/10 hover:bg-[#F7941D]/20 text-[#F7941D] rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Add Review
                          </button>
                        </div>

                        {loadingReviews ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-[#F7941D]" />
                          </div>
                        ) : productReviews.length === 0 ? (
                          <p className="text-[10px] text-gray-400 italic">No reviews found for this product.</p>
                        ) : (
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {productReviews.map((rev) => (
                              <div key={rev.id} className="border border-gray-100 rounded-xl p-2.5 bg-white flex justify-between gap-3 text-[11px] leading-relaxed shadow-sm">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                    <span className="font-bold text-gray-900">{rev.customerName || 'Anonymous'}</span>
                                    <span className="text-amber-400 font-bold">★ {rev.rating}</span>
                                    {rev.verifiedPurchase && (
                                      <span className="text-[8px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0">
                                        Verified
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 font-semibold break-words">{rev.comment}</p>
                                  <div className="flex items-center gap-2 text-[9px] text-gray-400 font-semibold mt-1">
                                    <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                                    {rev.images && rev.images.length > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        📷 {rev.images.length} photo{rev.images.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                  {rev.images && rev.images.length > 0 && (
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                      {rev.images.map((img, idx) => (
                                        <img key={idx} src={getImageUrl(img.imageUrl || img)} className="w-8 h-8 rounded object-cover border" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 items-end shrink-0 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => openEditReview(rev)}
                                    className="px-2 py-0.5 rounded bg-gray-50 hover:bg-orange-50 hover:text-[#F7941D] text-[9px] font-bold border"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReview(rev.id)}
                                    className="px-2 py-0.5 rounded bg-gray-50 hover:bg-red-55 hover:text-red-600 text-[9px] font-bold border"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>
              </div>

              {/* Modal Footer (Sticky bottom action bar) */}
              <div className="border-t px-6 py-4 flex items-center justify-end gap-3 bg-gray-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#F7941D] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#E07D10] disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><CheckCircle className="h-4 w-4" /> {editingProduct ? 'Save Product' : 'Create Product'}</>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT REVIEW SUB-MODAL ── */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => { setReviewModalOpen(false); setEditingReview(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-base font-black text-gray-900 border-b pb-2 flex items-center gap-1.5">
              {editingReview ? 'Edit Review' : 'Add Customer Review'}
            </h4>
            
            <form onSubmit={saveReview} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Customer Name *</label>
                <input
                  value={reviewForm.customerName}
                  onChange={e => setReviewForm(prev => ({ ...prev, customerName: e.target.value }))}
                  required
                  placeholder="Rahul"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#F7941D] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Rating Score (1-5) *</label>
                  <select
                    value={reviewForm.rating}
                    onChange={e => setReviewForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#F7941D] transition-colors bg-white"
                  >
                    {[5, 4, 3, 2, 1].map(num => <option key={num} value={num}>{num} Star{num > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Review Date</label>
                  <input
                    type="date"
                    value={reviewForm.createdAt}
                    onChange={e => setReviewForm(prev => ({ ...prev, createdAt: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#F7941D] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Review Comment *</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Loved it! 👍 Very useful product."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#F7941D] transition-colors resize-none"
                />
              </div>

              {/* Review Images */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-400 block">Review Images</label>
                  <label className={`cursor-pointer text-[10px] font-bold text-[#F7941D] ${uploadingReviewImages ? 'opacity-50 cursor-wait' : ''}`}>
                    {uploadingReviewImages ? 'Uploading...' : '+ Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleReviewImageUpload}
                      disabled={uploadingReviewImages}
                      className="hidden"
                    />
                  </label>
                </div>
                {reviewForm.images.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic">No images uploaded.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {reviewForm.images.map((url, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded border bg-gray-50 overflow-hidden shrink-0">
                        <img src={getImageUrl(url)} alt="Review attachment" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeReviewImage(idx)}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reviewForm.verifiedPurchase}
                    onChange={e => setReviewForm(prev => ({ ...prev, verifiedPurchase: e.target.checked }))}
                    className="accent-[#F7941D] h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="font-bold text-gray-700">Verified Purchase review</span>
                </label>
              </div>

              <div className="border-t pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setReviewModalOpen(false); setEditingReview(null); }}
                  className="px-4 py-2 border rounded-xl text-gray-500 hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingReviewImages}
                  className="px-5 py-2 rounded-xl bg-[#F7941D] text-white hover:bg-[#E07D10] font-bold disabled:opacity-50"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}