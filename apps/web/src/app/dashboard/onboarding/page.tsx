'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { PhotoUpload, uploadStoredPhoto } from '@/components/photo-upload';
import { getApiUrl } from '@/lib/api';
import { AVAILABLE_BUSINESS_TYPES, BUSINESS_TYPES, BusinessTypeValue } from '@/lib/business-types';
import { getBusinessPublicPath } from '@/lib/business-links';
import { googleReviewTarget } from '@/lib/google-place';
import { localMobile } from '@/lib/phone';
import { readApiError } from '@/lib/read-api-error';

type StepId = 'type' | 'place' | 'queue' | 'tables' | 'photos' | 'reviews' | 'stamps' | 'details';

type PlaceResult = { id: string; name: string; address: string };

const copy: Record<StepId, { title: string; body: string }> = {
  type: {
    title: 'What kind of place is this?',
    body: 'Qfast opens a live queue for the kind of visit you run. Restaurants and cafes also get table ordering, bills, and a stamp card. Clinics, salons, and service desks get the queue and a Google review after the visit.',
  },
  place: {
    title: 'The page guests open',
    body: 'The name and the link are what people see when they scan the entrance QR. The phone and address are shown on that page and on the bill.',
  },
  queue: {
    title: 'The live queue',
    body: 'Guests take a number from the entrance QR and watch their place on their phone. Your team calls the next person from the queue board. The usual wait is the number we show them.',
  },
  tables: {
    title: 'Tables and ordering',
    body: 'Each table gets its own QR. Guests open the menu, order, and ask for the bill from that table. You can add or rename tables later.',
  },
  photos: {
    title: 'Logo and photo',
    body: 'The logo sits beside the Qfast mark on the guest page and on the bill. The restaurant photo is the picture at the top of the join page.',
  },
  reviews: {
    title: 'Google reviews',
    body: 'When a visit is finished, the guest can rate you on Google. Search for the listing and select it, or paste the Maps link. You can leave this off.',
  },
  stamps: {
    title: 'Loyalty stamp card',
    body: 'A regular collects one stamp each finished visit. A full card is the reward, then the next card starts. Staff add stamps and give the reward from the Loyalty section. Guests check their card with their phone number.',
  },
  details: {
    title: 'Bill details',
    body: 'GSTIN is printed on the bill when you add it. Instagram is a link on the guest page. Both can wait until Settings.',
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [businessType, setBusinessType] = useState<BusinessTypeValue>('RESTAURANT');
  const [form, setForm] = useState({ name: '', slug: '', phone: '', email: '', address: '' });
  const [averageWait, setAverageWait] = useState(10);
  const [remoteJoin, setRemoteJoin] = useState(true);
  const [useTables, setUseTables] = useState(true);
  const [tablesCount, setTablesCount] = useState(8);
  const [usePhotos, setUsePhotos] = useState(true);
  const [logo, setLogo] = useState('');
  const [cover, setCover] = useState('');
  const [useReviews, setUseReviews] = useState(true);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [placesConfigured, setPlacesConfigured] = useState<boolean | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [useStamps, setUseStamps] = useState(true);
  const [stampsForReward, setStampsForReward] = useState(8);
  const [rewardName, setRewardName] = useState('Free visit');
  const [gstin, setGstin] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const foodBusiness = businessType === 'RESTAURANT' || businessType === 'CAFE';
  const steps = useMemo<StepId[]>(
    () => (foodBusiness ? ['type', 'place', 'queue', 'tables', 'photos', 'reviews', 'stamps', 'details'] : ['type', 'place', 'queue', 'reviews']),
    [foodBusiness],
  );
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    const savedType = localStorage.getItem('qfast_business_type');
    if (savedType && AVAILABLE_BUSINESS_TYPES.includes(savedType as BusinessTypeValue)) {
      setBusinessType(savedType as BusinessTypeValue);
    }
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail?.includes('@')) setForm((current) => ({ ...current, email: userEmail }));
    setOrigin(window.location.origin);
  }, []);

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm((current) => ({ ...current, name, slug }));
  };

  const searchPlaces = async () => {
    const token = localStorage.getItem('accessToken');
    setSearchingPlaces(true);
    setError('');
    try {
      const response = await fetch(`${getApiUrl()}/api/v1/business/places?q=${encodeURIComponent(placeQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, 'Could not search Google Maps'));
      setPlacesConfigured(Boolean(data.configured));
      setPlaces(Array.isArray(data.places) ? data.places : []);
      if (data.configured && (!data.places || data.places.length === 0)) {
        setError('No listings matched. Try the full name and area, or paste the Maps link.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not search Google Maps');
    } finally {
      setSearchingPlaces(false);
    }
  };

  const finish = async () => {
    setError('');
    if (!form.name.trim() || form.slug.trim().length < 3) {
      setError('Add the business name and a link of at least 3 characters.');
      setStepIndex(steps.indexOf('place'));
      return;
    }
    if (useReviews && !googleReviewTarget(googlePlaceId)) {
      setError('Select a Google listing, paste the Maps link, or skip reviews.');
      setStepIndex(steps.indexOf('reviews'));
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    setLoading(true);
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    try {
      let businessId = createdId;
      if (!businessId) {
        const response = await fetch(`${getApiUrl()}/api/v1/business`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
            type: businessType,
            ...(form.phone.trim() ? { phone: localMobile(form.phone) || form.phone.trim() } : {}),
            ...(form.email.trim() ? { email: form.email.trim() } : {}),
            ...(form.address.trim() ? { address: form.address.trim() } : {}),
            timezone: 'Asia/Kolkata',
            counterCount: foodBusiness && useTables ? Math.min(Math.max(tablesCount || 1, 1), 40) : foodBusiness ? 0 : 1,
            averageWaitMinutes: Math.min(Math.max(averageWait || 10, 1), 180),
            remoteJoinEnabled: remoteJoin,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(readApiError(data, 'Could not create the business'));
        businessId = data.id;
        setCreatedId(businessId);
      }

      let logoUrl = usePhotos ? logo : '';
      let coverUrl = usePhotos ? cover : '';
      if (logoUrl.startsWith('data:')) {
        logoUrl = await uploadStoredPhoto(businessId, logoUrl);
        setLogo(logoUrl);
      }
      if (coverUrl.startsWith('data:')) {
        coverUrl = await uploadStoredPhoto(businessId, coverUrl);
        setCover(coverUrl);
      }

      const settings = await fetch(`${getApiUrl()}/api/v1/business/${businessId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          phone: form.phone.trim() ? localMobile(form.phone) || form.phone.trim() : '',
          address: form.address.trim(),
          logoUrl,
          coverUrl,
          googlePlaceId: useReviews ? googlePlaceId.trim() : '',
          averageWaitMinutes: Math.min(Math.max(averageWait || 10, 1), 180),
          ...(foodBusiness
            ? { instagramHandle: instagramHandle.trim(), gstin: gstin.trim() }
            : {}),
        }),
      });
      const settingsData = await settings.json().catch(() => ({}));
      if (!settings.ok) throw new Error(readApiError(settingsData, 'The business was created. Save the rest from Settings.'));

      if (foodBusiness && useStamps) {
        const loyalty = await fetch(`${getApiUrl()}/api/v1/loyalty/program/${businessId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'VISIT_STAMPS',
            stampsForReward: Math.min(Math.max(stampsForReward || 8, 2), 20),
            rewardName: rewardName.trim() || 'Free visit',
          }),
        });
        const loyaltyData = await loyalty.json().catch(() => ({}));
        if (!loyalty.ok) throw new Error(readApiError(loyaltyData, 'The business was created. Turn the stamp card on from Loyalty.'));
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish setup');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setError('');
    if (step === 'place' && (!form.name.trim() || form.slug.trim().length < 3)) {
      setError('Add the business name and a link of at least 3 characters.');
      return;
    }
    if (step === 'reviews' && useReviews && !googleReviewTarget(googlePlaceId)) {
      setError('Select a listing, paste a Maps link, or skip Google reviews.');
      return;
    }
    if (stepIndex >= steps.length - 1) {
      void finish();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const skip = () => {
    setError('');
    if (step === 'tables') setUseTables(false);
    if (step === 'photos') setUsePhotos(false);
    if (step === 'reviews') setUseReviews(false);
    if (step === 'stamps') setUseStamps(false);
    if (step === 'queue') setRemoteJoin(false);
    if (stepIndex >= steps.length - 1) {
      void finish();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="ui-card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <BrandMark href="/" size="sm" label="Qfast" />
          <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
            {stepIndex + 1} of {steps.length}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <h1 className="ui-title mt-6">{copy[step].title}</h1>
        <p className="ui-copy">{copy[step].body}</p>

        <div className="mt-6 space-y-4">
          {step === 'type' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BUSINESS_TYPES.map((type) => {
                const available = AVAILABLE_BUSINESS_TYPES.includes(type.value);
                const selected = businessType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    disabled={!available}
                    onClick={() => setBusinessType(type.value)}
                    className={`rounded-2xl border p-4 text-left ${selected ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 bg-white'} disabled:opacity-50`}
                  >
                    <p className="text-sm font-semibold text-neutral-950">{type.label}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">{type.detail}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step === 'place' && (
            <>
              <label className="ui-label">Business name
                <input value={form.name} onChange={(event) => handleNameChange(event.target.value)} className="ui-field mt-1.5" placeholder="Copper Chimney" />
              </label>
              <label className="ui-label">Guest link
                <div className="mt-1.5 flex overflow-hidden rounded-xl border border-neutral-200">
                  <span className="hidden items-center bg-neutral-50 px-3 text-xs text-neutral-500 sm:flex">
                    {(origin || 'your-site') + getBusinessPublicPath('', businessType).replace(/\/$/, '')}/
                  </span>
                  <input
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
                    placeholder="copper-chimney"
                  />
                </div>
              </label>
              <label className="ui-label">Mobile
                <input value={form.phone} inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, phone: localMobile(event.target.value) }))} className="ui-field mt-1.5" placeholder="9876543210" />
              </label>
              <label className="ui-label">Address
                <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={2} className="ui-field mt-1.5" placeholder="Street, area, city" />
              </label>
            </>
          )}

          {step === 'queue' && (
            <>
              <label className="ui-label">Usual wait, in minutes
                <input type="number" min={1} max={180} value={averageWait} onChange={(event) => setAverageWait(Number(event.target.value))} className="ui-field mt-1.5" />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 p-4 text-sm">
                <input type="checkbox" checked={remoteJoin} onChange={(event) => setRemoteJoin(event.target.checked)} className="mt-1" />
                <span>
                  <span className="font-semibold text-neutral-950">Guests can join from their phone</span>
                  <span className="mt-1 block text-neutral-500">Turn this off if people should only take a number at the counter.</span>
                </span>
              </label>
            </>
          )}

          {step === 'tables' && (
            <label className="ui-label">How many tables should we open?
              <input type="number" min={1} max={40} value={tablesCount} onChange={(event) => setTablesCount(Number(event.target.value))} className="ui-field mt-1.5" />
            </label>
          )}

          {step === 'photos' && (
            <>
              <PhotoUpload label="Logo" value={logo} onChange={setLogo} hint="Square works best. JPG, PNG, or WebP." />
              <PhotoUpload label="Restaurant photo" value={cover} onChange={setCover} hint="A photo of the place. Shown on the guest page." />
            </>
          )}

          {step === 'reviews' && (
            <>
              <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 p-4 text-sm">
                <input type="checkbox" checked={useReviews} onChange={(event) => setUseReviews(event.target.checked)} className="mt-1" />
                <span>
                  <span className="font-semibold text-neutral-950">Ask for a Google review after the visit</span>
                  <span className="mt-1 block text-neutral-500">Leave this off if you do not want that prompt.</span>
                </span>
              </label>
              {useReviews && (
                <>
                  <div className="flex gap-2">
                    <input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} className="ui-field" placeholder="Search the name on Google Maps" />
                    <button type="button" onClick={() => void searchPlaces()} disabled={searchingPlaces || placeQuery.trim().length < 2} className="ui-btn-secondary shrink-0">
                      {searchingPlaces ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                  {placesConfigured === false && (
                    <p className="text-sm leading-6 text-neutral-500">
                      Map search is not connected on this server yet. Open Google Maps, copy the listing link, and paste it below.
                      {placeQuery.trim() && (
                        <>
                          {' '}
                          <a className="font-semibold text-brand-700" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery.trim())}`} target="_blank" rel="noreferrer">
                            Open this search
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  {places.length > 0 && (
                    <ul className="space-y-2">
                      {places.map((place) => (
                        <li key={place.id}>
                          <button
                            type="button"
                            onClick={() => setGooglePlaceId(place.id)}
                            className={`w-full rounded-2xl border p-3 text-left ${googlePlaceId === place.id ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 bg-white'}`}
                          >
                            <p className="text-sm font-semibold text-neutral-950">{place.name}</p>
                            <p className="mt-1 text-xs text-neutral-500">{place.address}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="ui-label">Or paste the Maps link
                    <input value={googlePlaceId} onChange={(event) => setGooglePlaceId(event.target.value)} className="ui-field mt-1.5" placeholder="https://maps.app.goo.gl/…" />
                  </label>
                </>
              )}
            </>
          )}

          {step === 'stamps' && (
            <>
              <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 p-4 text-sm">
                <input type="checkbox" checked={useStamps} onChange={(event) => setUseStamps(event.target.checked)} className="mt-1" />
                <span>
                  <span className="font-semibold text-neutral-950">Use a stamp card</span>
                  <span className="mt-1 block text-neutral-500">You can turn this on later from Loyalty.</span>
                </span>
              </label>
              {useStamps && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="ui-label">Stamps for a reward
                    <input type="number" min={2} max={20} value={stampsForReward} onChange={(event) => setStampsForReward(Number(event.target.value))} className="ui-field mt-1.5" />
                  </label>
                  <label className="ui-label">Reward
                    <input value={rewardName} onChange={(event) => setRewardName(event.target.value)} className="ui-field mt-1.5" placeholder="Free visit" />
                  </label>
                </div>
              )}
            </>
          )}

          {step === 'details' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ui-label">GSTIN
                <input value={gstin} onChange={(event) => setGstin(event.target.value.toUpperCase())} className="ui-field mt-1.5" placeholder="Optional" />
              </label>
              <label className="ui-label">Instagram
                <input value={instagramHandle} onChange={(event) => setInstagramHandle(event.target.value)} className="ui-field mt-1.5" placeholder="yourplace" />
              </label>
            </div>
          )}

          {error && <p className="text-sm font-medium text-red-700">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button type="button" disabled={stepIndex === 0 || loading} onClick={() => setStepIndex((current) => Math.max(0, current - 1))} className="ui-btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex gap-2">
              {step !== 'type' && step !== 'place' && (
                <button type="button" disabled={loading} onClick={skip} className="ui-btn-secondary">
                  {step === 'queue' ? 'Counter only' : 'Skip'}
                </button>
              )}
              <button type="button" disabled={loading} onClick={next} className="ui-btn-primary">
                {loading ? 'Saving…' : stepIndex >= steps.length - 1 ? 'Finish' : 'Continue'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
