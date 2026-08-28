import React, { useContext, useState, Suspense, useEffect } from 'react';
import { AppContext, AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import apiClient from './api/client';
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ProductPage = React.lazy(() => import('./pages/ProductPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const SuccessPage = React.lazy(() => import('./pages/SuccessPage'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const CustomerDashboard = React.lazy(() => import('./pages/CustomerDashboard'));
const PaymentFailedPage = React.lazy(() => import('./pages/PaymentFailedPage'));
const OrderTrackingPage = React.lazy(() => import('./pages/OrderTrackingPage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const CategoriesPage = React.lazy(() => import('./pages/CategoriesPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const OrdersPage = React.lazy(() => import('./pages/OrdersPage'));
const WishlistPage = React.lazy(() => import('./pages/WishlistPage'));
import { Mail, ShieldCheck, Landmark, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const SessionTimeoutHandler = React.lazy(() => import('./components/SessionTimeoutHandler'));
const PopupDialog = React.lazy(() => import('./components/PopupDialog'));
const CookieConsent = React.lazy(() => import('./components/CookieConsent'));


// Custom Brand SVG Icons
const InstagramIcon = () => (
  <svg className="h-5 w-5 stroke-[1.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-5 w-5 stroke-[1.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

// Page skeleton shown while lazy-loaded chunks are downloading
const PageSkeleton = () => (
  <div className="w-full px-4 py-4 space-y-4 animate-pulse">
    <div className="flex gap-2 overflow-hidden">
      {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-20 rounded-full bg-gray-100 shrink-0" />)}
    </div>
    <div className="h-28 md:h-44 rounded-2xl bg-gray-100" />
    <div className="grid grid-cols-2 gap-3 mt-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="rounded-xl bg-white border border-[#EDEDED] overflow-hidden">
          <div className="h-40 bg-gray-100" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-5 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

function AppContent() {
  const { currentView, setCurrentView, storeSettings, activeToast, categories, setSelectedCategory } = useContext(AppContext);

  // Wake up Render backend immediately on mount — prevents 30-90s cold start
  // by firing a cheap HEAD request before the real data fetches
  useEffect(() => {
    const warmUpBackend = async () => {
      try {
        await fetch('https://rkpeedika.onrender.com/api/health', {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        });
      } catch {
        // Silent — this is just a warm-up, failure is fine
      }
    };
    warmUpBackend();
  }, []);

  // Track Meta Pixel PageView on route changes
  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [currentView]);

  // Modal State
  const [activeModal, setActiveModal] = useState(null); // 'about', 'terms', 'privacy', 'returns'

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [newsletterMsg, setNewsletterMsg] = useState({ type: '', text: '' });

  // Exchange Form State
  const [exchangeForm, setExchangeForm] = useState({ orderId: '', customerName: '', phone: '', reason: '', notes: '' });
  const [exchangeImages, setExchangeImages] = useState([]);
  const [isExchangeSubmitting, setIsExchangeSubmitting] = useState(false);
  const [exchangeMsg, setExchangeMsg] = useState({ type: '', text: '' });

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setIsSubscribing(true);
    setNewsletterMsg({ type: '', text: '' });
    
    try {
      const res = await apiClient.post('/newsletter/subscribe', { email: newsletterEmail });
      const data = res.data;
      
      if (res.status === 200 || res.status === 201 || data.success) {
        setNewsletterMsg({ type: 'success', text: data.message || 'Successfully subscribed!' });
        setNewsletterEmail('');
      } else {
        setNewsletterMsg({ type: 'error', text: data.message || 'Subscription failed.' });
      }
    } catch (err) {
      setNewsletterMsg({ type: 'error', text: err.response?.data?.message || 'Network error. Please try again.' });
    }
    setIsSubscribing(false);
    setTimeout(() => setNewsletterMsg({ type: '', text: '' }), 5000);
  };

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();
    if (exchangeImages.length === 0) {
      setExchangeMsg({ type: 'error', text: 'Please upload at least one image.' });
      return;
    }
    
    setIsExchangeSubmitting(true);
    setExchangeMsg({ type: '', text: '' });

    const formData = new FormData();
    formData.append('orderId', exchangeForm.orderId);
    formData.append('customerName', exchangeForm.customerName);
    formData.append('phone', exchangeForm.phone);
    formData.append('reason', exchangeForm.reason);
    formData.append('notes', exchangeForm.notes);
    
    exchangeImages.forEach(file => {
      formData.append('images', file);
    });

    try {
      const res = await apiClient.post('/exchanges', formData, {
        timeout: 60000
      });
      const data = res.data;
      
      if (res.status === 200 || res.status === 201 || data.success) {
        setExchangeMsg({ type: 'success', text: 'Exchange request submitted successfully.' });
        setExchangeForm({ orderId: '', customerName: '', phone: '', reason: '', notes: '' });
        setExchangeImages([]);
      } else {
        setExchangeMsg({ type: 'error', text: data.message || 'Submission failed.' });
      }
    } catch (err) {
      setExchangeMsg({ type: 'error', text: err.response?.data?.message || 'Network error. Please try again.' });
    }
    setIsExchangeSubmitting(false);
  };

  const closeModal = () => {
    setActiveModal(null);
    setExchangeMsg({ type: '', text: '' });
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'about':
        return (
          <div className="space-y-4 text-sm text-gray-600">
            <h2 className="text-xl font-bold text-charcoal">About Us</h2>
            <p>Welcome to RK Peedika.</p>
            <p>RK Peedika is an Indian online shopping platform focused on bringing useful everyday products, trending gadgets, fashion accessories, home essentials, beauty products, kitchen items, and problem-solving products at affordable prices.</p>
            <p>We carefully select products from trusted suppliers to provide quality items and a smooth shopping experience.</p>
            <p>Our goal is to make online shopping simple, affordable, and trustworthy for everyone.</p>
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-5 text-sm text-gray-600 max-h-[70vh] overflow-y-auto pr-2">
            <h2 className="text-xl font-bold text-charcoal">Terms & Conditions</h2>
            <p className="text-xs text-gray-400">Last Updated: August 2026</p>
            <p>Welcome to RK Peedika. By accessing or using our website and services, you agree to be bound by the following Terms & Conditions. Please read them carefully before placing an order.</p>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">1. Account Registration</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>You must provide a valid Indian mobile number to register and log in via OTP verification.</li>
                <li>You are responsible for maintaining the confidentiality of your account and all activities under it.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.</li>
                <li>You must be at least 18 years of age to use our services, or have parental/guardian consent.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">2. Product Listings & Pricing</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>All product descriptions, images, and specifications are provided in good faith. Minor variations may occur.</li>
                <li>Prices displayed are in Indian Rupees (₹) and may vary between Cash on Delivery and Online Payment methods.</li>
                <li>We reserve the right to modify prices, discontinue products, or correct pricing errors at any time without prior notice.</li>
                <li>Promotional discounts and coupon codes are subject to specific terms, minimum purchase requirements, and expiry dates.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">3. Orders & Payment</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Placing an order constitutes an offer to purchase. We reserve the right to accept or reject any order at our discretion.</li>
                <li><strong>Cash on Delivery (COD):</strong> Pay the delivery person in cash upon receiving your order. COD prices may differ from online prices.</li>
                <li><strong>Online Payment:</strong> Secure payment via Razorpay. Additional online discounts may apply as advertised.</li>
                <li>Order confirmation is sent after successful placement. Fulfillment is subject to stock availability.</li>
                <li>Orders cannot be modified once placed. Cancellation is possible only before the order is shipped.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">4. Shipping & Delivery</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>We deliver to serviceable pin codes across India. Delivery availability is verified at checkout.</li>
                <li>Standard shipping typically takes 3–7 business days. Express shipping (where available) takes 1–3 business days.</li>
                <li>Shipping charges, if applicable, are clearly displayed at checkout before order confirmation.</li>
                <li>Delivery timelines are estimates and may vary due to unforeseen circumstances, weather, or logistic delays.</li>
                <li>Risk of loss and title for items pass to you upon delivery to the shipping carrier.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">5. Exchange Policy</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Exchange is available <strong>only</strong> if the product is damaged, the wrong product is delivered, there is a quantity issue, or the product is defected.</li>
                <li>To apply for an exchange, you must share a video of the product showing the damage. The product and the problem must be fully visible in the video.</li>
                <li>Please share the video via WhatsApp to our support number: <strong>9188072646</strong>.</li>
                <li><strong>Exchanges only — no refunds</strong>. Exchange requests must be raised within {storeSettings?.returnWindow || 3} days of delivery.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">6. Intellectual Property</h3>
              <p className="text-xs">All content on this website — including text, graphics, logos, product images, UI design, and software — is the property of RK Peedika or its content suppliers and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our written consent.</p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">7. User Conduct</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>You agree not to use the platform for any unlawful purpose or in violation of any applicable laws.</li>
                <li>Submitting false information, fraudulent orders, or fake reviews is strictly prohibited.</li>
                <li>Any attempt to interfere with the platform's security or functionality may result in legal action.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">8. Limitation of Liability</h3>
              <p className="text-xs">RK Peedika shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services, including but not limited to loss of data, revenue, or profits. Our total liability is limited to the amount paid for the specific product or service in question.</p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">9. Governing Law & Disputes</h3>
              <p className="text-xs">These Terms & Conditions are governed by the laws of India. Any disputes arising from the use of this platform shall be subject to the exclusive jurisdiction of the courts in Kasaragod, Kerala, India.</p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">10. Changes to Terms</h3>
              <p className="text-xs">We reserve the right to update or modify these Terms & Conditions at any time. Changes will be posted on this page with an updated revision date. Continued use of the platform after changes constitutes your acceptance of the revised terms.</p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">11. Contact Us</h3>
              <p className="text-xs">For questions regarding these Terms & Conditions, please contact us at:</p>
              <p className="text-xs"><strong>Email:</strong> rikkas.aboo@gmail.com</p>
              <p className="text-xs"><strong>WhatsApp:</strong> +91 9188072646</p>
              <p className="text-xs"><strong>Address:</strong> Kasaragod, Kerala, India - 671320</p>
            </div>

            <p className="text-[10px] text-gray-400 border-t pt-3 mt-4">By using RK Peedika, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions.</p>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-5 text-sm text-gray-600 max-h-[70vh] overflow-y-auto pr-2">
            <h2 className="text-xl font-bold text-charcoal">Privacy Policy</h2>
            <p className="text-xs text-gray-400">Last Updated: August 2026</p>
            <p>At RK Peedika, we are committed to protecting your personal information and your right to privacy. This Privacy Policy describes how we collect, use, and safeguard your data when you use our website and services.</p>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">1. Information We Collect</h3>
              <p>We collect information that you voluntarily provide when you register, place an order, or contact us:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Personal Information:</strong> Name, phone number, email address, delivery address(es)</li>
                <li><strong>Order Information:</strong> Products purchased, order history, payment method chosen (COD / Online)</li>
                <li><strong>Device Information:</strong> Browser type, IP address, device identifiers, and cookies for analytics and session management</li>
                <li><strong>Communication Data:</strong> Messages, support queries, and exchange/return requests submitted via our platform or WhatsApp</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">2. How We Use Your Information</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>To process and fulfill your orders, including delivery and payment processing</li>
                <li>To communicate order updates, shipping notifications, and promotional offers</li>
                <li>To provide customer support and handle exchange/return requests</li>
                <li>To improve our website, product offerings, and overall shopping experience</li>
                <li>To detect, prevent, and address fraud, security issues, or technical problems</li>
                <li>To comply with applicable legal obligations and regulations</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">3. Data Sharing & Disclosure</h3>
              <p>We do not sell, rent, or trade your personal information to third parties. We may share your data only with:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Shipping Partners:</strong> To facilitate product delivery to your address</li>
                <li><strong>Payment Processors:</strong> To securely process online payments (we do not store your card details)</li>
                <li><strong>Legal Authorities:</strong> When required by law, regulation, or legal process</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">4. Cookies & Tracking</h3>
              <p className="text-xs">We use essential cookies to maintain your session, remember your login, and keep items in your cart. We may also use analytics cookies to understand usage patterns and improve our services. You can disable cookies in your browser settings, but some features may not work properly.</p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">5. Data Security</h3>
              <p className="text-xs">We implement industry-standard security measures including encrypted data transmission (SSL/TLS), secure authentication (OTP-based login), and access controls to protect your personal information. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">6. Data Retention</h3>
              <p className="text-xs">We retain your personal data for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account and associated data by contacting our support team.</p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">7. Your Rights</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Access, update, or correct your personal information through your account dashboard</li>
                <li>Request deletion of your personal data by contacting support</li>
                <li>Opt out of promotional communications at any time</li>
                <li>Withdraw consent for data processing where applicable</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-charcoal">8. Contact Us</h3>
              <p className="text-xs">If you have questions or concerns about this Privacy Policy, please contact us at:</p>
              <p className="text-xs"><strong>Email:</strong> rikkas.aboo@gmail.com</p>
              <p className="text-xs"><strong>WhatsApp:</strong> +91 9188072646</p>
              <p className="text-xs"><strong>Address:</strong> Kasaragod, Kerala, India - 671320</p>
            </div>

            <p className="text-[10px] text-gray-400 border-t pt-3 mt-4">By using RK Peedika, you acknowledge that you have read and understood this Privacy Policy and agree to the collection and use of your information as described herein.</p>
          </div>
        );
      case 'returns':
        return (
          <div className="space-y-4 text-sm text-gray-600">
            <h2 className="text-xl font-bold text-charcoal">Exchange Policy (5 Days)</h2>
            <div className="space-y-4 text-xs text-gray-600 leading-relaxed max-h-[40vh] overflow-y-auto pr-2 border-b pb-4">
              <p className="text-[10px] text-gray-400">Last Updated: August 2026</p>
              {storeSettings?.returnPolicy ? (
                <p className="whitespace-pre-line text-xs">{storeSettings.returnPolicy}</p>
              ) : (
                <>
                  <p>At RK Peedika, we strive to ensure a smooth and satisfying shopping experience. Since we focus on quality products at affordable prices, our exchange policy is designed to be fair and transparent.</p>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal text-xs">1. Exchange Policy (No Refunds)</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>We offer <strong>exchanges only</strong> within <strong>{storeSettings?.returnWindow || 3} days of delivery</strong> for eligible items.</li>
                      <li>We do not offer cash refunds unless a replacement for a damaged/wrong product is unavailable.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal text-xs">2. Eligibility for Exchanges</h4>
                    <p>To be eligible for an exchange, the product must meet the following criteria:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Must be completely unused, unwashed, and in its original condition.</li>
                      <li>Must have all original tags, labels, and packaging intact.</li>
                      <li>Exchanges are only accepted for sizing issues, damaged products, or incorrect items delivered.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal text-xs">3. Damaged or Defective Items</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Any damage or manufacturing defect must be reported within <strong>24 hours of delivery</strong>.</li>
                      <li><strong>Photo and video evidence</strong> of the packaging and product is mandatory to process damage claims.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal text-xs">4. Non-Exchangeable Items</h4>
                    <p>The following categories are strictly non-returnable and non-exchangeable due to hygiene and customization reasons:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Personal care, cosmetics, and hygiene products</li>
                      <li>Customized, personalized, or made-to-order items</li>
                      <li>Clearance sale items or products marked as final sale</li>
                      <li>Items without original tags, box, or documentation</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal text-xs">5. Exchange Process</h4>
                    <p>To request an exchange:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Raise a request via the exchange form below, your customer dashboard, or WhatsApp support (+91 9188072646).</li>
                      <li>Submit clear photographs of the product showing its unused status and tags.</li>
                      <li>Once approved, our delivery partner will pick up the package.</li>
                      <li>Upon quality inspection of the returned package, your replacement will be dispatched within <strong>3-5 business days</strong>.</li>
                    </ol>
                  </div>
                </>
              )}

              <div className="space-y-1.5 mt-4">
                <h4 className="font-bold text-charcoal text-xs">Contact Support</h4>
                <p>If you have any questions regarding your return/exchange, please contact us:</p>
                <p><strong>Email:</strong> {storeSettings?.supportEmail || "rikkas.aboo@gmail.com"} &nbsp;|&nbsp; <strong>WhatsApp:</strong> {storeSettings?.whatsappNumber || "+91 9188072646"}</p>
              </div>
            </div>
            
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-bold text-charcoal mb-4">Exchange Request Form</h3>
              {exchangeMsg.text && (
                <div className={`p-3 mb-4 rounded text-sm font-bold ${exchangeMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {exchangeMsg.text}
                </div>
              )}
              <form onSubmit={handleExchangeSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Order ID" required value={exchangeForm.orderId} onChange={e => setExchangeForm({...exchangeForm, orderId: e.target.value})} className="w-full border p-2 rounded text-sm outline-none focus:border-[#0B1B2B]" />
                  <input type="text" placeholder="Customer Name" required value={exchangeForm.customerName} onChange={e => setExchangeForm({...exchangeForm, customerName: e.target.value})} className="w-full border p-2 rounded text-sm outline-none focus:border-[#0B1B2B]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="tel" placeholder="Phone Number" required value={exchangeForm.phone} onChange={e => setExchangeForm({...exchangeForm, phone: e.target.value})} className="w-full border p-2 rounded text-sm outline-none focus:border-[#0B1B2B]" />
                  <input type="text" placeholder="Reason for Exchange" required value={exchangeForm.reason} onChange={e => setExchangeForm({...exchangeForm, reason: e.target.value})} className="w-full border p-2 rounded text-sm outline-none focus:border-[#0B1B2B]" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-charcoal">Upload Product Images (Mandatory)</label>
                  <input type="file" multiple accept="image/*" required onChange={e => setExchangeImages(Array.from(e.target.files))} className="w-full border p-2 rounded text-sm" />
                </div>
                <textarea placeholder="Additional Notes" value={exchangeForm.notes} onChange={e => setExchangeForm({...exchangeForm, notes: e.target.value})} className="w-full border p-2 rounded text-sm h-20 outline-none focus:border-[#0B1B2B]"></textarea>
                <button type="submit" disabled={isExchangeSubmitting} className="w-full bg-[#0B1B2B] text-white py-2 rounded font-bold hover:bg-[#071320] transition">
                  {isExchangeSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-4 text-sm text-gray-600">
            <h2 className="text-xl font-bold text-charcoal">Contact Us</h2>
            <p>For any queries, issues, or order updates, please reach out to us:</p>
            <div className="space-y-2.5 pt-2 text-xs font-semibold">
              <p>
                <strong>WhatsApp Helpline: </strong> 
                <a href="https://wa.me/919188072646" target="_blank" rel="noreferrer" className="text-[#0B1B2B] hover:underline font-bold">+91 9188072646</a>
              </p>
              <p>
                <strong>Helpline Phone: </strong> 
                <a href="tel:+919188072646" className="text-[#0B1B2B] hover:underline font-bold">+91 9188072646</a>
              </p>
              <p>
                <strong>Email Address: </strong> 
                <a href="mailto:rikkas.aboo@gmail.com" className="text-[#0B1B2B] hover:underline font-bold">rikkas.aboo@gmail.com</a>
              </p>
              <p>
                <strong>Business Address: </strong> 
                <span className="text-charcoal">{storeSettings?.businessAddress}</span>
              </p>
              <p>
                <strong>Support Hours: </strong> 
                <span className="text-charcoal">{storeSettings?.supportHours}</span>
              </p>
            </div>
          </div>
        );
      case 'faq':
        return (
          <div className="space-y-4 text-sm text-gray-600">
            <h2 className="text-xl font-bold text-charcoal">Frequently Asked Questions (FAQ)</h2>
            <div className="space-y-4 pt-2 text-xs">
              <div>
                <h4 className="font-bold text-charcoal">1. Is Cash on Delivery (COD) available?</h4>
                <p className="text-gray-500 mt-1">Yes, Cash on Delivery is available for most products and pincodes. You can verify availability at checkout.</p>
              </div>
              <div>
                <h4 className="font-bold text-charcoal">2. How long does shipping take?</h4>
                <p className="text-gray-500 mt-1">Standard shipping takes 3-5 business days. Express shipping options take 1-2 business days depending on location.</p>
              </div>
              <div>
                <h4 className="font-bold text-charcoal">3. What is the exchange policy?</h4>
                <p className="text-gray-500 mt-1">We offer a 5-day exchange policy for unused items in original packaging. Video evidence of the damaged, defective, or wrong item is strictly required via WhatsApp at +91 9188072646.</p>
              </div>
              <div>
                <h4 className="font-bold text-charcoal">4. Can I cancel my order?</h4>
                <p className="text-gray-500 mt-1">Yes, orders can be cancelled before they are shipped. Once shipped, cancellations are not allowed.</p>
              </div>
            </div>
          </div>
        );
      case 'support':
        return (
          <div className="space-y-4 text-sm text-gray-600">
            <h2 className="text-xl font-bold text-charcoal">Customer Support</h2>
            <p>Our dedicated customer support team is available during standard business hours:</p>
            <div className="space-y-2.5 pt-2 text-xs font-semibold">
              <p><strong>Support Hours: </strong>{storeSettings?.supportHours}</p>
              <p>
                <strong>WhatsApp Helpline: </strong> 
                <a href="https://wa.me/919188072646" target="_blank" rel="noreferrer" className="text-[#0B1B2B] hover:underline font-bold">+91 9188072646</a>
              </p>
              <p>
                <strong>Helpline Email: </strong> 
                <a href="mailto:rikkas.aboo@gmail.com" className="text-[#0B1B2B] hover:underline font-bold">rikkas.aboo@gmail.com</a>
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Router component based on state
  const renderView = () => {
    switch (currentView) {
      case 'home': return <HomePage />;
      case 'product': return <ProductPage />;
      case 'checkout': return <CheckoutPage />;
      case 'success': return <SuccessPage />;
      case 'admin': return <AdminPanel />;
      case 'profile': return <CustomerDashboard />;
      case 'payment-failed': return <PaymentFailedPage />;
      case 'order-tracking': return <OrderTrackingPage />;
      case 'products': return <ProductsPage />;
      case 'categories': return <CategoriesPage />;
      case 'cart': return <CartPage />;
      case 'orders': return <OrdersPage />;
      case 'wishlist': return <WishlistPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white relative">
      <PopupDialog />
      <SessionTimeoutHandler />
      <CookieConsent />
      
      {/* Sticky Header */}
      <Header />

      {/* Main Page Content */}
      <main className="flex-grow overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <Suspense fallback={<PageSkeleton />}>
              {renderView()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Simplified White Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 px-4 text-center text-xs text-gray-500 font-sans pb-24 md:pb-6 relative z-10">
        <div className="max-w-7xl mx-auto space-y-3">
          <h4 className="font-extrabold text-charcoal text-sm">{storeSettings?.storeName || "RK Peedika"}</h4>
          <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 text-gray-400 font-bold">
            <button onClick={() => setActiveModal('about')} className="hover:text-[#0B1B2B] transition-premium">About Us</button>
            <span>·</span>
            <button onClick={() => setActiveModal('contact')} className="hover:text-[#0B1B2B] transition-premium">Contact Us</button>
            <span>·</span>
            <button onClick={() => setActiveModal('privacy')} className="hover:text-[#0B1B2B] transition-premium">Privacy Policy</button>
            <span>·</span>
            <button onClick={() => setActiveModal('terms')} className="hover:text-[#0B1B2B] transition-premium">Terms & Conditions</button>
            <span>·</span>
            <button onClick={() => setCurrentView('admin')} className="hover:text-[#0B1B2B] transition-premium">Admin Panel</button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
            © {new Date().getFullYear()} {storeSettings?.storeName || "RK Peedika"}. All Rights Reserved. {storeSettings?.gstNumber && `| GSTIN: ${storeSettings.gstNumber}`}
          </p>
        </div>
      </footer>

      {/* Modal Overlay */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={closeModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative my-8"
            >
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-charcoal bg-gray-50 hover:bg-gray-100 p-1 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="p-6 md:p-8">
                {renderModalContent()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation — mobile only */}
      <BottomNav />

      {/* Toast Notification */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed left-1/2 -translate-x-1/2 z-[110] px-4 py-3 bg-white border-l-4 rounded-md shadow-md text-sm font-bold flex items-center gap-2 md:left-auto md:translate-x-0 md:right-8 ${
              activeToast.type === 'error' ? 'border-red-500 text-red-700' :
              activeToast.type === 'warning' ? 'border-[#0B1B2B] text-charcoal' :
              'border-[#0B1B2B] text-charcoal'
            }`}
            style={{
              bottom: 'calc(var(--bottom-nav-height, 60px) + 12px)',
            }}
          >
            {activeToast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
