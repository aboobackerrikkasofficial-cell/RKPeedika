import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Percent, Mail, Database, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

export default function Settings() {
  const [onlineDiscount, setOnlineDiscount] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [storeLogo, setStoreLogo] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [announcementBar, setAnnouncementBar] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [supportHours, setSupportHours] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [returnPolicyWindow, setReturnPolicyWindow] = useState(0);
  const [exchangeWindow, setExchangeWindow] = useState(0);
  const [cancellationRules, setCancellationRules] = useState("");
  const [refundRules, setRefundRules] = useState("");
  const [damagedProductRules, setDamagedProductRules] = useState("");
  const [photoRequirement, setPhotoRequirement] = useState(true);
  const [nonReturnableConditions, setNonReturnableConditions] = useState("");
  const [processingTime, setProcessingTime] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  
  const [activeTab, setActiveTab] = useState('general');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/settings');
      if (res.data && res.data.status === 'success') {
        const s = res.data.data;
        setOnlineDiscount(s.onlineDiscount || 0);
        setStoreName(s.storeName || "");
        setStoreLogo(s.storeLogo || "");
        setSupportEmail(s.supportEmail || "");
        setSupportPhone(s.supportPhone || "");
        setWhatsappNumber(s.whatsappNumber || "");
        setAnnouncementBar(s.announcementBar || "");
        setBusinessName(s.businessName || "");
        setBusinessAddress(s.businessAddress || "");
        setSupportHours(s.supportHours || "");
        setGstNumber(s.gstNumber || "");
        setReturnPolicyWindow(s.returnPolicyWindow || 7);
        setExchangeWindow(s.exchangeWindow || 7);
        setCancellationRules(s.cancellationRules || "");
        setRefundRules(s.refundRules || "");
        setDamagedProductRules(s.damagedProductRules || "");
        setPhotoRequirement(s.photoRequirement ?? true);
        setNonReturnableConditions(s.nonReturnableConditions || "");
        setProcessingTime(s.processingTime || "");
        setReturnPolicy(s.returnPolicy || "");
        setPrivacyPolicy(s.privacyPolicy || "");
        setTermsConditions(s.termsConditions || "");
      }
    } catch (err) {
      console.error("Failed to load settings", err);
      showStatus('error', "Could not retrieve store settings from the database.");
    }
    setIsLoading(false);
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.put('/settings', {
        onlineDiscount, storeName, storeLogo, supportEmail, supportPhone, whatsappNumber, announcementBar,
        businessName, businessAddress, supportHours, gstNumber,
        returnPolicyWindow, exchangeWindow, cancellationRules, refundRules, damagedProductRules,
        photoRequirement, nonReturnableConditions, processingTime, returnPolicy, privacyPolicy, termsConditions
      });
      if (res.data && res.data.status === 'success') {
        showStatus('success', "Configuration settings updated successfully.");
        fetchSettings();
      }
    } catch (err) {
      console.error("Failed to save settings", err);
      showStatus('error', "Could not save settings to the database.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold text-xs text-gray-400 animate-pulse">
        Fetching store settings...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-3xl">
      
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-[#F7941D]" /> System Settings
          </h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">Configure online checkout dynamic discounts, transaction logs, and support details.</p>
        </div>
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

      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-6">
        <button 
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'general' ? 'border-b-2 border-[#F7941D] text-[#F7941D]' : 'text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button 
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'policies' ? 'border-b-2 border-[#F7941D] text-[#F7941D]' : 'text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('policies')}
        >
          Policies
        </button>
        <button 
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'contact' ? 'border-b-2 border-[#F7941D] text-[#F7941D]' : 'text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('contact')}
        >
          Contact & Business Info
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs font-semibold">
        
        {activeTab === 'general' && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Percent className="h-4.5 w-4.5 text-[#F7941D]" /> General Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Default Online Payment Discount (%)</label>
                <input type="number" min="0" max="50" value={onlineDiscount} onChange={(e) => setOnlineDiscount(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Store Logo URL</label>
                <input type="text" value={storeLogo} onChange={(e) => setStoreLogo(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Announcement Bar Banner Text</label>
                <input type="text" value={announcementBar} onChange={(e) => setAnnouncementBar(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Brand Name</label>
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-[#F7941D]" /> Contact & Business Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Business Name</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">GST Number</label>
                <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Business Address</label>
                <textarea value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" rows={2}></textarea>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Support Email</label>
                <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Support Phone Number</label>
                <input type="text" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">WhatsApp Number</label>
                <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Support Hours</label>
                <input type="text" value={supportHours} onChange={(e) => setSupportHours(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              Store Policies & Returns
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Return Policy Window (days)</label>
                <input type="number" value={returnPolicyWindow} onChange={(e) => setReturnPolicyWindow(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Exchange Window (days)</label>
                <input type="number" value={exchangeWindow} onChange={(e) => setExchangeWindow(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Cancellation Rules</label>
                <textarea value={cancellationRules} onChange={(e) => setCancellationRules(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" rows={2}></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Refund Rules</label>
                <textarea value={refundRules} onChange={(e) => setRefundRules(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" rows={2}></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Complete Return Policy Text</label>
                <textarea value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" rows={4}></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Privacy Policy</label>
                <textarea value={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" rows={4}></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Terms & Conditions</label>
                <textarea value={termsConditions} onChange={(e) => setTermsConditions(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]" rows={4}></textarea>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button type="submit" className="rounded-xl bg-[#F7941D] px-6 py-3 text-xs font-bold text-white hover:bg-[#E07D10] transition-all shadow">
            Save Configuration Settings
          </button>
        </div>
      </form>


    </div>
  );
}
