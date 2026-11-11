'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Star, CheckCircle2, ExternalLink, MessageSquare, Save } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { isFoodBusiness } from '@/lib/business-links';
import { directReviewUrl, googleReviewTarget } from '@/lib/google-place';
import { readApiError } from '@/lib/read-api-error';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function ReviewsManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [feedbackData, setFeedbackData] = useState<{
    averageRating: number | null;
    totalCount: number;
    items: any[];
  }>({ averageRating: null, totalCount: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [savedReviewUrl, setSavedReviewUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'POSITIVE' | 'CRITICAL'>('ALL');
  const [resolveTarget, setResolveTarget] = useState<any>(null);

  const router = useRouter();
  const toast = useToast();
  const apiUrl = getApiUrl();

  const fetchData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    try {
      const bizRes = await fetch(`${apiUrl}/api/v1/business`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bizRes.status === 401) {
        router.push('/auth/login');
        return;
      }
      const bizList = await bizRes.json();
      if (bizList.length > 0) {
        const curBiz = bizList[0];
        setBusiness(curBiz);
        setGooglePlaceId(curBiz.googlePlaceId || '');
        setSavedReviewUrl(curBiz.googleReviewUrl || '');

        const fbRes = await fetch(`${apiUrl}/api/v1/reviews/${curBiz.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fbRes.ok) {
          const data = await fbRes.json();
          setFeedbackData(data);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Network Error', 'Failed to load guest reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveGoogleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setSavingSettings(true);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${apiUrl}/api/v1/reviews/${business.id}/google-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          googlePlaceId: googlePlaceId.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(readApiError(data, 'Could not save the Google listing'));
      toast.success('Review link saved', 'Guests now open Google’s page to rate you.');
      fetchData();
    } catch (err: any) {
      toast.error('Save Failed', err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateStatus = async (feedbackId: string, status: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${apiUrl}/api/v1/reviews/${feedbackId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Feedback Updated', `Marked as ${status.toLowerCase()}.`);
        fetchData();
      }
    } catch (err) {
      toast.error('Error', 'Failed to update feedback status.');
    }
  };

  const previewUrl = directReviewUrl(googlePlaceId) || directReviewUrl(savedReviewUrl) || googleReviewTarget(googlePlaceId)?.reviewUrl || '';
  const opensRatingForm = previewUrl.includes('writereview') || /g\.page\/.+\/review/i.test(previewUrl);
  const items = feedbackData.items || [];
  const positiveCount = items.filter((fb) => fb.rating >= 4).length;
  const criticalCount = items.filter((fb) => fb.rating < 4).length;
  const pendingCount = items.filter((fb) => fb.status !== 'RESOLVED').length;

  const filteredItems = useMemo(() => {
    return items.filter((fb) => {
      if (activeFilter === 'PENDING') return fb.status !== 'RESOLVED';
      if (activeFilter === 'RESOLVED') return fb.status === 'RESOLVED';
      if (activeFilter === 'POSITIVE') return fb.rating >= 4;
      if (activeFilter === 'CRITICAL') return fb.rating < 4;
      return true;
    });
  }, [items, activeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Loading reviews &amp; ratings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-500" />
            <h1 className="text-base font-extrabold text-gray-900">
              {isFoodBusiness(business?.type) ? 'Reviews' : 'Google review'}
            </h1>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              ★ {items.length > 0 ? feedbackData.averageRating.toFixed(1) : '—'} average
            </span>
          </div>
          {!isFoodBusiness(business?.type) && (
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              When a visit is finished, the guest can rate you on Google. The link opens the rating page, not just the map.
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Average', items.length ? feedbackData.averageRating.toFixed(1) : '—', 'Private notes'],
            ['4–5 stars', String(positiveCount), 'Happy notes'],
            ['Needs a look', String(pendingCount), 'Not marked done'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-black text-gray-950">{value}</p>
              <p className="text-xs text-gray-500">{hint}</p>
            </div>
          ))}
        </div>

        {/* Metrics & Google Place ID Integration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Rating Breakdown Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Private rating
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-amber-500">★ {feedbackData.totalCount && feedbackData.averageRating != null ? feedbackData.averageRating.toFixed(1) : '—'}</span>
                <span className="text-xs text-gray-400 font-semibold">/ 5.0</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Based on <strong className="text-gray-900">{feedbackData.totalCount}</strong> verified guest reviews
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  4–5 stars
                </span>
                <span className="font-extrabold text-gray-900">{positiveCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-bold text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  1–3 stars
                </span>
                <span className="font-extrabold text-gray-900">{criticalCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs md:col-span-2 space-y-3">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <span>Google review link</span>
                {googleReviewTarget(googlePlaceId) ? (
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Link ready
                  </span>
                ) : (
                  <span className="text-[11px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    Paste a Maps link
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Paste the Google Maps link. Guests then land on the page where they rate the restaurant.
              </p>
            </div>

            <form onSubmit={handleSaveGoogleSettings} className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                  placeholder="https://www.google.com/maps/place/..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-98 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? 'Saving...' : 'Save'}</span>
                </button>
              </div>

              {previewUrl && (
                <div className={`rounded-xl border p-3 text-xs ${opensRatingForm ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  <p className="font-semibold">{opensRatingForm ? 'This opens Google’s rating page.' : 'Save the link. If Google only gave a map link, we turn it into the rating page when we can.'}</p>
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-bold hover:underline">
                    Open the rating page
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
              {googlePlaceId.trim() && !googleReviewTarget(googlePlaceId) && (
                <p className="text-xs text-amber-700">Paste a Google Maps link, such as maps.app.goo.gl, or a Place ID.</p>
              )}
            </form>
          </div>
        </div>

        {/* Feedback Stream & Filtering */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <span>Guest Feedback Inbox ({items.length})</span>
                {pendingCount > 0 && (
                  <span className="text-xs bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                    {pendingCount} unresolved
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Direct ratings and constructive comments from customers
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'ALL', label: `All (${items.length})` },
                { id: 'PENDING', label: `Needs Attention (${pendingCount})` },
                { id: 'RESOLVED', label: 'Resolved' },
                { id: 'POSITIVE', label: '4–5★' },
                { id: 'CRITICAL', label: '1–3★' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold transition-all ${
                    activeFilter === tab.id
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No customer feedback yet"
              description="After dining or picking up pre-orders, guests are prompted on their phone to rate their experience. Their feedback will automatically show here."
            />
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xs">No feedback matching the selected filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredItems.map((fb) => {
                const isCritical = fb.rating < 4;
                return (
                  <div key={fb.id} className="py-4 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex text-amber-400 text-base">
                          {'★'.repeat(fb.rating)}
                          <span className="text-gray-200">{'★'.repeat(5 - fb.rating)}</span>
                        </div>
                        <span className="text-xs font-black text-gray-900">
                          {fb.rating} / 5 Stars
                        </span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            fb.status === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isCritical
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {fb.status === 'RESOLVED' ? 'Resolved ✓' : isCritical ? 'Needs Attention' : 'New Feedback'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {fb.status !== 'RESOLVED' ? (
                          <button
                            onClick={() => setResolveTarget(fb)}
                            className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Issue addressed</span>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {fb.tags && fb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {fb.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-orange-50 text-orange-800 font-bold px-2 py-0.5 rounded-md border border-orange-200/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Customer Comment */}
                    {fb.comment && (
                      <p className="text-xs text-gray-800 bg-gray-50 rounded-xl p-3 border border-gray-200/60 leading-relaxed">
                        "{fb.comment}"
                      </p>
                    )}

                    <span className="text-[10px] text-gray-400 block">
                      Received {new Date(fb.createdAt).toLocaleDateString()} at{' '}
                      {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <ConfirmModal
        isOpen={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        onConfirm={() => {
          const id = resolveTarget?.id;
          setResolveTarget(null);
          if (id) void handleUpdateStatus(id, 'RESOLVED');
        }}
        title="Mark this feedback done?"
        description={
          resolveTarget
            ? `The ${resolveTarget.rating}-star note will move to resolved. You can still read it later.`
            : 'This note will move to resolved.'
        }
        confirmLabel="Mark done"
        cancelLabel="Go back"
        variant="primary"
      />
    </div>
  );
}
