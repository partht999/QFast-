'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
import { getApiUrl } from '@/lib/api';
import { AVAILABLE_BUSINESS_TYPES, BUSINESS_TYPES, BusinessTypeValue } from '@/lib/business-types';
import { getBusinessPublicPath } from '@/lib/business-links';
import {
  Store,
  Coffee,
  Stethoscope,
  HeartPulse,
  Scissors,
  ClipboardList,
  Wrench,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

const industryIcons: Record<string, typeof Store> = {
  RESTAURANT: Store,
  CAFE: Coffee,
  CLINIC: Stethoscope,
  HOSPITAL: HeartPulse,
  SALON: Scissors,
  DIAGNOSTIC_CENTRE: ClipboardList,
  SERVICE_CENTRE: Wrench,
  RETAIL: Store,
  OTHER: Zap,
};

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
  // Industry-specific configuration state
  const [industryConfig, setIndustryConfig] = useState({
    tablesCount: 12,
    serviceDurationMin: 30,
    appointmentMode: false,
    operatingHours: '09:00 AM - 10:00 PM',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedType = localStorage.getItem('qfast_business_type');
    if (savedType && AVAILABLE_BUSINESS_TYPES.includes(savedType as BusinessTypeValue)) {
      setBusinessType(savedType as BusinessTypeValue);
    }
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
      setForm((f) => ({ ...f, email: userEmail }));
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 py-12">
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-xl border border-slate-100">
        {/* Header with Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <BrandMark href="/for-business" size="sm" label="Qfast" />
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Step {step} of 3
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 mt-4">
            {step === 1 && 'Select your business category'}
            {step === 2 && 'Essential business details'}
            {step === 3 && 'Customize your service setup'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {step === 1 && 'Choose the industry. Qfast opens a live queue, and restaurants also get table ordering.'}
            {step === 2 && 'This appears on your public queue page and entrance QR.'}
            {step === 3 && 'Tailor queue rules, estimated turnovers, and operating hours for your team.'}
          </p>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-orange-500' : 'bg-slate-200'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-orange-500' : 'bg-slate-200'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 3 ? 'bg-orange-500' : 'bg-slate-200'}`} />
          </div>
        </div>

        {/* Step 1: Industry Category Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {BUSINESS_TYPES.map((b) => {
                const Icon = industryIcons[b.value] || Store;
                const isSelected = businessType === b.value;
                const isAvailable = AVAILABLE_BUSINESS_TYPES.includes(b.value);

                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => {
                      if (isAvailable) setBusinessType(b.value);
                    }}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                        : isAvailable
                        ? 'border-slate-200 hover:border-orange-300 bg-white'
                        : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm ${
                        isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold text-sm text-slate-900 leading-tight">{b.label}</p>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{b.detail}</p>
                      {!isAvailable && (
                        <span className="inline-block text-[10px] text-slate-400 font-semibold mt-1">
                          Available in FIFO preview
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-orange-500/20 text-sm flex items-center justify-center gap-2 mt-4"
            >
              Continue to Details <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Essential Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                placeholder="e.g. Copper Chimney or Apex Clinic"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Unique Slug (for entrance QR &amp; live queue URL) *
              </label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500">
                <span className="bg-slate-50 px-3 py-3 text-slate-400 text-xs flex items-center border-r border-slate-200">
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
                  className="flex-1 px-3 py-3 text-sm outline-none font-mono"
                  placeholder="copper-chimney"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="contact@business.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Physical Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                placeholder="100 Feet Rd, Indiranagar, Bengaluru, Karnataka"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!form.name || !form.slug}
                onClick={() => setStep(3)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-md text-sm flex items-center justify-center gap-2"
              >
                Service Configuration <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Industry-Specific Service Configuration & Launch */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl bg-orange-50/60 border border-orange-200/80 p-4">
              <p className="text-xs font-bold text-orange-900 uppercase tracking-wide">
                Configuring: {businessType}
              </p>
              <p className="text-xs text-orange-700/80 mt-0.5">
                These settings pre-populate your live queue rules and can be fine-tuned at any time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {businessType === 'RESTAURANT' || businessType === 'CAFE'
                    ? 'Total Tables'
                    : 'Service Counters / Doctors'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={industryConfig.tablesCount}
                  onChange={(e) =>
                    setIndustryConfig((c) => ({ ...c, tablesCount: Number(e.target.value) }))
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Avg. Wait / Service
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={industryConfig.serviceDurationMin}
                    onChange={(e) =>
                      setIndustryConfig((c) => ({
                        ...c,
                        serviceDurationMin: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <span className="text-xs font-semibold text-slate-400">mins</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Typical Operating Hours
              </label>
              <input
                type="text"
                value={industryConfig.operatingHours}
                onChange={(e) =>
                  setIndustryConfig((c) => ({ ...c, operatingHours: e.target.value }))
                }
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                placeholder="e.g. 10:00 AM - 11:00 PM"
              />
            </div>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3 font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-orange-500/20 text-sm flex items-center justify-center gap-2"
              >
                {loading ? 'Creating workspace…' : '🚀 Launch Qfast Workspace'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
