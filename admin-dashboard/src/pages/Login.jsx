import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import FormInput from '../components/FormInput';
import { ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long")
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { 
    register, 
    handleSubmit, 
    setError,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (data) => {
    try {
      const res = await axios.post('/api/auth/login', {
        email: data.email,
        password: data.password
      });

      if (res.data && res.data.success) {
        const { token, refreshToken, user } = res.data;

        if (user.role !== 'admin') {
          setError('email', { message: 'Unauthorized: Admin portal access only.' });
          return;
        }

        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('rememberMe', 'true');
        sessionStorage.setItem('session_active', 'true');

        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error("Admin login error:", err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Invalid email or password.';
      setError('password', { message: errMsg });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-8 bg-white border border-gray-100 p-8 rounded-xl shadow-premium">
        
        {/* Header Title */}
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-3">
            <img src="/images/logo.jpg" alt="Logo" className="h-10 w-auto object-contain mb-2" />
            <span className="text-3xl font-extrabold tracking-tight text-gray-900">
              RK Peedika
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Admin Portal Access</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Authorize credentials to manage artisan physical goods database.
          </p>
        </div>

        {/* Validation Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          
          <div className="space-y-4">
            <FormInput 
              label="Email Address"
              name="email"
              type="email"
              placeholder="e.g. admin@kritimarketplace.com"
              register={register}
              error={errors.email}
            />

            <FormInput 
              label="Secret Key / Password"
              name="password"
              type="password"
              placeholder="••••••••"
              register={register}
              error={errors.password}
            />
          </div>

          <div className="text-xs text-gray-400 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-[#F7941D]" /> SSL Secured
            </span>
            <span className="text-[#F7941D] hover:underline cursor-pointer">
              Forgot security key?
            </span>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#F7941D] py-3 text-xs font-bold text-white hover:bg-[#E07D10] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/10"
          >
            {isSubmitting ? "Verifying Keys..." : "Authorize Access"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400 font-medium leading-relaxed">
          <p>This is a computer-secured admin portal gateway.</p>
          <p>Quick test email: <strong>rikkas.aboo@gmail.com</strong> / password: <strong>9188072646</strong></p>
        </div>
      </div>
    </div>
  );
}
