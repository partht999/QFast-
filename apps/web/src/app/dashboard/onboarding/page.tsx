'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';
import { BUSINESS_TYPES, BusinessTypeValue } from '@/lib/business-types';
import { getBusinessPublicPath } from '@/lib/business-links';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<BusinessTypeValue>('RESTAURANT');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    phone: '',
    email: '',
    address: '',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedType = localStorage.getItem('qfast_business_type');
    if (BUSINESS_TYPES.some((item) => item.value === savedType)) {
      setBusinessType(savedType as BusinessTypeValue);
    }
  }, []);

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm((f) => ({ ...f, name, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const apiUrl = getApiUrl();

    try {
      const res = await fetch(`${apiUrl}/api/v1/business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, type: businessType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create business');

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error creating business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-lg border border-orange-100">
        <div className="mb-6">
          <span className="text-2xl font-black text-brand-600">⚡ Qfast</span>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">Set up your organization</h2>
          <p className="text-gray-500 text-xs mt-1">
            Step {step} of 2 — {step === 1 ? 'Basic Details' : 'Contact & Location'}
          </p>

          <div className="flex gap-2 mt-4">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-brand-500' : 'bg-gray-200'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-brand-500' : 'bg-gray-200'}`} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <label htmlFor="business-type" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Business category *
                </label>
                <select
                  id="business-type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessTypeValue)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                >
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {businessType === 'HOSPITAL' && (
                  <p className="mt-1 text-xs text-amber-700">
                    Qfast supports suitable non-emergency FIFO queues, not emergency triage.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  placeholder="e.g. Olive Kitchen or Greenfield Clinic"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Unique Slug (for QR codes and URLs) *
                </label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 focus-within:border-transparent">
                  <span className="bg-gray-50 px-3 py-3 text-gray-400 text-xs flex items-center border-r border-gray-200">
                    qfast.in{getBusinessPublicPath('', businessType).replace(/\/$/, '')}/
                  </span>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      }))
                    }
                    className="flex-1 px-3 py-3 text-sm outline-none"
                    placeholder="olive-kitchen"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Your organization’s public Qfast link and QR codes will use this address.</p>
              </div>

              <button
                type="button"
                disabled={!form.name || !form.slug}
                onClick={() => setStep(2)}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md mt-4 text-sm"
              >
                Continue to Step 2 →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Public Contact Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  placeholder="contact@olivekitchen.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  placeholder="12 Main Street, Indiranagar, Bengaluru"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-md text-sm"
                >
                  {loading ? 'Creating restaurant…' : '🚀 Launch Qfast'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
