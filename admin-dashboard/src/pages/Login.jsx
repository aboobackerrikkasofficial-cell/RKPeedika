import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import FormInput from '../components/FormInput';
import { ShieldCheck } from 'lucide-react';

// IMPORTANT:
// Use the centralized API client.
// Do NOT use axios directly here.
import apiClient from '../api/client';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long'),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      /*
       * IMPORTANT:
       *
       * apiClient already has:
       *
       * https://rkpeedika.onrender.com/api
       *
       * Therefore use:
       *
       * /auth/login
       *
       * NOT:
       *
       * /api/auth/login
       */
      const res = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (res.data && res.data.success) {
        const { token, refreshToken, user } = res.data;

        // Make sure the account is actually an admin
        if (!user || user.role !== 'admin') {
          setError('email', {
            message: 'Unauthorized: Admin portal access only.',
          });

          return;
        }

        // Store authentication credentials
        localStorage.setItem('accessToken', token);

        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        localStorage.setItem('rememberMe', 'true');

        sessionStorage.setItem('session_active', 'true');

        // Redirect to the page the user originally requested
        const from = location.state?.from?.pathname || '/';

        navigate(from, {
          replace: true,
        });

        return;
      }

      setError('password', {
        message:
          res.data?.error?.message ||
          res.data?.message ||
          'Login failed. Please try again.',
      });
    } catch (err) {
      console.error('Admin login error:', err);

      const status = err.response?.status;

      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (status === 401
          ? 'Invalid email or password.'
          : status === 403
            ? 'You are not authorized to access the admin portal.'
            : status === 404
              ? 'Authentication service was not found. Please check the API configuration.'
              : 'Unable to connect to the authentication server.');

      setError('password', {
        message: errMsg,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Header Title */}
          <div className="text-center">
            <div className="flex flex-col items-center justify-center mb-3">
              <img
                src="/images/logo.jpg"
                alt="RK Peedika Logo"
                className="h-10 w-auto object-contain mb-2"
              />

              <span className="text-3xl font-extrabold tracking-tight text-gray-900">
                RK Peedika
              </span>
            </div>

            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Admin Portal Access
            </h2>

            <p className="text-xs font-semibold text-gray-400 mt-1">
              Authorize credentials to manage the RK Peedika marketplace.
            </p>
          </div>

          {/* Validation Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 space-y-6"
          >
            <div className="space-y-4">

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                placeholder="Enter admin email"
                register={register}
                error={errors.email}
              />

              <FormInput
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                register={register}
                error={errors.password}
              />

            </div>

            <div className="text-xs text-gray-400 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-[#F7941D]" />
                SSL Secured
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
              {isSubmitting
                ? 'Verifying Credentials...'
                : 'Authorize Access'}
            </button>
          </form>

          {/* Production-safe footer */}
          <div className="mt-4 pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400 font-medium leading-relaxed">
            <p>
              This is a secure RK Peedika administrator portal.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}