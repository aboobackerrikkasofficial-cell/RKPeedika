import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { User, MapPin, ShoppingBag, Truck, RefreshCcw, HelpCircle, FileText, Phone, LogOut, ArrowLeft, ChevronDown, ChevronRight, Edit2, Plus, CheckCircle, Package, RotateCcw, Trash2 } from 'lucide-react';
import AddressForm from '../components/AddressForm';

// Standalone OTP Input Component
function OTPInput({ length = 6, value, onChange, onComplete }) {
  const inputsRef = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (isNaN(Number(val))) return;

    const newValue = value.split('');
    newValue[index] = val.substring(val.length - 1);
    const joined = newValue.join('');
    onChange(joined);

    // Auto move cursor
    if (val && index < length - 1) {
      inputsRef.current[index + 1].focus();
    }

    if (joined.length === length && onComplete) {
      onComplete(joined);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputsRef.current[index - 1].focus();
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
      } else {
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === length && !isNaN(Number(pasteData))) {
      onChange(pasteData);
      if (inputsRef.current[length - 1]) {
        inputsRef.current[length - 1].focus();
      }
      if (onComplete) onComplete(pasteData);
    }
  };

  return (
    <div className="flex justify-between gap-2 my-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          type="text"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          ref={(el) => (inputsRef.current[idx] = el)}
          className="w-12 h-12 text-center text-lg font-bold border border-gray-200 rounded-xl focus:border-[#0B1B2B] outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#0B1B2B]/20"
        />
      ))}
    </div>
  );
}

export default function CustomerDashboard() {
  const { 
    setCurrentView, 
    orderHistory, 
    userProfile, 
    sendOtp,
    verifyOtp,
    completeProfile,
    simpleLogin,
    logoutUser,
    updateUserProfile, 
    addresses, 
    addAddress,
    updateAddress,
    deleteAddress,
    storeSettings,
    setTrackingOrderId
  } = useContext(AppContext);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Edit profile form
  const [profileName, setProfileName] = useState(userProfile?.name || "");
  const [profileEmail, setProfileEmail] = useState(userProfile?.email || "");
  const [profilePhone, setProfilePhone] = useState(userProfile?.phone || "");

  // Add address form
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");

  // Customer Login/Verification state hooks
  const [authStep, setAuthStep] = useState('phone'); // 'phone' | 'otp'
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Complete profile inputs
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newDob, setNewDob] = useState('');

  // Sync profile editing inputs when userProfile is loaded
  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name || "");
      setProfileEmail(userProfile.email || "");
      setProfilePhone(userProfile.phone || "");
    }
  }, [userProfile]);

  // Countdown timer for OTP Resend
  useEffect(() => {
    let interval = null;
    if (authStep === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authStep, timer]);

  // Web OTP API Auto Verification
  useEffect(() => {
    if (authStep === 'otp' && 'OTPCredential' in window) {
      const ac = new AbortController();
      navigator.credentials
        .get({
          otp: { transport: ['sms'] },
          signal: ac.signal
        })
        .then((otp) => {
          if (otp && otp.code) {
            setLoginOtp(otp.code);
            handleVerifyOtp(otp.code);
          }
        })
        .catch((err) => {
          console.warn('[Web OTP API] Auto retrieval error/aborted:', err.message);
        });

      return () => {
        ac.abort();
      };
    }
  }, [authStep]);

  const handleSimpleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!newName.trim()) {
      window.showAlert("Name is required", "Validation Error");
      return;
    }
    if (loginPhone.length !== 10) {
      window.showAlert("Valid 10-digit mobile number is required", "Validation Error");
      return;
    }
    setIsSubmitting(true);
    await simpleLogin(newName, loginPhone, rememberMe);
    setIsSubmitting(false);
  };

  // If user is logged in but has incomplete profile (name === 'New User')
  const isProfileIncomplete = userProfile && (userProfile.name === 'New User' || !userProfile.name);

  if (isProfileIncomplete) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 font-sans">
        <div className="w-full bg-white border border-gray-100 p-8 rounded-xl shadow-premium">
          <div className="flex flex-col items-center mb-6">
            <img src="/images/logo.jpg" alt="RK Peedika Logo" className="h-[42px] w-auto object-contain mb-2" />
            <h3 className="text-lg font-bold text-charcoal">Complete Your Profile</h3>
            <p className="text-xs text-gray-400 mt-1">Please provide basic details to proceed</p>
          </div>
          
          <form onSubmit={handleCompleteProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
              <input 
                type="text" 
                required 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Rahul Sharma" 
                className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-[#0B1B2B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email (Optional)</label>
              <input 
                type="email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                placeholder="e.g. rahul@test.com" 
                className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-[#0B1B2B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Gender (Optional)</label>
              <div className="flex gap-4 mt-1.5">
                {['Male', 'Female', 'Other'].map((g) => (
                  <label key={g} className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                    <input 
                      type="radio" 
                      name="gender" 
                      value={g} 
                      checked={newGender === g}
                      onChange={(e) => setNewGender(e.target.value)}
                      className="text-[#0B1B2B] focus:ring-[#0B1B2B]"
                    />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date of Birth (Optional)</label>
              <input 
                type="date" 
                value={newDob} 
                onChange={(e) => setNewDob(e.target.value)} 
                className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-[#0B1B2B]"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#0B1B2B] text-white py-3 rounded-xl font-bold hover:bg-[#071320] transition disabled:opacity-50 text-sm shadow shadow-indigo-500/5 min-h-[44px]"
            >
              {isSubmitting ? "Saving details..." : "Save & Continue"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 font-sans">
        <div className="w-full bg-white border border-gray-100 p-8 rounded-xl shadow-premium">
          <div className="flex flex-col items-center mb-6">
            <img src="/images/logo.jpg" alt="RK Peedika Logo" className="h-[42px] w-auto object-contain mb-2" />
            <h3 className="text-base font-extrabold text-charcoal">Sign In / Register</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">Enter your details to proceed to your profile</p>
          </div>

          <form onSubmit={handleSimpleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Rahul Sharma" 
                className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-[#0B1B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mobile Number</label>
              <div className="flex rounded-xl border border-gray-200 focus-within:border-[#0B1B2B] overflow-hidden bg-white">
                <div className="flex items-center bg-gray-50 px-3 border-r border-gray-100 text-sm font-bold text-gray-600 gap-1 select-none">
                  <span>🇮🇳</span> <span>+91</span>
                </div>
                <input 
                  type="tel" 
                  required 
                  value={loginPhone} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 10) setLoginPhone(val);
                  }} 
                  placeholder="Enter your 10-digit number" 
                  className="flex-grow px-3.5 py-3 text-sm outline-none bg-transparent text-charcoal font-semibold tracking-wide"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">Free instant numeric validation checks active.</p>
            </div>

            <div className="flex items-center space-x-2 my-2">
              <input 
                type="checkbox" 
                id="rememberMe"
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
                className="rounded border-gray-300 text-[#0B1B2B] focus:ring-[#0B1B2B]" 
              />
              <label htmlFor="rememberMe" className="text-xs font-bold text-gray-500 cursor-pointer select-none">
                Keep me signed in for 30 days
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || loginPhone.length !== 10 || !newName.trim()}
              className="w-full bg-[#0B1B2B] text-white py-3 rounded-xl font-bold hover:bg-[#071320] transition disabled:opacity-50 text-sm shadow shadow-indigo-500/5 min-h-[44px]"
            >
              {isSubmitting ? "Logging in..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: User, group: 'Account' },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin, group: 'Account' },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag, group: 'Orders' },
    { id: 'returns', label: 'Return Policy', icon: RefreshCcw, group: 'Orders' },
    { id: 'privacy', label: 'Privacy Policy', icon: FileText, group: 'Support' },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText, group: 'Support' },
    { id: 'contact', label: 'Contact Support', icon: Phone, group: 'Support' },
  ];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    const res = await updateUserProfile({
      name: profileName,
      email: profileEmail,
      phone: profilePhone
    });
    if (res.success) {
      setSuccessMsg("Profile details updated successfully!");
      setIsEditingProfile(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg("Failed to update profile details.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleAddAddress = async (payload) => {
    setSuccessMsg("");
    setErrorMsg("");
    const res = await addAddress({
      ...payload,
      isDefault: addresses.length === 0
    });
    if (res.success) {
      setSuccessMsg("New address added successfully!");
      setIsAddingAddress(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg("Failed to save address. Please try again.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleEditAddressSubmit = async (payload) => {
    if (!editingAddress) return;
    setSuccessMsg("");
    setErrorMsg("");
    const res = await updateAddress(editingAddress.id, {
      ...payload,
      isDefault: editingAddress.isDefault
    });
    if (res.success) {
      setSuccessMsg("Address updated successfully!");
      setEditingAddress(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg("Failed to update address. Please try again.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleDeleteAddressClick = async (id) => {
    const ok = await window.showConfirm("Are you sure you want to delete this address?", "Delete Address");
    if (ok) {
      setSuccessMsg("");
      setErrorMsg("");
      const res = await deleteAddress(id);
      if (res.success) {
        setSuccessMsg("Address deleted successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg("Failed to delete address.");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    }
  };

  const renderContent = () => {
    if (!userProfile) {
      return (
        <div className="py-12 text-center text-gray-400 font-bold text-xs animate-pulse">
          Loading customer account session...
        </div>
      );
    }

    switch (activeTab) {
      case 'orders':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-charcoal hidden md:block">My Orders</h3>
            {orderHistory.length === 0 ? (
              <p className="text-sm text-gray-500">You haven't placed any orders yet.</p>
            ) : (
              <div className="space-y-4">
                {orderHistory.map(order => (
                  <div key={order.orderId} className="border border-gray-100 rounded-premium p-4 flex flex-col md:flex-row md:justify-between md:items-center bg-gray-50/50 gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-white rounded shadow-sm border border-gray-100 mt-1">
                        <Package className="h-5 w-5 text-[#0B1B2B]" />
                      </div>
                      <div>
                        <p className="font-bold text-charcoal text-sm">{order.orderId}</p>
                        <p className="text-xs text-gray-500">{order.date}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-block text-[10px] uppercase font-bold text-[#1F9D55] bg-[#1F9D55]/10 px-2 py-0.5 rounded border border-[#1F9D55]/20">{order.status}</span>
                          <span className="inline-block text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{order.paymentMethod === 'cod' ? 'COD' : 'Online'}</span>
                          {order.invoiceNumber && <span className="inline-block text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">INV: {order.invoiceNumber}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:flex-col md:items-end w-full md:w-auto">
                      <p className="font-bold text-[#0B1B2B] text-sm">₹{order.pricing?.finalTotal}</p>
                      <button 
                        onClick={() => { setTrackingOrderId(order.orderId); setCurrentView('order-tracking'); }}
                        className="text-[10px] font-bold uppercase tracking-wider text-charcoal bg-white border border-gray-200 px-3 py-1.5 rounded-premium hover:bg-gray-50 mt-2"
                      >
                        Track Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-charcoal hidden md:block">My Profile</h3>
              {!isEditingProfile && (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center space-x-1.5 text-xs font-bold text-[#0B1B2B] bg-[#0B1B2B]/10 px-3 py-1.5 rounded-premium min-h-[44px] md:min-h-[auto]"
                >
                  <Edit2 className="h-3.5 w-3.5" /> <span>Edit Profile</span>
                </button>
              )}
            </div>
            
            {!isEditingProfile ? (
              <div className="bg-gray-50/50 rounded-premium border border-gray-100 p-5 space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-16 w-16 bg-[#0B1B2B]/10 rounded-full flex items-center justify-center text-[#0B1B2B] font-black text-xl border-2 border-[#0B1B2B]/20">
                    {userProfile?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-charcoal">{userProfile?.name || 'Customer'}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F9D55] bg-[#1F9D55]/10 px-2 py-0.5 rounded border border-[#1F9D55]/20 flex items-center w-max mt-1">
                      <CheckCircle className="h-3 w-3 mr-1" /> Active Account
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Email Address</p>
                    <p className="text-sm font-semibold text-charcoal mt-0.5">{userProfile?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Phone Number</p>
                    <p className="text-sm font-semibold text-charcoal mt-0.5">{userProfile?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Joined Date</p>
                    <p className="text-sm font-semibold text-charcoal mt-0.5">August 2026</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md bg-white border border-gray-100 p-5 rounded-premium shadow-sm">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-xs text-charcoal outline-none focus:border-[#0B1B2B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-xs text-charcoal outline-none focus:border-[#0B1B2B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Mobile / Phone Number</label>
                  <input 
                    type="text" 
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-xs text-charcoal outline-none focus:border-[#0B1B2B]"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 rounded-xl bg-[#0B1B2B] px-6 py-3 min-h-[44px] text-xs font-bold text-white hover:bg-[#071320] transition-all shadow-sm"
                  >
                    Save Profile
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileName(userProfile?.name || "");
                      setProfileEmail(userProfile?.email || "");
                      setProfilePhone(userProfile?.phone || "");
                    }}
                    className="flex-1 rounded-xl bg-gray-100 px-6 py-3 min-h-[44px] text-xs font-bold text-charcoal hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        );

      case 'addresses':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-charcoal hidden md:block">Saved Addresses</h3>
            
            {editingAddress ? (
              <div className="border border-gray-100 p-5 rounded-premium bg-white shadow-sm">
                <h4 className="text-sm font-bold text-charcoal mb-4">Edit Shipping Address</h4>
                <AddressForm
                  userProfile={userProfile}
                  initialData={editingAddress}
                  onSubmit={handleEditAddressSubmit}
                  onCancel={() => setEditingAddress(null)}
                  submitLabel="Update Address"
                />
              </div>
            ) : !isAddingAddress ? (
              <div className="space-y-4">
                {addresses.length === 0 ? (
                  <p className="text-sm text-gray-500">No saved addresses found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map(addr => (
                      <div key={addr.id} className="border border-gray-100 p-4 rounded-premium bg-gray-50/50 space-y-1 relative group">
                        {addr.isDefault && (
                          <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider text-[#1F9D55] bg-[#1F9D55]/10 px-2 py-0.5 rounded">Default</span>
                        )}
                        <p className="text-sm text-charcoal font-bold">{addr.fullName}</p>
                        <p className="text-xs text-gray-600">{addr.houseFlatNumber}, {addr.streetRoadName}</p>
                        <p className="text-xs text-gray-500">{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-[11px] text-gray-400 mt-2 font-semibold">📞 {addr.phone}</p>
                        
                        {/* Edit & Delete Action Panel */}
                        <div className="flex items-center space-x-3 pt-2 mt-2 border-t border-gray-100/60">
                          <button
                            onClick={() => setEditingAddress(addr)}
                            className="flex items-center space-x-1 text-xs font-semibold text-[#0B1B2B] hover:text-[#071320] transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> <span>Edit</span>
                          </button>
                          <span className="text-gray-200 text-[10px]">|</span>
                          <button
                            onClick={() => handleDeleteAddressClick(addr.id)}
                            className="flex items-center space-x-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button 
                  onClick={() => setIsAddingAddress(true)}
                  className="w-full md:w-auto flex justify-center items-center space-x-1.5 text-xs font-bold text-white bg-charcoal px-5 py-3 min-h-[44px] rounded-premium transition-all shadow-sm hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4" /> <span>Add New Address</span>
                </button>
              </div>
            ) : (
              <div className="border border-gray-100 p-5 rounded-premium bg-white shadow-sm">
                <h4 className="text-sm font-bold text-charcoal mb-4">Add Shipping Address</h4>
                <AddressForm
                  userProfile={userProfile}
                  onSubmit={handleAddAddress}
                  onCancel={() => setIsAddingAddress(false)}
                  submitLabel="Save Address"
                />
              </div>
            )}
          </div>
        );

      case 'returns':
        return (
          <div className="bg-gray-50/50 p-5 rounded-premium border border-gray-100">
            <h3 className="text-lg font-bold text-charcoal mb-3 hidden md:block">Returns & Exchanges</h3>
            <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
              <p className="text-[10px] text-gray-400">Last Updated: August 2026</p>
              {storeSettings?.returnPolicy ? (
                <p className="whitespace-pre-line text-xs">{storeSettings.returnPolicy}</p>
              ) : (
                <>
                  <p>At RK Peedika, we strive to ensure a smooth and satisfying shopping experience. Since we focus on quality products at affordable prices, our return and exchange policy is designed to be fair and transparent.</p>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal">1. Exchange Policy (No Refunds)</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>We offer <strong>exchanges only</strong> within <strong>{storeSettings?.returnWindow || 3} days of delivery</strong> for eligible items.</li>
                      <li>We do not offer cash refunds unless a replacement for a damaged/wrong product is unavailable.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal">2. Eligibility for Exchanges</h4>
                    <p>To be eligible for an exchange, the product must meet the following criteria:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Must be completely unused, unwashed, and in its original condition.</li>
                      <li>Must have all original tags, labels, and packaging intact.</li>
                      <li>Exchanges are only accepted for sizing issues, damaged products, or incorrect items delivered.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal">3. Damaged or Defective Items</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Any damage or manufacturing defect must be reported within <strong>24 hours of delivery</strong>.</li>
                      <li><strong>Photo and video evidence</strong> of the packaging and product is mandatory to process damage claims.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal">4. Non-Returnable / Non-Exchangeable Items</h4>
                    <p>The following categories are strictly non-returnable and non-exchangeable due to hygiene and customization reasons:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Personal care, cosmetics, and hygiene products</li>
                      <li>Customized, personalized, or made-to-order items</li>
                      <li>Clearance sale items or products marked as final sale</li>
                      <li>Items without original tags, box, or documentation</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-charcoal">5. Exchange Process</h4>
                    <p>To request an exchange:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Raise a request via the footer exchange form, your customer dashboard, or WhatsApp support (+91 9188072646).</li>
                      <li>Submit clear photographs of the product showing its unused status and tags.</li>
                      <li>Once approved, our delivery partner will pick up the package.</li>
                      <li>Upon quality inspection of the returned package, your replacement will be dispatched within <strong>3-5 business days</strong>.</li>
                    </ol>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <h4 className="font-bold text-charcoal">6. Contact Support</h4>
                <p>If you have any questions regarding your return/exchange, please contact us:</p>
                <p><strong>Email:</strong> {storeSettings?.supportEmail || "rikkas.aboo@gmail.com"} &nbsp;|&nbsp; <strong>WhatsApp:</strong> {storeSettings?.whatsappNumber || "+91 9188072646"}</p>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="bg-gray-50/50 p-5 rounded-premium border border-gray-100">
            <h3 className="text-lg font-bold text-charcoal mb-3 hidden md:block">Privacy Policy</h3>
            <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
              <p className="text-[10px] text-gray-400">Last Updated: August 2026</p>
              <p>At RK Peedika, we are committed to protecting your personal information and your right to privacy. This Privacy Policy describes how we collect, use, and safeguard your data when you use our website and services.</p>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">1. Information We Collect</h4>
                <p>We collect information that you voluntarily provide when you register, place an order, or contact us:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Personal Information:</strong> Name, phone number, email address, delivery address(es)</li>
                  <li><strong>Order Information:</strong> Products purchased, order history, payment method chosen (COD / Online)</li>
                  <li><strong>Device Information:</strong> Browser type, IP address, device identifiers, and cookies for analytics and session management</li>
                  <li><strong>Communication Data:</strong> Messages, support queries, and exchange/return requests submitted via our platform or WhatsApp</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">2. How We Use Your Information</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>To process and fulfill your orders, including delivery and payment processing</li>
                  <li>To communicate order updates, shipping notifications, and promotional offers</li>
                  <li>To provide customer support and handle exchange/return requests</li>
                  <li>To improve our website, product offerings, and overall shopping experience</li>
                  <li>To detect, prevent, and address fraud, security issues, or technical problems</li>
                  <li>To comply with applicable legal obligations and regulations</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">3. Data Sharing & Disclosure</h4>
                <p>We do not sell, rent, or trade your personal information to third parties. We may share your data only with:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Shipping Partners:</strong> To facilitate product delivery to your address</li>
                  <li><strong>Payment Processors:</strong> To securely process online payments (we do not store your card details)</li>
                  <li><strong>Legal Authorities:</strong> When required by law, regulation, or legal process</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">4. Cookies & Tracking</h4>
                <p>We use essential cookies to maintain your session, remember your login, and keep items in your cart. We may also use analytics cookies to understand usage patterns and improve our services. You can disable cookies in your browser settings, but some features may not work properly.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">5. Data Security</h4>
                <p>We implement industry-standard security measures including encrypted data transmission (SSL/TLS), secure authentication (OTP-based login), and access controls to protect your personal information. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">6. Data Retention</h4>
                <p>We retain your personal data for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account and associated data by contacting our support team.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">7. Your Rights</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Access, update, or correct your personal information through your account dashboard</li>
                  <li>Request deletion of your personal data by contacting support</li>
                  <li>Opt out of promotional communications at any time</li>
                  <li>Withdraw consent for data processing where applicable</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">8. Contact Us</h4>
                <p>If you have questions or concerns about this Privacy Policy, please contact us at:</p>
                <p><strong>Email:</strong> rikkas.aboo@gmail.com &nbsp;|&nbsp; <strong>WhatsApp:</strong> +91 9188072646</p>
                <p><strong>Address:</strong> Kasaragod, Kerala, India - 671320</p>
              </div>

              <p className="text-[10px] text-gray-400 border-t pt-3 mt-2">By using RK Peedika, you acknowledge that you have read and understood this Privacy Policy and agree to the collection and use of your information as described herein.</p>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="bg-gray-50/50 p-5 rounded-premium border border-gray-100">
            <h3 className="text-lg font-bold text-charcoal mb-3 hidden md:block">Terms & Conditions</h3>
            <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
              <p className="text-[10px] text-gray-400">Last Updated: August 2026</p>
              <p>Welcome to RK Peedika. By accessing or using our website and services, you agree to be bound by the following Terms & Conditions. Please read them carefully before placing an order.</p>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">1. Account Registration</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You must provide a valid Indian mobile number to register and log in via OTP verification.</li>
                  <li>You are responsible for maintaining the confidentiality of your account and all activities under it.</li>
                  <li>We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.</li>
                  <li>You must be at least 18 years of age to use our services, or have parental/guardian consent.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">2. Product Listings & Pricing</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>All product descriptions, images, and specifications are provided in good faith. Minor variations may occur.</li>
                  <li>Prices displayed are in Indian Rupees (₹) and may vary between Cash on Delivery and Online Payment methods.</li>
                  <li>We reserve the right to modify prices, discontinue products, or correct pricing errors at any time without prior notice.</li>
                  <li>Promotional discounts and coupon codes are subject to specific terms, minimum purchase requirements, and expiry dates.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">3. Orders & Payment</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Placing an order constitutes an offer to purchase. We reserve the right to accept or reject any order at our discretion.</li>
                  <li><strong>Cash on Delivery (COD):</strong> Pay the delivery person in cash upon receiving your order. COD prices may differ from online prices.</li>
                  <li><strong>Online Payment:</strong> Secure payment via Razorpay. Additional online discounts may apply as advertised.</li>
                  <li>Order confirmation is sent after successful placement. Fulfillment is subject to stock availability.</li>
                  <li>Orders cannot be modified once placed. Cancellation is possible only before the order is shipped.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">4. Shipping & Delivery</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>We deliver to serviceable pin codes across India. Delivery availability is verified at checkout.</li>
                  <li>Standard shipping typically takes 3–7 business days. Express shipping (where available) takes 1–3 business days.</li>
                  <li>Shipping charges, if applicable, are clearly displayed at checkout before order confirmation.</li>
                  <li>Delivery timelines are estimates and may vary due to unforeseen circumstances, weather, or logistic delays.</li>
                  <li>Risk of loss and title for items pass to you upon delivery to the shipping carrier.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">5. Exchange Policy</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Exchange is available <strong>only</strong> if the product is damaged, the wrong product is delivered, there is a quantity issue, or the product is defected.</li>
                  <li>To apply for an exchange, you must share a video of the product showing the damage. The product and the problem must be fully visible in the video.</li>
                  <li>Please share the video via WhatsApp to our support number: <strong>9188072646</strong>.</li>
                  <li><strong>Exchanges only — no refunds</strong>. Exchange requests must be raised within 3 days of delivery.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">6. Intellectual Property</h4>
                <p>All content on this website — including text, graphics, logos, product images, UI design, and software — is the property of RK Peedika or its content suppliers and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our written consent.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">7. User Conduct</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You agree not to use the platform for any unlawful purpose or in violation of any applicable laws.</li>
                  <li>Submitting false information, fraudulent orders, or fake reviews is strictly prohibited.</li>
                  <li>Any attempt to interfere with the platform's security or functionality may result in legal action.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">8. Limitation of Liability</h4>
                <p>RK Peedika shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services, including but not limited to loss of data, revenue, or profits. Our total liability is limited to the amount paid for the specific product or service in question.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">9. Governing Law & Disputes</h4>
                <p>These Terms & Conditions are governed by the laws of India. Any disputes arising from the use of this platform shall be subject to the exclusive jurisdiction of the courts in Kasaragod, Kerala, India.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">10. Changes to Terms</h4>
                <p>We reserve the right to update or modify these Terms & Conditions at any time. Changes will be posted on this page with an updated revision date. Continued use of the platform after changes constitutes your acceptance of the revised terms.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-charcoal">11. Contact Us</h4>
                <p>For questions regarding these Terms & Conditions, please contact us at:</p>
                <p><strong>Email:</strong> rikkas.aboo@gmail.com &nbsp;|&nbsp; <strong>WhatsApp:</strong> +91 9188072646</p>
                <p><strong>Address:</strong> Kasaragod, Kerala, India - 671320</p>
              </div>

              <p className="text-[10px] text-gray-400 border-t pt-3 mt-2">By using RK Peedika, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions.</p>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="bg-gray-50/50 p-5 rounded-premium border border-gray-100">
            <h3 className="text-lg font-bold text-charcoal mb-3 hidden md:block">Contact Support</h3>
            <div className="space-y-4 text-xs font-semibold text-gray-600">
              <p>For order queries, shipments, and exchange requests, reach out below:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Support Email</p>
                  <a href={`mailto:${storeSettings?.supportEmail}?subject=RK%20Peedika%20Customer%20Support%20Request`} className="text-[#0B1B2B] font-bold mt-1 inline-block">{storeSettings?.supportEmail}</a>
                </div>
                <div className="bg-white p-4 rounded border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Helpline Phone</p>
                  <a href={`tel:${storeSettings?.supportPhone}`} className="font-bold text-charcoal mt-1 block hover:text-[#0B1B2B]">{storeSettings?.supportPhone}</a>
                </div>
                <div className="bg-white p-4 rounded border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">WhatsApp Support</p>
                  <a href={`https://wa.me/${storeSettings?.whatsappNumber?.replace(/\D/g, '')}?text=Hello,%20I%20need%20help%20with%20my%20RK%20Peedika%20order.`} target="_blank" rel="noreferrer" className="font-bold text-charcoal mt-1 block hover:text-[#0B1B2B]">{storeSettings?.whatsappNumber}</a>
                </div>
                <div className="bg-white p-4 rounded border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">GST Number</p>
                  <p className="font-bold text-charcoal mt-1">{storeSettings?.gstNumber}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-12 text-center text-gray-500">
            <p className="text-sm">Information for {menuItems.find(m => m.id === activeTab)?.label} will be displayed here.</p>
          </div>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <button 
        onClick={() => setCurrentView('home')}
        className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-charcoal mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> <span>Back to Store</span>
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Mobile Navigation Pills */}
        <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4 mb-2">
          <div className="flex space-x-2 w-max">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSuccessMsg("");
                    setErrorMsg("");
                  }}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                    isActive 
                      ? 'bg-[#0B1B2B] text-white border border-[#0B1B2B]' 
                      : 'bg-white border border-gray-200 text-charcoal hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="bg-white border border-gray-100 rounded-premium shadow-sm overflow-hidden">
            {['Account', 'Orders', 'Support'].map(group => (
              <div key={group} className="border-b border-gray-50 last:border-0">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 bg-gray-50/50">
                  {group}
                </h4>
                <div className="py-2">
                  {menuItems.filter(item => item.group === group).map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSuccessMsg("");
                          setErrorMsg("");
                        }}
                        className={`w-full flex justify-between items-center px-4 py-3 min-h-[44px] transition-premium ${
                          isActive ? 'text-[#0B1B2B] bg-[#0B1B2B]/5 font-bold border-l-2 border-[#0B1B2B]' : 'text-gray-600 hover:bg-gray-50 hover:text-charcoal border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3 text-sm">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-[#0B1B2B]' : 'text-gray-400'}`} />
                          <span>{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="p-4 border-t border-gray-100">
              <button 
                onClick={() => logoutUser()}
                className="w-full flex items-center justify-center space-x-2 text-sm font-bold text-red-500 hover:bg-red-50 py-2 px-4 rounded-premium transition-premium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Content Area - Hidden on Mobile */}
        <div className="block flex-1 bg-white border border-gray-100 rounded-premium shadow-sm p-4 md:p-8 relative">
          
          {successMsg && (
            <div className="mb-4 text-xs font-bold text-[#1F9D55] bg-[#1F9D55]/10 border border-emerald-200 px-3 py-2 rounded-premium">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-premium">
              {errorMsg}
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
