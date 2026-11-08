'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

export default function ReviewsManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [feedbackData, setFeedbackData] = useState<{
    averageRating: number;
    totalCount: number;
    items: any[];
  }>({ averageRating: 5.0, totalCount: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const router = useRouter();

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
    setSaveSuccess(false);
    const token = localStorage.getItem('accessToken');

    try {
      await fetch(`${apiUrl}/api/v1/reviews/${business.id}/google-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          googlePlaceId: googlePlaceId.trim() || undefined,
        }),
      });
      setSaveSuccess(true);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateStatus = async (feedbackId: string, status: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`${apiUrl}/api/v1/reviews/${feedbackId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xl font-black text-brand-600">
            ⚡ Qfast
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-bold text-gray-800">Reviews &amp; Private Feedback</h1>
        </div>

        <Link
          href="/dashboard"
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Overview
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Rating Metrics & Google Place ID Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Average Rating
            </span>
            <div className="text-4xl font-black text-amber-500 flex items-center justify-center gap-1">
              <span>★</span>
              <span>{feedbackData.averageRating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Based on {feedbackData.totalCount} private reviews
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm md:col-span-2">
            <h3 className="font-extrabold text-sm text-gray-900 mb-1">
              Google Maps Review Link (Policy Compliant)
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Configure your Google Place ID. When diners complete their meal, they are given a direct link to post a verified Google review.
            </p>

            <form onSubmit={handleSaveGoogleSettings} className="flex gap-2">
              <input
                type="text"
                value={googlePlaceId}
                onChange={(e) => setGooglePlaceId(e.target.value)}
                placeholder="Google Place ID (e.g. ChIJN1t_tDeuEmsRUsoyG83frY4)"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingSettings}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                {savingSettings ? 'Saving…' : 'Save'}
              </button>
            </form>
            {saveSuccess && (
              <p className="text-[11px] text-green-600 mt-1 font-semibold">
                ✓ Google Place settings saved successfully!
              </p>
            )}
          </div>
        </div>

        {/* Feedback Inbox */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-gray-900">Feedback Inbox</h3>
              <p className="text-xs text-gray-400">Private ratings submitted by diners</p>
            </div>
          </div>

          {feedbackData.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-2">📬</span>
              <p className="font-bold text-gray-700">No feedback submitted yet</p>
              <p className="text-xs mt-1">Diners are prompted for feedback after their orders are marked completed.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {feedbackData.items.map((fb) => (
                <div key={fb.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex text-amber-400 text-sm">
                        {'★'.repeat(fb.rating)}
                        <span className="text-gray-200">{'★'.repeat(5 - fb.rating)}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        {fb.rating} / 5 Stars
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          fb.status === 'NEW'
                            ? 'bg-red-100 text-red-800'
                            : fb.status === 'ACKNOWLEDGED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {fb.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {fb.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(fb.id, 'RESOLVED')}
                          className="text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Mark Resolved ✓
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {fb.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {fb.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-orange-50 text-brand-700 font-semibold px-2 py-0.5 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Comment */}
                  {fb.comment && (
                    <p className="text-xs text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100">
                      "{fb.comment}"
                    </p>
                  )}

                  <span className="text-[10px] text-gray-400 block">
                    Received on {new Date(fb.createdAt).toLocaleDateString()} at{' '}
                    {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
