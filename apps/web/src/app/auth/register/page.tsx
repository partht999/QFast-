'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { getApiUrl } from '@/lib/api';
import { readApiError } from '@/lib/read-api-error';
import { AVAILABLE_BUSINESS_TYPES, BUSINESS_TYPES, BusinessTypeValue } from '@/lib/business-types';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [businessType, setBusinessType] = useState<BusinessTypeValue>('RESTAURANT');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get('type');
    if (AVAILABLE_BUSINESS_TYPES.includes(requestedType as BusinessTypeValue)) {
      setBusinessType(requestedType as BusinessTypeValue);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const apiUrl = getApiUrl();

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(readApiError(errData, 'Registration failed. Please try again.'));
      }

      const data = await res.json();

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userEmail', form.email);
      localStorage.setItem('qfast_business_type', businessType);
      localStorage.setItem('qfast_plan', 'pro');
      router.push('/dashboard/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <BrandMark href="/" tone="light" size="lg" label="Qfast home" />
        <h1 className="mt-6 text-3xl font-black tracking-tight text-white">Create your workspace</h1>
        <p className="mt-2 text-sm text-slate-400">
          The Advanced plan is free to use right now. Create your account, then open a live queue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="business-type" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Select your industry
              </label>
              <select
                id="business-type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessTypeValue)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                    disabled={!AVAILABLE_BUSINESS_TYPES.includes(type.value)}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="register-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Work Email Address
              </label>
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                placeholder="you@yourcompany.com"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                id="register-confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                placeholder="Repeat password"
              />
            </div>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-orange-500/20 text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Creating workspace…' : 'Start Free Trial'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-bold text-orange-600 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
