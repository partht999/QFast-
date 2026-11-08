'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { AVAILABLE_BUSINESS_TYPES, BUSINESS_TYPES, BusinessTypeValue } from '@/lib/business-types';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [businessType, setBusinessType] = useState<BusinessTypeValue>('RESTAURANT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const requestedType = new URLSearchParams(window.location.search).get('type');
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
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('qfast_business_type', businessType);
      router.push('/dashboard/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-orange-100 p-4">
      <section className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-6 shadow-xl sm:p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl font-black text-brand-600 mb-2">
            ⚡ Qfast
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="text-gray-500 text-sm mt-1">Create your Qfast account and set up your organization</p>
        </div>

        <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
          <div>
            <label htmlFor="business-type" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
              What kind of business do you run?
            </label>
            <select
              id="business-type"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessTypeValue)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
            >
              {BUSINESS_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                  disabled={!AVAILABLE_BUSINESS_TYPES.includes(type.value)}
                >
                  {type.label}{AVAILABLE_BUSINESS_TYPES.includes(type.value) ? '' : ' — Coming soon'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">More business categories will be available as their workflows are ready.</p>
          </div>
          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
              Email address
            </label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
              placeholder="you@yourbusiness.com"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="register-confirm" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
              Confirm password
            </label>
            <input
              id="register-confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
              placeholder="Repeat your password"
            />
          </div>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-live="polite"
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md mt-2 text-sm"
          >
            {loading ? 'Creating your account…' : 'Start free trial →'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Already registered?{' '}
          <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
