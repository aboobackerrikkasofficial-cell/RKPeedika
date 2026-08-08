import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Save } from 'lucide-react';
import apiClient from '../api/client';

export default function PaymentSettings() {
  const [gateways, setGateways] = useState({
    razorpay: { enabled: false, env: 'sandbox', keyId: '', keySecret: '', webhookUrl: '', callbackUrl: '' },
    cashfree: { enabled: false, env: 'sandbox', keyId: '', keySecret: '', webhookUrl: '', callbackUrl: '' },
    phonepe: { enabled: false, env: 'sandbox', keyId: '', keySecret: '', webhookUrl: '', callbackUrl: '' },
    stripe: { enabled: false, env: 'sandbox', keyId: '', keySecret: '', webhookUrl: '', callbackUrl: '' }
  });
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/payments/gateways');
      if (res.data) {
        setGateways(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error("Failed to load gateways", err);
    }
    setIsLoading(false);
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const handleSave = async (gatewayKey) => {
    try {
      const config = gateways[gatewayKey];
      const res = await apiClient.put(`/payments/gateways/${gatewayKey}`, config);
      if (res.status === 200) {
        showStatus('success', `${gatewayKey.toUpperCase()} settings saved successfully.`);
      }
    } catch (err) {
      console.error("Failed to save gateway", err);
      showStatus('error', `Failed to save ${gatewayKey.toUpperCase()} settings.`);
    }
  };

  const handleChange = (gateway, field, value) => {
    setGateways(prev => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold text-xs text-gray-400 animate-pulse">
        Fetching gateway settings...
      </div>
    );
  }

  const gatewayNames = {
    razorpay: 'Razorpay',
    cashfree: 'Cashfree',
    phonepe: 'PhonePe',
    stripe: 'Stripe'
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl">
      <div className="flex items-baseline justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[#F7941D]" /> Payment Gateways
          </h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">Configure online payment providers, API keys, and webhook endpoints.</p>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-bold ${
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {statusMsg.text}
        </div>
      )}

      <div className="space-y-6">
        {Object.keys(gateways).map(key => {
          const gw = gateways[key];
          return (
            <div key={key} className={`rounded-xl border ${gw.enabled ? 'border-[#F7941D] bg-orange-50/10' : 'border-gray-100 bg-white'} p-6 shadow-sm space-y-4`}>
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal flex items-center gap-2">
                  {gatewayNames[key]}
                </h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center cursor-pointer gap-2 text-xs font-bold text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={gw.enabled}
                      onChange={(e) => handleChange(key, 'enabled', e.target.checked)}
                      className="accent-[#F7941D] w-4 h-4 cursor-pointer" 
                    />
                    Enable {gatewayNames[key]}
                  </label>
                  <button 
                    onClick={() => handleSave(key)}
                    className="flex items-center gap-1.5 rounded-xl bg-charcoal px-4 py-2 text-[10px] font-bold text-white hover:bg-gray-800 transition-all shadow"
                  >
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Environment</label>
                  <select 
                    value={gw.env}
                    onChange={(e) => handleChange(key, 'env', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D] bg-white"
                  >
                    <option value="sandbox">Sandbox / Test</option>
                    <option value="production">Production / Live</option>
                  </select>
                </div>
                <div></div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">API Key / Client ID</label>
                  <input 
                    type="text" 
                    value={gw.keyId || ''}
                    onChange={(e) => handleChange(key, 'keyId', e.target.value)}
                    placeholder={`Enter ${gatewayNames[key]} Key ID`}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Secret Key</label>
                  <input 
                    type="password" 
                    value={gw.keySecret || ''}
                    onChange={(e) => handleChange(key, 'keySecret', e.target.value)}
                    placeholder={`Enter ${gatewayNames[key]} Secret Key`}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-[#F7941D]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Webhook URL</label>
                  <input 
                    type="text" 
                    value={gw.webhookUrl || ''}
                    onChange={(e) => handleChange(key, 'webhookUrl', e.target.value)}
                    placeholder="https://api.domain.com/webhooks/..."
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-500 outline-none focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Callback URL</label>
                  <input 
                    type="text" 
                    value={gw.callbackUrl || ''}
                    onChange={(e) => handleChange(key, 'callbackUrl', e.target.value)}
                    placeholder="https://domain.com/payment/verify"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-500 outline-none focus:border-[#F7941D]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
