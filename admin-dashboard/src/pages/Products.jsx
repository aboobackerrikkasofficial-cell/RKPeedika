import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import Table from '../components/Table';
import apiClient from '../api/client';

const MAX_NAME_WORDS = 6;

/**
 * Keep product names short and clean.
 */
function makeShortProductName(value) {
  if (!value) return '';

  let name = String(value)
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[|•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  name = name.replace(
    /^(arraystyle|meesho|generic|premium|best|original|latest|trendy|stylish|fashionable)\s+/i,
    ''
  );

  const lower = name.toLowerCase();

  if (
    lower.includes('sink') &&
    lower.includes('sponge') &&
    (
      lower.includes('caddy') ||
      lower.includes('organizer') ||
      lower.includes('organiser') ||
      lower.includes('rack') ||
      lower.includes('holder')
    )
  ) {
    return 'Stainless Steel Sink Sponge Holder';
  }

  if (
    lower.includes('vegetable') &&
    (
      lower.includes('rack') ||
      lower.includes('storage') ||
      lower.includes('organizer')
    )
  ) {
    return 'Vegetable Storage Rack';
  }

  if (
    lower.includes('kitchen') &&
    (
      lower.includes('rack') ||
      lower.includes('storage') ||
      lower.includes('organizer')
    )
  ) {
    return 'Kitchen Storage Rack';
  }

  const ignored = new Set([
    'premium',
    'best',
    'latest',
    'new',
    'original',
    'stylish',
    'trendy',
    'beautiful',
    'practical',
    'quality',
    'multipurpose',
    'multi',
    'functional',
    'portable',
    'home',
    'use',
    'for',
    'the',
    'with',
    'and',
    'pack',
    'set',
    'pcs',
    'piece',
    'pieces',
    'combo',
    'offer',
    'sale',
  ]);

  const words = name
    .replace(/[,:;()[\]{}]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word) => !ignored.has(word.toLowerCase())
    );

  return words.slice(0, MAX_NAME_WORDS).join(' ');
}

/**
 * Convert backend image path to usable browser URL.
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
    value.startsWith('blob:')
  ) {
    return value;
  }

  const backendUrl = (
    import.meta.env.VITE_API_URL ||
    'https://rkpeedika.onrender.com/api'
  ).replace(/\/api\/?$/, '');

  return `${backendUrl}${value.startsWith('/') ? value : `/${value}`
    }`;
}

/**
 * Parse JSON safely.
 */
function parseJson(value, fallback) {
  if (!value) return fallback;

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [status, setStatus] = useState({
    type: '',
    message: '',
  });

  const [images, setImages] = useState([]);

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    price: '',
    originalPrice: '',
    categoryId: '',
    stock: '100',
    seller: 'RK Peedika',
    codPrice: '',
    onlinePrice: '',
    onlineDiscount: '',
    enableOnlineDiscount: true,
    codAvailable: true,
    inStock: true,
    estimatedDeliveryDays: '3',
    description: '',
    highlights: '',
    specifications: '{}',
    variants: '{}',
    relatedProducts: '',
    showPurchaseCount: true,
    purchaseCountMode: 'auto',
    purchaseCount: '',
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  function showStatus(type, message) {
    setStatus({
      type,
      message,
    });

    window.setTimeout(() => {
      setStatus({
        type: '',
        message: '',
      });
    }, 5000);
  }

  async function loadProducts() {
    try {
      setLoading(true);

      const response = await apiClient.get('/products');

      const data = response.data;

      let list = [];

      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data?.products)) {
        list = data.products;
      } else if (Array.isArray(data?.data)) {
        list = data.data;
      }

      setProducts(list);
    } catch (error) {
      console.error(error);

      showStatus(
        'error',
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to load products.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await apiClient.get('/categories');

      const data = response.data;

      let list = [];

      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data?.categories)) {
        list = data.categories;
      } else if (Array.isArray(data?.data)) {
        list = data.data;
      }

      setCategories(
        list.filter(
          (category) =>
            category?.id &&
            category?.name
        )
      );
    } catch (error) {
      console.error(error);

      showStatus(
        'error',
        'Failed to load product categories.'
      );
    }
  }

  function resetForm() {
    setForm({
      name: '',
      tagline: '',
      price: '',
      originalPrice: '',
      categoryId:
        categories[0]?.id
          ? String(categories[0].id)
          : '',
      stock: '100',
      seller: 'RK Peedika',
      codPrice: '',
      onlinePrice: '',
      onlineDiscount: '',
      enableOnlineDiscount: true,
      codAvailable: true,
      inStock: true,
      estimatedDeliveryDays: '3',
      description: '',
      highlights: '',
      specifications: '{}',
      variants: '{}',
      relatedProducts: '',
      showPurchaseCount: true,
      purchaseCountMode: 'auto',
      purchaseCount: '',
    });

    setImages([]);
  }

  function openAddModal() {
    setEditingProduct(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);

    const productImages = parseJson(
      product.images,
      []
    );

    const highlights = parseJson(
      product.highlights,
      []
    );

    const specifications = parseJson(
      product.specifications,
      {}
    );

    const variants = parseJson(
      product.variants,
      {}
    );

    const relatedProducts = parseJson(
      product.relatedProducts,
      []
    );

    setForm({
      name: makeShortProductName(
        product.name || ''
      ),

      tagline: product.tagline || '',

      price: product.price ?? '',

      originalPrice:
        product.originalPrice ?? '',

      categoryId: product.categoryId
        ? String(product.categoryId)
        : categories[0]?.id
          ? String(categories[0].id)
          : '',

      stock: product.stock ?? 0,

      seller:
        product.seller || 'RK Peedika',

      codPrice:
        product.codPrice ?? '',

      onlinePrice:
        product.onlinePrice ?? '',

      onlineDiscount:
        product.onlineDiscount ?? '',

      enableOnlineDiscount:
        product.enableOnlineDiscount !== false,

      codAvailable:
        product.codAvailable !== false,

      inStock:
        product.inStock !== false,

      estimatedDeliveryDays:
        product.estimatedDeliveryDays ?? 3,

      description:
        product.description || '',

      highlights:
        Array.isArray(highlights)
          ? highlights.join('\n')
          : '',

      specifications:
        JSON.stringify(
          specifications || {},
          null,
          2
        ),

      variants:
        JSON.stringify(
          variants || {},
          null,
          2
        ),

      relatedProducts:
        Array.isArray(relatedProducts)
          ? relatedProducts.join(', ')
          : '',

      showPurchaseCount:
        product.showPurchaseCount !== false,

      purchaseCountMode:
        product.purchaseCountMode || 'auto',

      purchaseCount:
        product.purchaseCount ?? '',
    });

    setImages(
      Array.isArray(productImages)
        ? productImages.map((image) => ({
          url: getImageUrl(image),
          storedUrl:
            typeof image === 'object'
              ? image.url
              : image,
          preview: getImageUrl(image),
        }))
        : []
    );

    setModalOpen(true);
  }

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /**
   * Upload images to backend.
   */
  async function handleImageUpload(event) {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    if (images.length + files.length > 8) {
      showStatus(
        'error',
        'You can upload maximum 8 images per product.'
      );
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showStatus(
          'error',
          `${file.name} is not a valid image.`
        );
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        showStatus(
          'error',
          `${file.name} is larger than 8MB.`
        );
        return;
      }
    }

    try {
      setUploading(true);

      const formData = new FormData();

      files.forEach((file) => {
        formData.append('images', file);
      });

      const response =
        await apiClient.post(
          '/uploads/product-images',
          formData,
          {
            headers: {
              'Content-Type':
                'multipart/form-data',
            },
          }
        );

      const uploaded =
        response.data?.images || [];

      const newImages = uploaded.map(
        (image) => ({
          url: image.url,
          storedUrl: image.url,
          preview: image.url,
        })
      );

      setImages((current) => [
        ...current,
        ...newImages,
      ]);

      showStatus(
        'success',
        `${newImages.length} image${newImages.length > 1 ? 's' : ''
        } uploaded successfully.`
      );
    } catch (error) {
      console.error(
        'Image upload failed:',
        error
      );

      showStatus(
        'error',
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Image upload failed.'
      );
    } finally {
      setUploading(false);

      event.target.value = '';
    }
  }

  function removeImage(index) {
    setImages((current) =>
      current.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!form.categoryId) {
      showStatus(
        'error',
        'Please select a category.'
      );
      return;
    }

    const cleanName =
      makeShortProductName(form.name);

    if (!cleanName) {
      showStatus(
        'error',
        'Please enter a product name.'
      );
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      showStatus(
        'error',
        'Please enter a valid price.'
      );
      return;
    }

    if (images.length === 0) {
      showStatus(
        'error',
        'Please upload at least one product image.'
      );
      return;
    }

    let specifications = {};
    let variants = {};

    try {
      specifications = JSON.parse(
        form.specifications || '{}'
      );

      variants = JSON.parse(
        form.variants || '{}'
      );
    } catch {
      showStatus(
        'error',
        'Specifications or variants contain invalid JSON.'
      );
      return;
    }

    const imageUrls = images
      .map(
        (image) =>
          image.storedUrl ||
          image.url
      )
      .filter(Boolean);

    const highlights = form.highlights
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const relatedProducts =
      form.relatedProducts
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const payload = {
      name: cleanName,

      tagline:
        form.tagline ||
        `${cleanName} for everyday use.`,

      description: form.description,

      price: Number(form.price),

      originalPrice:
        form.originalPrice === ''
          ? null
          : Number(form.originalPrice),

      categoryId:
        String(form.categoryId),

      stock:
        form.stock === ''
          ? 0
          : Number(form.stock),

      seller:
        form.seller || 'RK Peedika',

      images: imageUrls,

      codPrice:
        form.codPrice === ''
          ? null
          : Number(form.codPrice),

      onlinePrice:
        form.onlinePrice === ''
          ? null
          : Number(form.onlinePrice),

      onlineDiscount:
        form.onlineDiscount === ''
          ? null
          : Number(form.onlineDiscount),

      enableOnlineDiscount:
        Boolean(
          form.enableOnlineDiscount
        ),

      codAvailable:
        Boolean(form.codAvailable),

      inStock:
        Boolean(form.inStock),

      estimatedDeliveryDays:
        Number(
          form.estimatedDeliveryDays || 3
        ),

      highlights,

      specifications,

      variants,

      relatedProducts,

      showPurchaseCount:
        Boolean(form.showPurchaseCount),

      purchaseCountMode:
        form.purchaseCountMode,

      purchaseCount:
        form.purchaseCount === ''
          ? null
          : Number(form.purchaseCount),
    };

    try {
      setSaving(true);

      if (editingProduct) {
        await apiClient.put(
          `/products/${editingProduct.id}`,
          payload
        );

        showStatus(
          'success',
          'Product updated successfully.'
        );
      } else {
        await apiClient.post(
          '/products',
          payload
        );

        showStatus(
          'success',
          'Product published successfully.'
        );
      }

      setModalOpen(false);
      setEditingProduct(null);

      await loadProducts();
    } catch (error) {
      console.error(
        'Product save failed:',
        error
      );

      showStatus(
        'error',
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to save product.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this product?'
      );

    if (!confirmed) return;

    try {
      await apiClient.delete(
        `/products/${id}`
      );

      showStatus(
        'success',
        'Product deleted successfully.'
      );

      await loadProducts();
    } catch (error) {
      console.error(
        'Delete failed:',
        error
      );

      showStatus(
        'error',
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to delete product.'
      );
    }
  }

  const filteredProducts =
    useMemo(() => {
      const query =
        search.toLowerCase().trim();

      if (!query) return products;

      return products.filter(
        (product) => {
          const name =
            String(
              product.name || ''
            ).toLowerCase();

          const category =
            String(
              product.category?.name ||
              product.category ||
              ''
            ).toLowerCase();

          return (
            name.includes(query) ||
            category.includes(query)
          );
        }
      );
    }, [products, search]);

  const columns = [
    {
      key: 'id',
      label: 'SKU ID',
      sortable: true,
    },

    {
      key: 'name',
      label: 'Product Name',
      sortable: true,

      render: (row) => (
        <div className="max-w-[220px]">
          <div className="font-bold text-gray-900">
            {makeShortProductName(
              row.name
            )}
          </div>
        </div>
      ),
    },

    {
      key: 'category',
      label: 'Category',

      render: (row) => (
        <span>
          {row.category?.name ||
            row.category ||
            'General'}
        </span>
      ),
    },

    {
      key: 'price',
      label: 'Pricing',

      render: (row) => (
        <div className="flex flex-col text-[10px]">
          <span className="font-bold">
            Base: ₹{row.price}
          </span>

          {row.codPrice && (
            <span className="text-gray-400">
              COD: ₹{row.codPrice}
            </span>
          )}

          {row.onlinePrice && (
            <span className="text-emerald-600">
              Online: ₹
              {row.onlinePrice}
            </span>
          )}
        </div>
      ),
    },

    {
      key: 'stock',
      label: 'Stock',

      render: (row) => (
        <span
          className={
            row.stock <= 5
              ? 'font-bold text-red-500'
              : 'font-bold text-gray-700'
          }
        >
          {row.stock}
        </span>
      ),
    },

    {
      key: 'images',
      label: 'Image',

      render: (row) => {
        const rowImages =
          parseJson(
            row.images,
            []
          );

        const image =
          Array.isArray(rowImages)
            ? rowImages[0]
            : null;

        return image ? (
          <img
            src={getImageUrl(image)}
            alt={row.name}
            className="h-12 w-12 rounded-lg object-cover border"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
            <ImagePlus className="h-4 w-4 text-gray-400" />
          </div>
        );
      },
    },

    {
      key: 'actions',
      label: 'Options',

      render: (row) => (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() =>
              openEditModal(row)
            }
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-[#F7941D]"
          >
            <Edit className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() =>
              deleteProduct(row.id)
            }
            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">
            Products Catalog
          </h2>

          <p className="text-xs text-gray-400 font-semibold mt-1">
            Manage products, images, pricing and stock.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          disabled={
            categories.length === 0
          }
          className="flex items-center justify-center gap-2 rounded-xl bg-[#F7941D] px-5 py-3 text-xs font-bold text-white shadow hover:bg-[#E07D10] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add New Product
        </button>
      </div>

      {/* STATUS */}
      {status.message && (
        <div
          className={`rounded-xl border p-4 flex items-center gap-2 text-xs font-bold ${status.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
            }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}

          {status.message}
        </div>
      )}

      {/* SEARCH */}
      <div className="flex items-center max-w-md rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-sm">
        <Search className="h-4 w-4 text-gray-400 mr-2" />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search products..."
          className="w-full bg-transparent outline-none text-xs"
        />
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-[#F7941D]" />
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredProducts}
          itemsPerPage={10}
          emptyMessage="No products found."
        />
      )}

      {/* PRODUCT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">

          <div className="w-full max-w-3xl max-h-[95vh] overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {editingProduct
                    ? 'Edit Product'
                    : 'Add Product'}
                </h3>

                <p className="text-[11px] text-gray-400 mt-1">
                  Product names are automatically kept short.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(false)
                }
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={saveProduct}
              className="max-h-[calc(95vh-80px)] overflow-y-auto p-6 space-y-6"
            >

              {/* BASIC */}
              <section>
                <h4 className="text-sm font-black mb-3">
                  Basic Information
                </h4>

                <div className="grid md:grid-cols-2 gap-4">

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400">
                      Product Name *
                    </label>

                    <input
                      value={form.name}
                      onChange={(e) =>
                        updateField(
                          'name',
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        updateField(
                          'name',
                          makeShortProductName(
                            form.name
                          )
                        )
                      }
                      placeholder="Stainless Steel Sink Sponge Holder"
                      className="mt-1 w-full rounded-xl border px-3 py-3 text-xs outline-none focus:border-[#F7941D]"
                    />

                    <div className="text-[10px] text-gray-400 mt-1">
                      Maximum 6 words
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400">
                      Category *
                    </label>

                    <select
                      value={form.categoryId}
                      onChange={(e) =>
                        updateField(
                          'categoryId',
                          e.target.value
                        )
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-3 text-xs outline-none focus:border-[#F7941D]"
                    >
                      <option value="">
                        Select category
                      </option>

                      {categories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={String(
                              category.id
                            )}
                          >
                            {category.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                </div>

                <div className="mt-4">
                  <label className="text-[10px] font-bold uppercase text-gray-400">
                    Short Description
                  </label>

                  <input
                    value={form.tagline}
                    onChange={(e) =>
                      updateField(
                        'tagline',
                        e.target.value
                      )
                    }
                    placeholder="Durable kitchen sink organizer"
                    className="mt-1 w-full rounded-xl border px-3 py-3 text-xs outline-none focus:border-[#F7941D]"
                  />
                </div>
              </section>

              {/* IMAGE UPLOAD */}
              <section className="border-t pt-5">

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-black">
                      Product Images
                    </h4>

                    <p className="text-[10px] text-gray-400">
                      Upload up to 8 images. Maximum 8MB each.
                    </p>
                  </div>

                  <label
                    className={`cursor-pointer flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white ${uploading
                        ? 'bg-gray-400'
                        : 'bg-[#F7941D] hover:bg-[#E07D10]'
                      }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Images
                      </>
                    )}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                      multiple
                      disabled={uploading}
                      onChange={
                        handleImageUpload
                      }
                      className="hidden"
                    />
                  </label>
                </div>

                {images.length === 0 ? (
                  <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 cursor-pointer hover:border-[#F7941D] hover:bg-orange-50">

                    <ImagePlus className="h-10 w-10 text-gray-300" />

                    <p className="mt-2 text-xs font-bold text-gray-500">
                      Click to upload product images
                    </p>

                    <p className="text-[10px] text-gray-400">
                      JPG, PNG, WEBP or AVIF
                    </p>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={
                        handleImageUpload
                      }
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                    {images.map(
                      (image, index) => (
                        <div
                          key={`${image.url}-${index}`}
                          className="relative group aspect-square rounded-xl overflow-hidden border bg-gray-50"
                        >
                          <img
                            src={image.preview}
                            alt={`Product ${index + 1}`}
                            className="h-full w-full object-cover"
                          />

                          {index === 0 && (
                            <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[9px] font-bold text-white">
                              MAIN
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              removeImage(
                                index
                              )
                            }
                            className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    )}

                  </div>
                )}

              </section>

              {/* PRICING */}
              <section className="border-t pt-5">

                <h4 className="text-sm font-black mb-3">
                  Pricing & Stock
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  <Field
                    label="Selling Price *"
                    type="number"
                    value={form.price}
                    onChange={(value) =>
                      updateField(
                        'price',
                        value
                      )
                    }
                  />

                  <Field
                    label="Original MRP"
                    type="number"
                    value={
                      form.originalPrice
                    }
                    onChange={(value) =>
                      updateField(
                        'originalPrice',
                        value
                      )
                    }
                  />

                  <Field
                    label="COD Price"
                    type="number"
                    value={form.codPrice}
                    onChange={(value) =>
                      updateField(
                        'codPrice',
                        value
                      )
                    }
                  />

                  <Field
                    label="Online Price"
                    type="number"
                    value={form.onlinePrice}
                    onChange={(value) =>
                      updateField(
                        'onlinePrice',
                        value
                      )
                    }
                  />

                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">

                  <Field
                    label="Stock"
                    type="number"
                    value={form.stock}
                    onChange={(value) =>
                      updateField(
                        'stock',
                        value
                      )
                    }
                  />

                  <Field
                    label="Online Discount"
                    type="number"
                    value={
                      form.onlineDiscount
                    }
                    onChange={(value) =>
                      updateField(
                        'onlineDiscount',
                        value
                      )
                    }
                  />

                  <Field
                    label="Delivery Days"
                    type="number"
                    value={
                      form.estimatedDeliveryDays
                    }
                    onChange={(value) =>
                      updateField(
                        'estimatedDeliveryDays',
                        value
                      )
                    }
                  />

                  <Field
                    label="Seller"
                    value={form.seller}
                    onChange={(value) =>
                      updateField(
                        'seller',
                        value
                      )
                    }
                  />

                </div>

              </section>

              {/* OPTIONS */}
              <section className="border-t pt-5">

                <h4 className="text-sm font-black mb-3">
                  Product Options
                </h4>

                <div className="flex flex-wrap gap-5 text-xs font-bold">

                  <Checkbox
                    label="COD Available"
                    checked={
                      form.codAvailable
                    }
                    onChange={(value) =>
                      updateField(
                        'codAvailable',
                        value
                      )
                    }
                  />

                  <Checkbox
                    label="Online Discount"
                    checked={
                      form.enableOnlineDiscount
                    }
                    onChange={(value) =>
                      updateField(
                        'enableOnlineDiscount',
                        value
                      )
                    }
                  />

                  <Checkbox
                    label="In Stock"
                    checked={
                      form.inStock
                    }
                    onChange={(value) =>
                      updateField(
                        'inStock',
                        value
                      )
                    }
                  />

                  <Checkbox
                    label="Show Purchase Count"
                    checked={
                      form.showPurchaseCount
                    }
                    onChange={(value) =>
                      updateField(
                        'showPurchaseCount',
                        value
                      )
                    }
                  />

                </div>

              </section>

              {/* DESCRIPTION */}
              <section className="border-t pt-5">

                <h4 className="text-sm font-black mb-3">
                  Product Details
                </h4>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    updateField(
                      'description',
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="Describe the product..."
                  className="w-full rounded-xl border px-3 py-3 text-xs outline-none focus:border-[#F7941D]"
                />

                <textarea
                  value={form.highlights}
                  onChange={(e) =>
                    updateField(
                      'highlights',
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder={
                    'Highlights, one per line\nStainless steel\nRust resistant\nEasy installation'
                  }
                  className="mt-3 w-full rounded-xl border px-3 py-3 text-xs outline-none focus:border-[#F7941D]"
                />

              </section>

              {/* JSON */}
              <section className="border-t pt-5">

                <div className="grid md:grid-cols-2 gap-4">

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400">
                      Specifications JSON
                    </label>

                    <textarea
                      value={
                        form.specifications
                      }
                      onChange={(e) =>
                        updateField(
                          'specifications',
                          e.target.value
                        )
                      }
                      rows={6}
                      className="mt-1 w-full rounded-xl border px-3 py-3 text-xs font-mono outline-none focus:border-[#F7941D]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400">
                      Variants JSON
                    </label>

                    <textarea
                      value={form.variants}
                      onChange={(e) =>
                        updateField(
                          'variants',
                          e.target.value
                        )
                      }
                      rows={6}
                      className="mt-1 w-full rounded-xl border px-3 py-3 text-xs font-mono outline-none focus:border-[#F7941D]"
                    />
                  </div>

                </div>

              </section>

              {/* BUTTONS */}
              <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setModalOpen(false)
                  }
                  className="rounded-xl border px-5 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    uploading
                  }
                  className="flex items-center gap-2 rounded-xl bg-[#F7941D] px-6 py-3 text-xs font-bold text-white hover:bg-[#E07D10] disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {saving
                    ? 'Saving...'
                    : editingProduct
                      ? 'Save Changes'
                      : 'Publish Product'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable field.
 */
function Field({
  label,
  type = 'text',
  value,
  onChange,
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase text-gray-400">
        {label}
      </label>

      <input
        type={type}
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="mt-1 w-full rounded-xl border px-3 py-3 text-xs outline-none focus:border-[#F7941D]"
      />
    </div>
  );
}

/**
 * Checkbox.
 */
function Checkbox({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
        className="h-4 w-4 accent-[#F7941D]"
      />

      {label}
    </label>
  );
}