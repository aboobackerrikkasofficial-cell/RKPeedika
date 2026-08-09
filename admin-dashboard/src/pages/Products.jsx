import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Table from '../components/Table';
import FormInput from '../components/FormInput';
import apiClient from '../api/client';
import { Search, Plus, Trash2, Edit, AlertCircle, CheckCircle } from 'lucide-react';

// Product validation schema using Zod
const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters long"),
  tagline: z.string().min(5, "Tagline must be at least 5 characters long"),
  price: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Price must be a valid number" }).min(1, "Price must be greater than 0")
  ),
  categoryId: z
    .string()
    .trim()
    .min(1, "Please select a product category"),
  stock: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Stock must be a valid number" }).min(0, "Stock cannot be negative")
  ),
  seller: z.string().min(3, "Seller name must be at least 3 characters long"),
  originalPrice: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional()
  ),
  codPrice: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional()
  ),
  onlinePrice: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional()
  ),
  onlineDiscount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional()
  ),
  enableOnlineDiscount: z.boolean().default(false),
  codAvailable: z.boolean().default(true),
  inStock: z.boolean().default(true),
  estimatedDeliveryDays: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().default(3)
  ),
  imagesText: z.string(),
  highlightsText: z.string().optional(),
  specificationsText: z.string().optional(),
  variantsText: z.string().optional(),
  relatedProductsText: z.string().optional(),
  description: z.string().optional(),
  showPurchaseCount: z.boolean().default(true),
  purchaseCountMode: z.string().default("auto"),
  purchaseCount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional()
  )
});

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Meesho Import States
  const [meeshoUrl, setMeeshoUrl] = useState("");
  const [meeshoHtml, setMeeshoHtml] = useState("");
  const [showHtmlPaste, setShowHtmlPaste] = useState(false);
  const [fetchingMeesho, setFetchingMeesho] = useState(false);
  const [markupType, setMarkupType] = useState("percentage");
  const [markupValue, setMarkupValue] = useState(15);
  const [meeshoPreview, setMeeshoPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Hook-form initialization
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      tagline: "",
      price: "",
      originalPrice: "",
      categoryId: "",
      stock: "",
      seller: "",
      codPrice: "",
      onlinePrice: "",
      onlineDiscount: "",
      enableOnlineDiscount: false,
      codAvailable: true,
      inStock: true,
      estimatedDeliveryDays: 3,
      imagesText: "",
      highlightsText: "",
      specificationsText: "",
      variantsText: "",
      relatedProductsText: "",
      description: "",
      showPurchaseCount: true,
      purchaseCountMode: "auto",
      purchaseCount: ""
    }
  });

  // Fetch products and categories on mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products');

      let productList = [];

      if (Array.isArray(res.data)) {
        productList = res.data;
      } else if (Array.isArray(res.data?.products)) {
        productList = res.data.products;
      } else if (Array.isArray(res.data?.data)) {
        productList = res.data.data;
      }

      setProductsList(productList);
    } catch (err) {
      console.error("Failed to load products:", err);
      showStatus(
        'error',
        err.response?.data?.message ||
        "Could not connect to database to fetch products. Login session may have expired."
      );
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');

      console.log("Categories API response:", res.data);

      let categoryList = [];

      if (Array.isArray(res.data)) {
        categoryList = res.data;
      } else if (Array.isArray(res.data?.categories)) {
        categoryList = res.data.categories;
      } else if (Array.isArray(res.data?.data)) {
        categoryList = res.data.data;
      }

      const validCategories = categoryList.filter(
        (category) => category?.id && category?.name
      );

      setCategories(validCategories);

      if (validCategories.length === 0) {
        showStatus(
          'error',
          'No product categories found. Please create a category first.'
        );
      }
    } catch (err) {
      console.error("Failed to load categories:", err);

      setCategories([]);

      showStatus(
        'error',
        err.response?.data?.message ||
        "Could not load product categories."
      );
    }
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const handleFetchMeesho = async () => {
    if (!meeshoUrl && (!showHtmlPaste || !meeshoHtml)) {
      window.showAlert("Please paste a Meesho product link or raw HTML page source.", "Missing Information");
      return;
    }

    setFetchingMeesho(true);
    try {
      const res = await apiClient.post('/admin/import/meesho', {
        url: meeshoUrl,
        html: showHtmlPaste ? meeshoHtml : "",
        markupType,
        markupValue
      });

      if (res.data && res.data.success) {
        const prod = res.data.data;

        // Auto map category.
        // Only use the imported categoryId if it actually exists in our category list.
        const importedCategory = prod.categoryId
          ? categories.find((category) => category.id === prod.categoryId)
          : null;

        const catId = importedCategory?.id || categories[0]?.id || "";

        if (!catId) {
          showStatus(
            'error',
            'Product imported, but no valid category is available. Create a category first.'
          );
          return;
        }

        // Set form values
        setValue("name", prod.name || "");
        setValue("tagline", prod.brand ? `Brand: ${prod.brand}` : "Imported high quality product.");
        setValue("price", prod.price || "");
        setValue("originalPrice", prod.originalPrice || "");
        setValue("categoryId", String(catId), { shouldValidate: true });
        setValue("stock", 100); // default stock
        setValue("seller", prod.brand || "Meesho Dropshipper");
        setValue("description", prod.description || "");

        // Format lists for the text inputs
        const imagesText = Array.isArray(prod.images) ? prod.images.join(', ') : '';
        setValue("imagesText", imagesText);

        const highlightsText = Array.isArray(prod.highlights) ? prod.highlights.join('\n') : '';
        setValue("highlightsText", highlightsText);

        setValue("specificationsText", JSON.stringify(prod.specifications || {}, null, 2));
        setValue("variantsText", JSON.stringify(prod.variants || {}, null, 2));
        setValue("estimatedDeliveryDays", prod.estimatedDeliveryDays || 3);

        setMeeshoPreview(prod);
        showStatus('success', "Product details successfully imported from Meesho!");
      } else {
        window.showAlert(res.data?.message || "Failed to fetch Meesho product.", "Import Error");
      }
    } catch (err) {
      console.error(err);
      window.showAlert(err.response?.data?.error?.message || err.response?.data?.message || "Error connecting to importer backend. Please check connection.", "Network Error");
    } finally {
      setFetchingMeesho(false);
    }
  };

  const handleClearMeesho = () => {
    setMeeshoUrl("");
    setMeeshoHtml("");
    setMeeshoPreview(null);
  };

  const onSubmit = async (data) => {
    // ------------------------------------------------------------
    // Extra validation before sending anything to the backend.
    // This specifically prevents the "categoryId is required" error.
    // ------------------------------------------------------------
    const normalizedCategoryId = String(data.categoryId || "").trim();

    if (!normalizedCategoryId) {
      showStatus('error', 'Please select a product category.');
      return;
    }

    const selectedCategory = categories.find(
      (category) => String(category.id) === normalizedCategoryId
    );

    if (!selectedCategory) {
      showStatus(
        'error',
        'The selected category is invalid or no longer exists. Please select another category.'
      );
      return;
    }

    // Process image URLs.
    let images = [];
    try {
      images = String(data.imagesText || "")
        .split(',')
        .map((img) => img.trim())
        .filter(Boolean);
    } catch (e) {
      images = [];
    }

    if (images.length === 0) {
      showStatus('error', 'Please add at least one product image URL.');
      return;
    }

    // Process highlights.
    let highlights = [];
    if (data.highlightsText) {
      highlights = String(data.highlightsText)
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean);
    }

    // Process specifications JSON.
    let specifications = {};
    if (data.specificationsText && String(data.specificationsText).trim()) {
      try {
        specifications = JSON.parse(data.specificationsText);

        if (
          specifications === null ||
          typeof specifications !== 'object' ||
          Array.isArray(specifications)
        ) {
          window.showAlert(
            "Specifications must be a valid JSON object.",
            "JSON Parse Error"
          );
          return;
        }
      } catch (e) {
        window.showAlert(
          "Invalid Specifications JSON format. Please correct it.",
          "JSON Parse Error"
        );
        return;
      }
    }

    // Process variants JSON.
    let variants = {};
    if (data.variantsText && String(data.variantsText).trim()) {
      try {
        variants = JSON.parse(data.variantsText);

        if (
          variants === null ||
          typeof variants !== 'object' ||
          Array.isArray(variants)
        ) {
          window.showAlert(
            "Variants must be a valid JSON object.",
            "JSON Parse Error"
          );
          return;
        }
      } catch (e) {
        window.showAlert(
          "Invalid Variants JSON format. Please correct it.",
          "JSON Parse Error"
        );
        return;
      }
    }

    // Process related product IDs.
    let relatedProducts = [];
    if (data.relatedProductsText) {
      relatedProducts = String(data.relatedProductsText)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }

    // Normalize optional numeric values.
    const toOptionalNumber = (value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }

      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    };

    const payload = {
      name: String(data.name || "").trim(),
      tagline: String(data.tagline || "").trim(),
      description: String(data.description || "").trim(),

      price: Number(data.price),
      originalPrice: toOptionalNumber(data.originalPrice),

      // IMPORTANT: always send the real database category ID.
      categoryId: normalizedCategoryId,

      stock: Number(data.stock),
      seller: String(data.seller || "").trim(),

      images,

      codPrice: toOptionalNumber(data.codPrice),
      onlinePrice: toOptionalNumber(data.onlinePrice),
      onlineDiscount: toOptionalNumber(data.onlineDiscount),

      enableOnlineDiscount: Boolean(data.enableOnlineDiscount),
      codAvailable: Boolean(data.codAvailable),
      inStock: Boolean(data.inStock),

      estimatedDeliveryDays: Number(data.estimatedDeliveryDays || 3),

      highlights,
      specifications,
      variants,
      relatedProducts,

      showPurchaseCount: Boolean(data.showPurchaseCount),
      purchaseCountMode: data.purchaseCountMode || "auto",
      purchaseCount: toOptionalNumber(data.purchaseCount)
    };

    // Final payload guard.
    if (!payload.name || payload.name.length < 3) {
      showStatus('error', 'Product name must be at least 3 characters long.');
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      showStatus('error', 'Please enter a valid product price.');
      return;
    }

    if (!Number.isFinite(payload.stock) || payload.stock < 0) {
      showStatus('error', 'Please enter a valid stock quantity.');
      return;
    }

    if (!payload.seller || payload.seller.length < 3) {
      showStatus('error', 'Seller name must be at least 3 characters long.');
      return;
    }

    console.log("CREATE/UPDATE PRODUCT PAYLOAD:", payload);
    console.log("SELECTED CATEGORY:", selectedCategory);

    try {
      if (editingProduct) {
        // Edit flow
        const res = await apiClient.put(
          `/products/${editingProduct.id}`,
          payload
        );

        if (res.data?.success !== false) {
          showStatus('success', "Product details updated successfully.");
        }
      } else {
        // Add flow
        const res = await apiClient.post('/products', payload);

        if (res.data?.success !== false) {
          showStatus('success', "New product published successfully.");
        }
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      reset();
      handleClearMeesho();
      setShowPreviewModal(false);

      await fetchProducts();
    } catch (err) {
      console.error("Save product failed:", err);

      const backendMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message;

      showStatus(
        'error',
        backendMessage || "Failed to publish product updates."
      );
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);

    // Prefill form
    setValue("name", product.name);
    setValue("tagline", product.tagline || "");
    setValue("price", product.price);
    setValue("originalPrice", product.originalPrice || "");
    setValue(
      "categoryId",
      product.categoryId
        ? String(product.categoryId)
        : categories[0]?.id
          ? String(categories[0].id)
          : "",
      { shouldValidate: true }
    );
    setValue("stock", product.stock);
    setValue("seller", product.seller);
    setValue("codPrice", product.codPrice || "");
    setValue("onlinePrice", product.onlinePrice || "");
    setValue("onlineDiscount", product.onlineDiscount || "");
    setValue("enableOnlineDiscount", product.enableOnlineDiscount || false);
    setValue("codAvailable", product.codAvailable !== false);
    setValue("inStock", product.inStock !== false);
    setValue("estimatedDeliveryDays", product.estimatedDeliveryDays || 3);
    setValue("description", product.description || "");
    setValue("showPurchaseCount", product.showPurchaseCount !== false);
    setValue("purchaseCountMode", product.purchaseCountMode || "auto");
    setValue("purchaseCount", product.purchaseCount || "");

    // Format serialized string arrays/objects
    const imagesArray = Array.isArray(product.images) ? product.images : [];
    setValue("imagesText", imagesArray.join(', '));

    const highlightsArray = Array.isArray(product.highlights) ? product.highlights : [];
    setValue("highlightsText", highlightsArray.join('\n'));

    setValue("specificationsText", JSON.stringify(product.specifications || {}, null, 2));
    setValue("variantsText", JSON.stringify(product.variants || {}, null, 2));

    const relatedArray = Array.isArray(product.relatedProducts) ? product.relatedProducts : [];
    setValue("relatedProductsText", relatedArray.join(', '));

    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const ok = await window.showConfirm("Are you sure you want to remove this product listing?", "Delete Product");
    if (ok) {
      try {
        const res = await apiClient.delete(`/products/${id}`);
        if (res.data.success) {
          showStatus('success', "Product listing removed permanently.");
          fetchProducts();
        }
      } catch (err) {
        console.error("Delete failed", err);
        showStatus('error', "Failed to delete product listing.");
      }
    }
  };

  // Search logic
  const filteredProducts = productsList.filter((p) => {
    const name = String(p?.name || "").toLowerCase();
    const category = String(
      p?.category?.name || p?.category || ""
    ).toLowerCase();
    const query = searchTerm.toLowerCase();

    return name.includes(query) || category.includes(query);
  });

  const columns = [
    { key: "id", label: "SKU ID", sortable: true },
    { key: "name", label: "Product Name", sortable: true },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (row) => <span>{row.category?.name || row.category || 'General'}</span>
    },
    {
      key: "price",
      label: "Pricing (Base/COD/Online)",
      render: (row) => (
        <div className="flex flex-col text-[10px]">
          <span className="font-bold text-charcoal">Base: ₹{row.price}</span>
          {row.codPrice && <span className="text-gray-400">COD: ₹{row.codPrice}</span>}
          {row.onlinePrice && <span className="text-emerald-600">Online: ₹{row.onlinePrice}</span>}
        </div>
      )
    },
    {
      key: "stock",
      label: "Stock Count",
      sortable: true,
      render: (row) => (
        <span className={`font-bold ${row.stock <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
          {row.stock} units {row.stock <= 5 && '⚠️'}
        </span>
      )
    },
    { key: "seller", label: "Verified Seller", sortable: false },
    {
      key: "actions",
      label: "Options",
      render: (row) => (
        <div className="flex space-x-1">
          <button
            onClick={() => handleEdit(row)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-[#F7941D] transition-all"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Products Catalog</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Publish new items, check stock levels, and audit merchant assignments.
            <span className={`ml-2 ${categories.length === 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} available
            </span>
          </p>
        </div>

        <button
          onClick={() => {
            if (categories.length === 0) {
              showStatus(
                'error',
                'No product categories are available. Please create a category before adding a product.'
              );
              return;
            }

            setEditingProduct(null);

            reset({
              name: "",
              tagline: "",
              price: "",
              originalPrice: "",
              categoryId: String(categories[0].id),
              stock: "",
              seller: "",
              codPrice: "",
              onlinePrice: "",
              onlineDiscount: "",
              enableOnlineDiscount: false,
              codAvailable: true,
              inStock: true,
              estimatedDeliveryDays: 3,
              imagesText: "",
              highlightsText: "",
              specificationsText: "{\n\n}",
              variantsText: "{\n\n}",
              relatedProductsText: "",
              description: "",
              showPurchaseCount: true,
              purchaseCountMode: "auto",
              purchaseCount: ""
            });

            handleClearMeesho();
            setShowPreviewModal(false);
            setIsModalOpen(true);
          }}
          className="w-max flex items-center justify-center gap-1.5 rounded-xl bg-[#F7941D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#E07D10] transition-all shadow-sm"
        >
          <Plus className="h-4.5 w-4.5" /> Add New Product
        </button>
      </div>

      {/* Status Messages */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-bold ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {statusMsg.text}
        </div>
      )}

      {/* Search Input Filter */}
      <div className="flex items-center rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs shadow-sm max-w-md">
        <Search className="h-4 w-4 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search products by title or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none placeholder:text-gray-400 text-charcoal font-medium"
        />
      </div>

      {/* Products table */}
      <Table
        columns={columns}
        data={filteredProducts}
        itemsPerPage={10}
        emptyMessage="No catalog listings match your search query."
      />

      {/* ADD / EDIT PRODUCT SLIDE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/30 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-premium p-6 flex flex-col max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-extrabold text-charcoal flex items-center gap-2">
                📂 {editingProduct ? `Edit SKU: ${editingProduct.id}` : 'Add Catalog Product'}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setEditingProduct(null); reset(); }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Validation Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-1 text-xs">

              {!editingProduct && (
                <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-extrabold text-charcoal flex items-center gap-1">
                    📦 Import Product from Meesho
                  </h4>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Paste Meesho Product Link</label>
                    <input
                      type="text"
                      value={meeshoUrl}
                      onChange={(e) => setMeeshoUrl(e.target.value)}
                      placeholder="e.g. https://www.meesho.com/classy-retro-men-shirts/p/2v9y7q"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                    />

                    <div className="flex justify-between items-center mt-0.5">
                      <span
                        onClick={() => setShowHtmlPaste(!showHtmlPaste)}
                        className="text-[10px] font-bold text-[#F7941D] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {showHtmlPaste ? "⬇️ Hide Page Source Paste" : "🛡️ Blocked by Cloudflare? Paste Page HTML Source"}
                      </span>
                    </div>

                    {showHtmlPaste && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                          Meesho Page Source HTML Code (View Source: Ctrl+U, copy all and paste here)
                        </label>
                        <textarea
                          rows={4}
                          value={meeshoHtml}
                          onChange={(e) => setMeeshoHtml(e.target.value)}
                          placeholder="Paste complete HTML source code here..."
                          className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D] font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Profit Markup Engine</label>
                      <select
                        value={markupType}
                        onChange={(e) => setMarkupType(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D]"
                      >
                        <option value="percentage">Percentage Markup (%)</option>
                        <option value="flat">Flat Price Markup (₹)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Markup Value</label>
                      <input
                        type="number"
                        value={markupValue}
                        onChange={(e) => setMarkupValue(Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleFetchMeesho}
                      disabled={fetchingMeesho}
                      className="rounded-xl bg-[#1C1917] px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50 transition-all"
                    >
                      {fetchingMeesho ? "Fetching..." : "Fetch Product"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearMeesho}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      Clear
                    </button>
                    {meeshoPreview && (
                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(true)}
                        className="rounded-xl border border-[#F7941D] px-4 py-2 text-xs font-bold text-[#F7941D] hover:bg-orange-50 transition-all"
                      >
                        Preview Import
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Product Name *"
                  name="name"
                  placeholder="e.g. Copper Water Carafe"
                  register={register}
                  error={errors.name}
                />

                <FormInput
                  label="Tagline / Short Details *"
                  name="tagline"
                  placeholder="e.g. Pure copper hammered water container."
                  register={register}
                  error={errors.tagline}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormInput
                  label="Base Price (₹) *"
                  name="price"
                  type="number"
                  placeholder="e.g. 1499"
                  register={register}
                  error={errors.price}
                />

                <FormInput
                  label="Original MRP Price (₹)"
                  name="originalPrice"
                  type="number"
                  placeholder="e.g. 1999"
                  register={register}
                  error={errors.originalPrice}
                />

                <FormInput
                  label="Stock Qty *"
                  name="stock"
                  type="number"
                  placeholder="e.g. 20"
                  register={register}
                  error={errors.stock}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-4 border-gray-50">
                <FormInput
                  label="COD Price (₹)"
                  name="codPrice"
                  type="number"
                  placeholder="e.g. 1499"
                  register={register}
                  error={errors.codPrice}
                />

                <FormInput
                  label="Online Payment Price (₹)"
                  name="onlinePrice"
                  type="number"
                  placeholder="e.g. 1399"
                  register={register}
                  error={errors.onlinePrice}
                />

                <FormInput
                  label="Online Discount Value (₹)"
                  name="onlineDiscount"
                  type="number"
                  placeholder="e.g. 100"
                  register={register}
                  error={errors.onlineDiscount}
                />
              </div>

              <div className="grid grid-cols-4 gap-4 items-center">
                <div className="flex items-center gap-1.5">
                  <input type="checkbox" {...register("enableOnlineDiscount")} id="enableOnlineDiscount" className="w-4 h-4 text-[#F7941D]" />
                  <label htmlFor="enableOnlineDiscount" className="font-bold text-gray-700">Enable Online Discount</label>
                </div>

                <div className="flex items-center gap-1.5">
                  <input type="checkbox" {...register("codAvailable")} id="codAvailable" className="w-4 h-4 text-[#F7941D]" />
                  <label htmlFor="codAvailable" className="font-bold text-gray-700">COD Available</label>
                </div>

                <div className="flex items-center gap-1.5">
                  <input type="checkbox" {...register("inStock")} id="inStock" className="w-4 h-4 text-[#F7941D]" />
                  <label htmlFor="inStock" className="font-bold text-gray-700">In Stock</label>
                </div>

                <FormInput
                  label="Est Delivery (Days)"
                  name="estimatedDeliveryDays"
                  type="number"
                  register={register}
                  error={errors.estimatedDeliveryDays}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-4 border-gray-50 items-center">
                <div className="flex items-center gap-1.5">
                  <input type="checkbox" {...register("showPurchaseCount")} id="showPurchaseCount" className="w-4 h-4 text-[#F7941D]" />
                  <label htmlFor="showPurchaseCount" className="font-bold text-gray-700">Show Purchase Count</label>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Purchase Count Mode</label>
                  <select
                    {...register("purchaseCountMode")}
                    className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D]"
                  >
                    <option value="auto">Auto (from DB)</option>
                    <option value="manual">Manual Override</option>
                  </select>
                </div>

                <FormInput
                  label="Manual Purchase Count"
                  name="purchaseCount"
                  type="number"
                  placeholder="e.g. 1500"
                  register={register}
                  error={errors.purchaseCount}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 border-gray-50">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category *</label>
                  <select
                    {...register("categoryId")}
                    disabled={categories.length === 0}
                    className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal bg-white outline-none focus:border-[#F7941D] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {categories.length === 0
                        ? "No categories available"
                        : "Select a category"}
                    </option>

                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {errors.categoryId && (
                    <span className="text-[10px] text-red-500 font-bold">
                      {errors.categoryId.message}
                    </span>
                  )}
                </div>

                <FormInput
                  label="Verified Seller Name *"
                  name="seller"
                  placeholder="e.g. Saharanpur Guild"
                  register={register}
                  error={errors.seller}
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product Images (Comma-separated URLs) *</label>
                <textarea
                  {...register("imagesText")}
                  rows={2}
                  placeholder="e.g. /images/coffee_maker_1.jpg, /images/coffee_maker_2.jpg"
                  className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
                {errors.imagesText && <span className="text-[10px] text-red-500 font-bold">{errors.imagesText.message}</span>}
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder="Detailed description of the product..."
                  className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Highlights (One bullet point per line)</label>
                <textarea
                  {...register("highlightsText")}
                  rows={3}
                  placeholder="e.g. 100% Pure copper&#10;Handmade by local artisans&#10;Includes 2 cups"
                  className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Specifications (JSON Object)</label>
                  <textarea
                    {...register("specificationsText")}
                    rows={4}
                    placeholder='e.g. {&#10;  "Material": "Pure Copper",&#10;  "Weight": "500g"&#10;}'
                    className="font-mono rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Variants Configuration (JSON Object)</label>
                  <textarea
                    {...register("variantsText")}
                    rows={4}
                    placeholder='e.g. {&#10;  "sizes": ["Small", "Large (+ ₹300)"],&#10;  "colors": ["Gold", "Silver"]&#10;}'
                    className="font-mono rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Related Product IDs (Comma-separated)</label>
                <input
                  type="text"
                  {...register("relatedProductsText")}
                  placeholder="e.g. prod-1, prod-3"
                  className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                    reset();
                    handleClearMeesho();
                    setShowPreviewModal(false);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#F7941D] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#E07D10] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow"
                >
                  {isSubmitting ? "Saving..." : (editingProduct ? "Save Changes" : "Publish Product")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MEESHO PREVIEW MODAL */}
      {showPreviewModal && meeshoPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-premium p-6 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-extrabold text-charcoal flex items-center gap-2">
                🔍 Import Product Preview
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 text-xs">
              <div className="flex gap-4">
                <img
                  src={meeshoPreview.images?.[0] ? (meeshoPreview.images[0].startsWith('http') ? meeshoPreview.images[0] : meeshoPreview.images[0]) : '/images/coffee_maker_1.jpg'}
                  alt={meeshoPreview.name}
                  className="w-24 h-24 object-cover rounded-xl border border-gray-100"
                />
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-charcoal">{meeshoPreview.name}</h4>
                  <p className="text-gray-400 font-semibold">Brand: {meeshoPreview.brand || 'Generic'}</p>
                  <p className="text-[#F7941D] font-bold text-sm">₹{meeshoPreview.price}</p>
                  <span className="inline-block text-[9px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Mapped Category: {meeshoPreview.mappedCategory || 'Uncategorized (Will use catalog default)'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1.5 border border-gray-100">
                <h5 className="font-bold text-charcoal">Profit Analysis</h5>
                <div className="flex justify-between">
                  <span>Calculated Selling Price:</span>
                  <span className="font-bold text-charcoal">₹{meeshoPreview.price}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Estimated Markup Profit Margin:</span>
                  <span className="font-bold">₹{meeshoPreview.profitMargin}</span>
                </div>
              </div>

              {meeshoPreview.description && (
                <div className="space-y-1">
                  <h5 className="font-bold text-charcoal">Description</h5>
                  <p className="text-gray-500 leading-relaxed font-medium bg-gray-50 p-2.5 rounded-xl max-h-32 overflow-y-auto">{meeshoPreview.description}</p>
                </div>
              )}

              {meeshoPreview.specifications && Object.keys(meeshoPreview.specifications).length > 0 && (
                <div className="space-y-1">
                  <h5 className="font-bold text-charcoal">Specifications</h5>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl">
                    {Object.entries(meeshoPreview.specifications).map(([k, v]) => (
                      <div key={k} className="flex justify-between pr-2 border-b border-gray-200/50 pb-1 last:border-0">
                        <span className="text-gray-400 font-semibold">{k}:</span>
                        <span className="text-gray-700 font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="mt-4 w-full bg-[#1C1917] text-white py-2.5 rounded-xl font-bold hover:bg-gray-800 transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline helper icon
function XIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  );
}