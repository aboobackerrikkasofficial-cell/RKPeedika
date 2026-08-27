import React, { useState, useEffect } from 'react';
import { MapPin, User, Phone, Home, Map, CheckCircle, XCircle, Loader, Mail } from 'lucide-react';

/**
 * Reusable Address Form
 * Props:
 *   userProfile   – { name, phone } from AppContext (for autofill)
 *   onSubmit      – async fn(addressPayload) => { success, ... }
 *   onCancel      – fn() to hide form
 *   submitLabel   – string for the submit button (default "Save Address")
 */
// Field wrapper to group label, inputs, and error states without triggering layout reflow/focus loss
const Field = ({ label, icon: Icon, error, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
      {Icon && <Icon className="h-3 w-3" />} {label}
    </label>
    {children}
    {error && (
      <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-red-500">
        <XCircle className="h-3 w-3 shrink-0" /> {error}
      </p>
    )}
  </div>
);

export default function AddressForm({ userProfile, onSubmit, onCancel, submitLabel = "Save Address", initialData }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    houseNo: '',
    roadArea: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [errors, setErrors] = useState({});
  const [pincodeStatus, setPincodeStatus] = useState('idle'); // idle | checking | valid | invalid
  const [saving, setSaving] = useState(false);

  // Populate form if initialData is provided for editing
  useEffect(() => {
    if (initialData) {
      setForm({
        fullName: initialData.fullName || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        houseNo: initialData.houseFlatNumber || '',
        roadArea: initialData.streetRoadName || '',
        landmark: initialData.landmark || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
      });
      if (initialData.pincode) {
        setPincodeStatus('valid');
      }
    }
  }, [initialData]);

  // Autofill name & phone from logged-in user if no initialData
  useEffect(() => {
    if (userProfile && !initialData) {
      setForm(prev => ({
        ...prev,
        fullName: prev.fullName || userProfile.name || '',
        phone: prev.phone || userProfile.phone || '',
        email: prev.email || userProfile.email || '',
      }));
    }
  }, [userProfile, initialData]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Pincode validation via free India Post API
  const lookupPincode = async (pin) => {
    if (pin.length !== 6) return;
    setPincodeStatus('checking');
    setForm(prev => ({ ...prev, city: '', state: '' }));
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setForm(prev => ({
          ...prev,
          city: po.District || po.Name || '',
          state: po.State || '',
        }));
        setPincodeStatus('valid');
        setErrors(prev => ({ ...prev, pincode: '', city: '', state: '' }));
      } else {
        setPincodeStatus('invalid');
        setErrors(prev => ({ ...prev, pincode: 'Invalid pincode — no area found.' }));
      }
    } catch {
      setPincodeStatus('invalid');
      setErrors(prev => ({ ...prev, pincode: 'Could not verify pincode. Check your connection.' }));
    }
  };

  const handlePincodeChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    set('pincode', digits);
    setPincodeStatus('idle');
    if (digits.length === 6) lookupPincode(digits);
  };

  const [emailWarning, setEmailWarning] = useState('');

  // Validation
  const validate = () => {
    const e = {};
    if (!form.fullName.trim())   e.fullName = 'Please enter your full name.';
    if (!form.phone.trim())      e.phone    = 'Please enter your mobile number.';
    else if (!/^\d{10}$/.test(form.phone)) e.phone = 'Mobile number must be exactly 10 digits.';
    if (!form.houseNo.trim())    e.houseNo  = 'Please enter house / building name.';
    if (!form.roadArea.trim())   e.roadArea = 'Please enter road name / area / colony.';
    if (!form.pincode.trim())    e.pincode  = 'Please enter your pincode.';
    else if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Pincode must be 6 digits.';
    else if (pincodeStatus === 'invalid') e.pincode = 'Invalid pincode. Please check and re-enter.';
    if (!form.city.trim())       e.city     = 'City is required. Verify pincode to auto-fill.';
    if (!form.state.trim())      e.state    = 'State is required. Verify pincode to auto-fill.';
    setErrors(e);

    // Email validation (non-blocking)
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setEmailWarning('Please enter a valid email address (optional).');
    } else {
      setEmailWarning('');
    }

    return Object.keys(e).length === 0;
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        fullName:        form.fullName.trim(),
        phone:           form.phone.trim(),
        email:           form.email.trim(),
        houseFlatNumber: form.houseNo.trim(),
        streetRoadName:  form.roadArea.trim(),
        landmark:        form.landmark.trim(),
        areaLocality:    form.city.trim(),
        city:            form.city.trim(),
        district:        form.city.trim(),
        state:           form.state.trim(),
        pincode:         form.pincode.trim(),
      });
    } finally {
      setSaving(false);
    }
  };



  const inputCls = (field) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-xs text-gray-800 outline-none transition-all ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
        : 'border-gray-200 bg-white focus:border-[#0B1B2B] focus:ring-2 focus:ring-teal-100'
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* Row 1: Name + Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" icon={User} error={errors.fullName}>
          <input
            type="text"
            value={form.fullName}
            onChange={e => set('fullName', e.target.value)}
            placeholder="e.g. Aboobacker Rikkas"
            className={inputCls('fullName')}
          />
        </Field>
        <Field label="Mobile Number" icon={Phone} error={errors.phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number"
            className={inputCls('phone')}
          />
        </Field>
      </div>

      {/* Email Address */}
      <Field label="Email Address (Optional)" icon={Mail} error={errors.email}>
        <input
          type="email"
          value={form.email}
          onChange={e => { set('email', e.target.value); setEmailWarning(''); }}
          placeholder="Enter your email to get order updates"
          className={inputCls('email')}
        />
        {emailWarning && (
          <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-500">
             {emailWarning}
          </p>
        )}
      </Field>

      {/* House / Building Name */}
      <Field label="House No. / Building Name" icon={Home} error={errors.houseNo}>
        <input
          type="text"
          value={form.houseNo}
          onChange={e => set('houseNo', e.target.value)}
          placeholder="e.g. Subhana Manzil, Flat 4B"
          className={inputCls('houseNo')}
        />
      </Field>

      {/* Road / Area / Colony */}
      <Field label="Road Name / Area / Colony" icon={Map} error={errors.roadArea}>
        <input
          type="text"
          value={form.roadArea}
          onChange={e => set('roadArea', e.target.value)}
          placeholder="e.g. Kundoor Road, Navodaya Nagar"
          className={inputCls('roadArea')}
        />
      </Field>

      {/* Landmark */}
      <Field label="Landmark (Optional)" icon={MapPin}>
        <input
          type="text"
          value={form.landmark}
          onChange={e => set('landmark', e.target.value)}
          placeholder="e.g. Near Government School"
          className={inputCls('landmark')}
        />
      </Field>

      {/* Pincode + City + State */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Pincode" icon={MapPin} error={errors.pincode}>
          <div className="relative">
            <input
              type="text"
              value={form.pincode}
              onChange={e => handlePincodeChange(e.target.value)}
              placeholder="6-digit pincode"
              maxLength={6}
              className={inputCls('pincode') + ' pr-9'}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {pincodeStatus === 'checking' && <Loader className="h-3.5 w-3.5 text-[#0B1B2B] animate-spin" />}
              {pincodeStatus === 'valid'    && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
              {pincodeStatus === 'invalid'  && <XCircle className="h-3.5 w-3.5 text-red-400" />}
            </span>
          </div>
        </Field>

        <Field label="City" error={errors.city}>
          <input
            type="text"
            value={form.city}
            onChange={e => set('city', e.target.value)}
            placeholder="Auto-filled from pincode"
            className={inputCls('city')}
          />
        </Field>

        <Field label="State" error={errors.state}>
          <input
            type="text"
            value={form.state}
            onChange={e => set('state', e.target.value)}
            placeholder="Auto-filled from pincode"
            className={inputCls('state')}
          />
        </Field>
      </div>

      {/* Pincode status hint */}
      {pincodeStatus === 'valid' && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1F9D55] -mt-1">
          <CheckCircle className="h-3.5 w-3.5" /> Pincode verified — {form.city}, {form.state}
        </p>
      )}
      {pincodeStatus === 'checking' && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0B1B2B] -mt-1">
          <Loader className="h-3.5 w-3.5 animate-spin" /> Verifying pincode...
        </p>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 md:flex-none rounded-xl bg-[#0B1B2B] px-8 py-3 text-xs font-bold text-white hover:bg-[#071320] transition-all shadow shadow-indigo-500/5 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 md:flex-none rounded-xl border border-gray-200 px-6 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all min-h-[44px]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
