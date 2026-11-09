'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, RefreshCw } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { downloadQrCode, generateQrDataUrl } from '@/lib/qr';
import { getBusinessPublicPath, isFoodBusiness } from '@/lib/business-links';

export default function DashboardPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [siteOrigin, setSiteOrigin] = useState('');
  const [entranceQrDataUrl, setEntranceQrDataUrl] = useState('');
  const [qrDownloading, setQrDownloading] = useState(false);
  const [qrError, setQrError] = useState('');
  const isFetching = useRef(false);
  const router = useRouter();

  const apiUrl = getApiUrl();

  const fetchDashboardData = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setRefreshing(true);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/auth/login');
      isFetching.current = false;
      setRefreshing(false);
      return;
    }

    try {
      const [userRes, bizRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/v1/business`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (userRes.status === 401 || bizRes.status === 401) {
        localStorage.clear();
        router.replace('/auth/login');
        return;
      }

      if (!bizRes.ok) throw new Error('Could not load your organization details.');
      const bizData = await bizRes.json();

      const bizArray = Array.isArray(bizData) ? bizData : [];
      setBusinesses(bizArray);

      if (bizArray.length > 0) {
        const curBiz = bizArray[0];
        setSelectedBusiness(curBiz);

        // Fetch real-time overview stats
        const statsRes = await fetch(`${apiUrl}/api/v1/orders/overview/${curBiz.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!statsRes.ok) throw new Error('Organization details loaded, but live metrics are unavailable.');
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        setSelectedBusiness(null);
        setStats(null);
      }
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to Qfast. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    setSiteOrigin(window.location.origin);
    void fetchDashboardData();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchDashboardData();
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const entranceUrl = selectedBusiness && siteOrigin
    ? `${siteOrigin}${getBusinessPublicPath(selectedBusiness.slug, selectedBusiness.type)}?source=walkin`
    : '';
  const foodBusiness = isFoodBusiness(selectedBusiness?.type);

  useEffect(() => {
    let cancelled = false;
    setEntranceQrDataUrl('');
    if (!entranceUrl) return;

    generateQrDataUrl(entranceUrl)
      .then((dataUrl) => {
        if (!cancelled) setEntranceQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate entrance QR code:', err);
        if (!cancelled) setQrError('Could not generate the entrance QR code. Please refresh and try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [entranceUrl]);

  const handleDownloadEntranceQr = async () => {
    if (!entranceUrl || qrDownloading) return;
    setQrDownloading(true);
    setQrError('');
    try {
      await downloadQrCode(
        entranceUrl,
        `${selectedBusiness?.slug || 'restaurant'}-entrance-queue-qr.png`,
      );
    } catch (err) {
      console.error('Failed to download entrance QR code:', err);
      setQrError('Could not download the entrance QR code. Please try again.');
    } finally {
      setQrDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-500 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your organization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
      {error && (
        <div
          role="alert"
          className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void fetchDashboardData()}
            disabled={refreshing}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 font-semibold transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Try again
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {foodBusiness ? 'Restaurant overview' : 'Business overview'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {foodBusiness
              ? "Your service status, today's activity, and recent orders."
              : "Your organization’s queue status and customer flow."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500" aria-live="polite">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => void fetchDashboardData()}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div>
        {businesses.length === 0 ? (
          /* Empty State - No Business */
          <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-orange-100 bg-white p-6 text-center shadow-sm sm:p-10">
            <span className="text-5xl block mb-4">🍽️</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Qfast!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Set up your organization to create its Qfast profile and FIFO queue.
            </p>
            <Link
              href="/dashboard/onboarding"
              className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md text-sm"
            >
              Set up your organization →
            </Link>
          </div>
        ) : (
          /* Full Operations Hub */
          <div className="space-y-6">
            {/* Business Status Card */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold opacity-80">
                  {foodBusiness ? 'Active Restaurant' : 'Active Organization'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black mt-1">{selectedBusiness?.name}</h1>
                <p className="text-xs mt-1 opacity-90">
                  Slug: <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded">{selectedBusiness?.slug}</span> •{' '}
                  Plan: <span className="font-semibold uppercase">{selectedBusiness?.subscriptions?.[0]?.plan?.name || 'Essential'}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 self-stretch sm:self-auto">
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center">
                  {entranceQrDataUrl ? (
                    <img
                      src={entranceQrDataUrl}
                      alt={`Queue QR code for ${selectedBusiness?.name || 'your organization'}`}
                      className="h-32 w-32 rounded-lg bg-white sm:h-36 sm:w-36"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 sm:h-36 sm:w-36">
                      Generating QR…
                    </div>
                  )}
                  <span className="text-xs font-bold text-gray-800">Scan to join queue</span>
                  <button
                    type="button"
                    onClick={() => void handleDownloadEntranceQr()}
                    disabled={!entranceQrDataUrl || qrDownloading}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 text-xs font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={14} />
                    {qrDownloading ? 'Preparing…' : 'Download QR'}
                  </button>
                  {qrError && <p role="alert" className="max-w-40 text-[11px] font-medium text-red-700">{qrError}</p>}
                </div>
                <a
                  href={getBusinessPublicPath(selectedBusiness?.slug, selectedBusiness?.type)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white text-orange-600 hover:bg-orange-50 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  Test Queue Page
                </a>
              </div>
            </div>

            {/* Live Stats Grid */}
            <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${foodBusiness ? 'xl:grid-cols-4' : 'xl:grid-cols-2'} sm:gap-4`}>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">Live Queue</span>
                  <span className="text-xl">🎟️</span>
                </div>
                <div className="text-2xl font-black text-brand-600 sm:text-3xl">
                  {stats?.waitingQueueCount ?? 0} waiting
                </div>
                <div className="text-xs text-gray-400 mt-1">Customers in line</div>
              </div>

              {foodBusiness && <>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">Active Kitchen Orders</span>
                  <span className="text-xl">🍳</span>
                </div>
                <div className="text-2xl font-black text-gray-900 sm:text-3xl">
                  {stats?.activeOrdersCount ?? 0} in progress
                </div>
                <div className="text-xs text-gray-400 mt-1">Pending &amp; cooking</div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">Table Occupancy</span>
                  <span className="text-xl">🍽️</span>
                </div>
                <div className="text-2xl font-black text-gray-900 sm:text-3xl">
                  {stats?.occupiedTables ?? 0} / {stats?.totalTables ?? 0} tables
                </div>
                <div className="text-xs text-gray-400 mt-1">Dine-in floor status</div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">Today's Revenue</span>
                  <span className="text-xl">💰</span>
                </div>
                <div className="text-2xl font-black text-green-600 sm:text-3xl">
                  ₹{Number(stats?.todayRevenue ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {stats?.todayCompletedOrders ?? 0} orders completed
                </div>
              </div>
              </>}
            </div>

            {/* Recent Orders Stream */}
            {foodBusiness && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Recent Customer Orders</h3>
                <Link
                  href="/dashboard/kds"
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Open Live Kitchen KDS →
                </Link>
              </div>

              {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <span className="text-3xl block mb-1">🧾</span>
                  <p className="text-xs font-medium">No customer orders placed yet today.</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Scan the entrance or table QR code to simulate a live customer order.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.recentOrders.map((order: any) => (
                    <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          {order.table?.name ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                              🍽️ {order.table.name}
                            </span>
                          ) : order.source === 'QUEUE_PREORDER' || order.queueToken ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                              ⏳ Queue #{order.queueToken?.tokenNumber || ''} Pre-order
                            </span>
                          ) : (
                            <span className="bg-purple-50 text-purple-800 border border-purple-200 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                              🛍️ Takeaway
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              order.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'READY'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-brand-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-gray-400 mt-0.5">
                          {order.items?.length || 0} items • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-sm text-gray-900 block">
                          ₹{Number(order.totalAmount).toFixed(2)}
                        </span>
                        <a
                          href={`/r/${selectedBusiness?.slug}/order/${order.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-brand-600 hover:underline"
                        >
                          View tracking ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
