import React, { useState, useEffect } from 'react';
import { User, Mail, Award, CheckCircle, AlertCircle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import apiClient from '../api/client';

export default function Profile(props) {
  const context = useOutletContext() || {};
  const adminUser = props.adminUser || context.adminUser;
  const onProfileUpdate = props.onProfileUpdate || context.onProfileUpdate;

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "admin"
  });

  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (adminUser) {
      setProfileData({
        name: adminUser.name || "",
        email: adminUser.email || "",
        role: adminUser.role || "admin"
      });
    }
  }, [adminUser]);

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      showStatus('error', "Administrator name is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!profileData.email.trim() || !emailRegex.test(profileData.email)) {
      showStatus('error', "Please provide a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.put('/users/profile', {
        name: profileData.name.trim(),
        email: profileData.email.trim().toLowerCase()
      });

      if (res.data && res.data.success) {
        showStatus('success', "Profile updated successfully.");
        if (onProfileUpdate) {
          onProfileUpdate(res.data.user);
        }
      }
    } catch (err) {
      console.error("Failed to update profile", err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || "Failed to update profile details.";
      showStatus('error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-2xl">
      
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Admin Profile</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">Manage credentials and authorization access keys.</p>
        </div>
      </div>

      {/* Status Messages */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-bold ${
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left avatar card */}
        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-[#FFE8CC] text-[#F7941D] font-black text-2xl flex items-center justify-center border border-orange-100 uppercase mb-3">
            {profileData.name ? profileData.name.trim().charAt(0) : 'A'}
          </div>
          <h3 className="text-sm font-bold text-gray-900">{profileData.name || "Admin"}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1">{profileData.role}</p>
          <div className="mt-4 pt-3.5 border-t border-gray-100 w-full text-[10px] text-gray-400 font-semibold space-y-1.5">
            <p className="flex items-center gap-1.5 justify-center"><Award className="h-4 w-4 text-[#F7941D]" /> Admin Control Panel</p>
          </div>
        </div>

        {/* Right input details form */}
        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Administrator Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="rounded-xl border border-gray-200 pl-10 pr-3.5 py-2.5 w-full text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-gray-400" />
                <input 
                  type="email" 
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className="rounded-xl border border-gray-200 pl-10 pr-3.5 py-2.5 w-full text-xs text-charcoal outline-none focus:border-[#F7941D]"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Account Authorization Role</label>
              <input 
                type="text" 
                readOnly
                value={profileData.role.toUpperCase()}
                className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-400 outline-none cursor-not-allowed uppercase font-bold"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#F7941D] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#E07D10] disabled:opacity-50 transition-all shadow"
              >
                {isSubmitting ? "Saving..." : "Save Details"}
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
