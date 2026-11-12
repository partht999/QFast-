'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/brand-mark';
import { getApiUrl } from '@/lib/api';
import { AVAILABLE_BUSINESS_TYPES, BUSINESS_TYPES, BusinessTypeValue } from '@/lib/business-types';
import { getBusinessPublicPath } from '@/lib/business-links';
import { googleReviewTarget } from '@/lib/google-place';
import { isIndianMobile, localMobile } from '@/lib/phone';
import { PhotoUpload, uploadStoredPhoto } from '@/components/photo-upload';
import { readApiError } from '@/lib/read-api-error';
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
    tablesCount: 8,
    serviceDurationMin: 15,
  });
  const [logo, setLogo] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [gstin, setGstin] = useState('');
  const [useGoogleReviews, setUseGoogleReviews] = useState(true);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [stampsForReward, setStampsForReward] = useState(8);
  const [rewardName, setRewardName] = useState('Free visit');
  const [createdId, setCreatedId] = useState('');
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const foodBusiness = businessType === 'RESTAURANT' || businessType === 'CAFE';
  const setupLimit = foodBusiness ? 40 : 20;

  useEffect(() => {
    const savedType = localStorage.getItem('qfast_business_type');
    if (savedType && AVAILABLE_BUSINESS_TYPES.includes(savedType as BusinessTypeValue)) {
      setBusinessType(savedType as BusinessTypeValue);
    }
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail?.includes('@')) {
      setForm((f) => ({ ...f, email: userEmail }));
    }
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setIndustryConfig((current) => {
      const next = Math.min(Math.max(current.tablesCount || 1, 1), setupLimit);
      if (next === current.tablesCount) return current;
      return { ...current, tablesCount: next };
    });
  }, [setupLimit]);

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm((f) => ({ ...f, name, slug }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim() || form.slug.trim().length < 3) {
      setError('Add the business name and a link of at least 3 characters.');
      return;
    }
    if (foodBusiness && !isIndianMobile(form.phone)) {
      setError('Enter a 10-digit mobile number.');
      return;
    }
    if (foodBusiness && form.address.trim().length < 8) {
      setError('Add the restaurant address.');
      return;
    }
    if (foodBusiness && !logo) {
      setError('Add a logo. Guests see it on the menu and the bill.');
      return;
    }
    if (foodBusiness && useGoogleReviews && !googleReviewTarget(googlePlaceId)) {
      setError('Paste the Google Maps link, or turn Google reviews off.');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid contact email, or leave it blank.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    const apiUrl = getApiUrl();
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      let businessId = createdId;
      if (!businessId) {
        const res = await fetch(`${apiUrl}/api/v1/business`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
            type: businessType,
            ...(form.phone.trim() ? { phone: localMobile(form.phone) || form.phone.trim() } : {}),
            ...(form.email.trim() ? { email: form.email.trim() } : {}),
            ...(form.address.trim() ? { address: form.address.trim() } : {}),
            timezone: form.timezone,
            counterCount: foodBusiness ? Math.min(Math.max(industryConfig.tablesCount || 1, 1), setupLimit) : 1,
            averageWaitMinutes: Math.min(Math.max(industryConfig.serviceDurationMin || 10, 1), 180),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(readApiError(data, 'Failed to create business'));
        businessId = data.id;
        setCreatedId(businessId);
      }

      let logoUrl = logo;
      if (logo.startsWith('data:')) {
        logoUrl = await uploadStoredPhoto(businessId, logo);
        setLogo(logoUrl);
      }

      if (foodBusiness || logoUrl) {
        const settings = await fetch(`${apiUrl}/api/v1/business/${businessId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            phone: localMobile(form.phone) || form.phone.trim(),
            address: form.address.trim(),
            ...(logoUrl ? { logoUrl } : {}),
            ...(foodBusiness
              ? {
                  instagramHandle: instagramHandle.trim(),
                  gstin: gstin.trim(),
                  googlePlaceId: useGoogleReviews ? googlePlaceId.trim() : '',
                  averageWaitMinutes: Math.min(Math.max(industryConfig.serviceDurationMin || 10, 1), 180),
                }
              : {}),
          }),
        });
        const settingsData = await settings.json().catch(() => ({}));
        if (!settings.ok) throw new Error(readApiError(settingsData, 'The restaurant was created. Save the remaining details again.'));
      }

      if (foodBusiness) {
        const loyalty = await fetch(`${apiUrl}/api/v1/loyalty/program/${businessId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            stampsForReward: Math.min(Math.max(stampsForReward || 8, 2), 20),
            rewardName: rewardName.trim() || 'Free visit',
          }),
        });
        const loyaltyData = await loyalty.json().catch(() => ({}));
        if (!loyalty.ok) throw new Error(readApiError(loyaltyData, 'The restaurant was created. Save the stamp card from Settings.'));
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error creating business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="ui-card p-6 sm:p-10">
        {/* Header with Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <BrandMark href="/" size="sm" label="Qfast" />
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Step {step} of 2
            </span>
          </div>

          <h1 className="ui-title mt-4">
            {step === 1 && 'Select your business category'}
            {step === 2 && 'Essential business details'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {step === 1 && 'Choose the industry. Restaurants and cafes also get table ordering.'}
            {step === 2 &&
              (foodBusiness
                ? 'Add the restaurant, the logo, and Google reviews now. You can turn Google reviews off.'
                : 'Name and phone are enough. You get the full product free for 30 days.')}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-orange-500' : 'bg-slate-200'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-orange-500' : 'bg-slate-200'}`} />
            <div className="hidden" />
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
                  {origin || 'your-site'}{getBusinessPublicPath('', businessType).replace(/\/$/, '')}/
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
                  Mobile Number{foodBusiness ? ' *' : ''}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: localMobile(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="9876543210"
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
                Physical Address{foodBusiness ? ' *' : ''}
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                placeholder="100 Feet Rd, Indiranagar, Bengaluru, Karnataka"
              />
            </div>

            {foodBusiness && (
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <PhotoUpload
                  label="Restaurant logo *"
                  value={logo}
                  onChange={setLogo}
                  hint="Guests see this on the menu and on the bill. JPG, PNG, or WebP."
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">GSTIN</label>
                    <input
                      value={gstin}
                      onChange={(event) => setGstin(event.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Instagram</label>
                    <input
                      value={instagramHandle}
                      onChange={(event) => setInstagramHandle(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      placeholder="yourplace"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Tables</label>
                    <input
                      type="number"
                      min={1}
                      max={setupLimit}
                      value={Math.min(industryConfig.tablesCount, setupLimit)}
                      onChange={(event) => setIndustryConfig((current) => ({ ...current, tablesCount: Number(event.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Usual wait, minutes</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      step={5}
                      value={industryConfig.serviceDurationMin}
                      onChange={(event) => setIndustryConfig((current) => ({ ...current, serviceDurationMin: Number(event.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Stamps for a reward</label>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={stampsForReward}
                      onChange={(event) => setStampsForReward(Number(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Reward</label>
                    <input
                      value={rewardName}
                      onChange={(event) => setRewardName(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-start gap-3 text-sm font-bold text-slate-900">
                    <input
                      type="checkbox"
                      checked={useGoogleReviews}
                      onChange={(event) => setUseGoogleReviews(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Ask guests for a Google review
                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        After they pay and close the bill, they can open your Google listing. Turn this off if you do not want that.
                      </span>
                    </span>
                  </label>
                  {useGoogleReviews && (
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Google Maps link *</label>
                      <input
                        value={googlePlaceId}
                        onChange={(event) => setGooglePlaceId(event.target.value)}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                      {googleReviewTarget(googlePlaceId) ? (
                        <a href={googleReviewTarget(googlePlaceId)?.reviewUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-emerald-700">
                          This link works
                        </a>
                      ) : googlePlaceId.trim() ? (
                        <p className="mt-1 text-xs font-medium text-amber-700">Paste a Google Maps link or a Place ID.</p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">Open Google Maps, find the restaurant, and paste the share link.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
                {error}
              </div>
            )}

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
                disabled={!form.name.trim() || form.slug.trim().length < 3 || loading}
                onClick={() => void handleSubmit()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-md text-sm flex items-center justify-center gap-2"
              >
                {loading ? 'Opening your queue…' : 'Open my queue'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
