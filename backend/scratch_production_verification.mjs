import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runVerification() {
  console.log('🧪 Starting Production Readiness Verification Tests...');

  // 1. Check Store Settings
  console.log('\n1. Verifying Public Store Settings...');
  try {
    const settingsRes = await axios.get(`${BASE_URL}/settings`);
    if (settingsRes.data && settingsRes.data.status === 'success') {
      const settings = settingsRes.data.data;
      console.log(`✔ Store Settings loaded. Brand: "${settings.storeName}", Support Phone: "${settings.supportPhone}"`);
      if (settings.storeName !== 'RK Peedika') {
        throw new Error(`Invalid brand name: ${settings.storeName}`);
      }
    } else {
      throw new Error('Failed to load store settings.');
    }
  } catch (err) {
    console.error('❌ Store Settings check failed:', err.message);
    process.exit(1);
  }

  // 2. Verify Storefront is empty (0 products, 0 categories)
  console.log('\n2. Verifying Storefront Empty State...');
  try {
    const productsRes = await axios.get(`${BASE_URL}/products`);
    console.log(`✔ Products count: ${productsRes.data.length} (Expected: 0)`);
    if (productsRes.data.length !== 0) {
      throw new Error('Database contains products. Expected clean production start.');
    }

    const categoriesRes = await axios.get(`${BASE_URL}/categories`);
    console.log(`✔ Categories count: ${categoriesRes.data.length} (Expected: 0)`);
    if (categoriesRes.data.length !== 0) {
      throw new Error('Database contains categories. Expected clean production start.');
    }
  } catch (err) {
    console.error('❌ Storefront empty state check failed:', err.message);
    process.exit(1);
  }

  // 3. Login as Admin
  console.log('\n3. Authenticating Administrator...');
  let adminToken = '';
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'rikkas.aboo@gmail.com',
      password: '9188072646'
    });
    if (loginRes.data && loginRes.data.success) {
      adminToken = loginRes.data.token; // Already prefixed with 'Bearer '
      console.log('✔ Authenticated successfully as Admin.');
    } else {
      throw new Error('Admin login failed.');
    }
  } catch (err) {
    console.error('❌ Admin authentication failed:', err.message);
    process.exit(1);
  }

  const authHeaders = { headers: { Authorization: adminToken } };

  // 4. Verify Dashboard KPIs
  console.log('\n4. Verifying Dashboard KPIs...');
  try {
    const kpiRes = await axios.get(`${BASE_URL}/admin/dashboard`, authHeaders);
    if (kpiRes.data && kpiRes.data.success) {
      const metrics = kpiRes.data.metrics;
      console.log(`✔ Metrics: Revenue: ${metrics.totalRevenue}, Orders: ${metrics.totalOrders}, Customers: ${metrics.totalCustomers}, Low Stock Alerts: ${metrics.lowStockAlerts}`);
      if (metrics.totalRevenue !== '₹0' || metrics.totalOrders !== 0 || metrics.totalCustomers !== 0) {
        throw new Error('Dashboard KPIs are not zero.');
      }
    } else {
      throw new Error('Failed to load KPIs.');
    }
  } catch (err) {
    console.error('❌ KPI verification failed:', err.message);
    process.exit(1);
  }

  // 5. Verify Dashboard Charts
  console.log('\n5. Verifying Analytics Charts...');
  try {
    const analyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, authHeaders);
    if (analyticsRes.data && analyticsRes.data.success) {
      const trends = analyticsRes.data.weeklySalesTrend;
      const categoriesDistribution = analyticsRes.data.categoryDistribution;
      console.log(`✔ Weekly sales trend days count: ${trends.length}`);
      console.log(`✔ Category distribution segments count: ${categoriesDistribution.length}`);
      
      const totalTrendSales = trends.reduce((sum, day) => sum + day.Sales, 0);
      const totalCatOrders = categoriesDistribution.reduce((sum, cat) => sum + cat.Orders, 0);
      
      console.log(`✔ Combined sales trend value: ₹${totalTrendSales} (Expected: 0)`);
      console.log(`✔ Combined categories orders: ${totalCatOrders} (Expected: 0)`);
      
      if (totalTrendSales !== 0 || totalCatOrders !== 0) {
        throw new Error('Charts contain non-zero data values.');
      }
    } else {
      throw new Error('Failed to load analytics.');
    }
  } catch (err) {
    console.error('❌ Analytics verification failed:', err.message);
    process.exit(1);
  }

  // 6. Test Product / Category Creation Flow
  console.log('\n6. Testing Category & Product Creation Flow...');
  try {
    // A. Create Category
    const catRes = await axios.post(`${BASE_URL}/categories`, {
      name: 'Temp Test Category',
      description: 'Temporary verification category'
    }, authHeaders);
    const categoryId = catRes.data.category.id;
    console.log(`✔ Created Category: "${catRes.data.category.name}" (ID: ${categoryId})`);

    // B. Create Product
    const prodRes = await axios.post(`${BASE_URL}/products`, {
      name: 'Test Production Readiness Product',
      tagline: 'Readiness check',
      description: 'Temporary testing product details',
      price: 500,
      originalPrice: 750,
      categoryId: categoryId,
      stock: 10,
      seller: 'RK Test Fulfillment'
    }, authHeaders);
    const productId = prodRes.data.product.id;
    console.log(`✔ Created Product: "${prodRes.data.product.name}" (ID: ${productId})`);

    // C. Verify on Storefront
    const storeProducts = await axios.get(`${BASE_URL}/products`);
    console.log(`✔ Storefront check: found ${storeProducts.data.length} active products.`);
    if (storeProducts.data.length !== 1 || storeProducts.data[0].id !== productId) {
      throw new Error('Product failed to show up on storefront.');
    }

    // D. Clean up (delete product & category)
    await axios.delete(`${BASE_URL}/products/${productId}`, authHeaders);
    console.log('✔ Product cleaned up successfully.');

    await axios.delete(`${BASE_URL}/categories/${categoryId}`, authHeaders);
    console.log('✔ Category cleaned up successfully.');

    // E. Verify storefront is empty again
    const finalStoreProducts = await axios.get(`${BASE_URL}/products`);
    if (finalStoreProducts.data.length !== 0) {
      throw new Error('Final cleanup failed: products still exist.');
    }
    console.log('✔ Verified database is clean and empty again.');

  } catch (err) {
    console.error('❌ Creation/deletion flow test failed:', err.response?.data?.message || err.message);
    process.exit(1);
  }

  console.log('\n🎉 ALL PRODUCTION READINESS VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runVerification();
