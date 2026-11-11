'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Users,
  ChefHat,
  UtensilsCrossed,
  DollarSign,
  ArrowRight,
  Sparkles,
  QrCode,
  ListOrdered,
  Menu as MenuIcon,
  Star,
  Gift,
  X,
  Receipt,
  Clock,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { downloadQrCode, generateQrDataUrl } from '@/lib/qr';
import { getBusinessPublicPath, isFoodBusiness } from '@/lib/business-links';
import { describePayments } from '@/lib/payment';
import { BUSINESS_TYPES } from '@/lib/business-types';
import { useOverlayHistory } from '@/components/navigation-memory';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { TodayReport, TodayReportData } from '@/components/today-report';

export default function DashboardPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [today, setToday] = useState<TodayReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [siteOrigin, setSiteOrigin] = useState('');
  const [entranceQrDataUrl, setEntranceQrDataUrl] = useState('');
  const [qrDownloading, setQrDownloading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const isFetching = useRef(false);
  const router = useRouter();
  const toast = useToast();
  useOverlayHistory(Boolean(selectedOrderDetails), () => setSelectedOrderDetails(null));

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

        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, todayRes] = await Promise.all([
          fetch(`${apiUrl}/api/v1/orders/overview/${curBiz.id}`, { headers }),
          fetch(`${apiUrl}/api/v1/business/${curBiz.id}/today`, { headers }),
        ]);
        if (!statsRes.ok) throw new Error('Organization details loaded, but live metrics are unavailable.');
        setStats(await statsRes.json());
        setToday(todayRes.ok ? await todayRes.json() : null);
      } else {
        setSelectedBusiness(null);
        setStats(null);
        setToday(null);
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

  const handleCopyLink = async () => {
    if (!entranceUrl) return;
    try {
      await navigator.clipboard.writeText(entranceUrl);
      setCopiedLink(true);
      toast.success('Waitlist link copied!', 'Share this URL with guests or add to your website.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Copy failed', 'Please copy URL from the browser bar.');
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
          <EmptyState
            emoji="⚡"
            title="Welcome to Qfast"
            description="Create your business profile to open a live queue. Clinics, salons, labs, service centres, and restaurants each get a public join page and a staff board."
            tip="Setup takes under 2 minutes and unlocks real-time queue management."
            actionLabel="Start Quick Setup Wizard"
            actionHref="/dashboard/onboarding"
            className="my-10"
          />
        ) : (
          /* Full Operations Hub */
          <div className="space-y-6">
            {/* Quick Action Operations Bar */}
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-3 shrink-0 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                Quick Launch
              </span>
              <Link
                href="/dashboard/queue"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200/60 transition-all shrink-0 active:scale-98"
              >
                <ListOrdered className="w-3.5 h-3.5 text-orange-500" />
                <span>Live Waitlist</span>
              </Link>
              {foodBusiness && (
                <>
                  <Link
                    href="/dashboard/kds"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200/60 transition-all shrink-0 active:scale-98"
                  >
                    <ChefHat className="w-3.5 h-3.5 text-amber-500" />
                    <span>Kitchen Display</span>
                  </Link>
                  <Link
                    href="/dashboard/tables"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200/60 transition-all shrink-0 active:scale-98"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-500" />
                    <span>QR codes</span>
                  </Link>
                  <Link
                    href="/dashboard/menu"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200/60 transition-all shrink-0 active:scale-98"
                  >
                    <MenuIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Menu Catalog</span>
                  </Link>
                </>
              )}
              <Link
                href="/dashboard/reviews"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200/60 transition-all shrink-0 active:scale-98"
              >
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                <span>Google Reviews</span>
              </Link>
              {foodBusiness && (
                <Link
                  href="/dashboard/loyalty"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 border border-gray-200/60 transition-all shrink-0 active:scale-98"
                >
                  <Gift className="w-3.5 h-3.5 text-pink-500" />
                  <span>Stamp card</span>
                </Link>
              )}
            </div>

            {/* Business Status & QR Standee Hero Card */}
            <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden">
              <div className="relative z-10 max-w-xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    {BUSINESS_TYPES.find((type) => type.value === selectedBusiness?.type)?.label || 'Business'}
                  </span>
                  <Link href="/dashboard/billing" className="text-xs text-neutral-400 hover:text-white">
                    Plan: <strong className="text-white uppercase font-bold">{selectedBusiness?.subscriptions?.[0]?.plan?.name || 'Free'}</strong>
                    {selectedBusiness?.subscriptions?.[0]?.status === 'TRIALING' && selectedBusiness?.subscriptions?.[0]?.trialEndsAt && (
                      <span className="ml-2 text-orange-300">
                        free until {new Date(selectedBusiness.subscriptions[0].trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </Link>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {selectedBusiness?.name}
                </h2>
                <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                  {foodBusiness
                    ? 'Place this at your entrance so guests can join the live queue, follow their place in line, and pre-order before they are seated.'
                    : 'Place this at your entrance so people can join the live queue and follow their place in line.'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-mono text-neutral-400">
                  <span>Slug:</span>
                  <span className="bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded-md border border-neutral-700">
                    {selectedBusiness?.slug}
                  </span>
                </div>
              </div>

              {/* QR Standee Action Box */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 w-full lg:w-auto">
                <div className="flex flex-col items-center gap-2 bg-white rounded-2xl p-3 text-center shadow-md">
                  {entranceQrDataUrl ? (
                    <img
                      src={entranceQrDataUrl}
                      alt={`Queue QR code for ${selectedBusiness?.name || 'your organization'}`}
                      className="h-32 w-32 rounded-lg bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">
                      Generating QR…
                    </div>
                  )}
                  <span className="text-[11px] font-extrabold text-neutral-900 uppercase tracking-wider">
                    Entrance QR
                  </span>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-44">
                  <button
                    type="button"
                    onClick={() => void handleDownloadEntranceQr()}
                    disabled={!entranceQrDataUrl || qrDownloading}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-3 text-xs font-bold text-white transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 active:scale-98"
                  >
                    <Download size={14} />
                    {qrDownloading ? 'Downloading…' : 'Download PNG'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 text-xs font-bold text-white transition-all border border-white/10 active:scale-98"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedLink ? 'Link Copied!' : 'Copy Guest Link'}
                  </button>

                  <a
                    href={getBusinessPublicPath(selectedBusiness?.slug, selectedBusiness?.type)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 px-3 text-xs font-bold text-neutral-300 transition-all border border-neutral-700 text-center"
                  >
                    <span>Test Guest Page</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Live Stats Grid */}
            <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${foodBusiness ? 'xl:grid-cols-4' : 'xl:grid-cols-2'} sm:gap-4`}>
              {/* Stat 1: Queue */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Live Waitlist</span>
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-gray-900 sm:text-3xl flex items-baseline gap-1.5">
                    <span>{stats?.waitingQueueCount ?? 0}</span>
                    <span className="text-xs font-bold text-gray-400">{foodBusiness ? 'parties' : 'waiting'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {foodBusiness ? 'Currently in line for a table' : 'Currently waiting to be called'}
                  </p>
                </div>
                <Link
                  href="/dashboard/queue"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 pt-2 border-t border-gray-50"
                >
                  <span>Open queue board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {foodBusiness && (
                <>
                  {/* Stat 2: Kitchen */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Kitchen Active</span>
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <ChefHat className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-gray-900 sm:text-3xl flex items-baseline gap-1.5">
                        <span>{stats?.activeOrdersCount ?? 0}</span>
                        <span className="text-xs font-bold text-gray-400">tickets</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Pending and cooking in kitchen</p>
                    </div>
                    <Link
                      href="/dashboard/kds"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 pt-2 border-t border-gray-50"
                    >
                      <span>Open kitchen display</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Stat 3: Table Occupancy */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Table Occupancy</span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-gray-900 sm:text-3xl flex items-baseline gap-1.5">
                        <span>{stats?.occupiedTables ?? 0}</span>
                        <span className="text-xs font-bold text-gray-400">/ {stats?.totalTables ?? 0} tables</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              stats?.totalTables > 0
                                ? Math.min(100, Math.round((stats.occupiedTables / stats.totalTables) * 100))
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {stats?.totalTables > 0
                          ? `${Math.round((stats.occupiedTables / stats.totalTables) * 100)}% dining floor utilized`
                          : 'No tables added yet'}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/tables"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 pt-2 border-t border-gray-50"
                    >
                      <span>Manage tables</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Stat 4: Today's Revenue */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Today's Revenue</span>
                      <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-green-600 sm:text-3xl">
                        ₹{Number(stats?.todayRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats?.todayCompletedOrders ?? 0} served &amp; completed orders
                      </p>
                    </div>
                    <span className="mt-3 text-[11px] text-gray-400 pt-2 border-t border-gray-50 block">
                      Auto-increments upon ticket completion
                    </span>
                  </div>
                </>
              )}
            </div>

            {today && <TodayReport report={today} foodBusiness={foodBusiness} />}

            {/* Recent Orders Stream */}
            {foodBusiness && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">Today's Order Stream</h3>
                    <p className="text-xs text-gray-500">Click any order to view full ticket items and customer notes</p>
                  </div>
                  <Link
                    href="/dashboard/kds"
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <span>Kitchen Display</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
                  <EmptyState
                    emoji="🧾"
                    title="No orders placed yet today"
                    description="When customers scan table or entrance QR codes to order dishes, live tickets will appear here and in your Kitchen Display."
                    tip="You can test placing an order by clicking 'Test Guest Page' above."
                    className="py-8"
                  />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {stats.recentOrders.map((order: any) => (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrderDetails(order)}
                        className="py-3 px-2 rounded-xl hover:bg-gray-50/80 transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-gray-900">
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
                                    : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {order.status}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  describePayments(order.payments, Number(order.totalAmount || 0)).paid
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-amber-50 text-amber-800'
                                }`}
                              >
                                {describePayments(order.payments, Number(order.totalAmount || 0)).paid ? 'Paid' : 'Due'}
                              </span>
                            </div>
                            <p className="text-gray-400 mt-0.5 flex items-center gap-2">
                              <span>{order.customerName || 'Diner'}</span>
                              <span>•</span>
                              <span>{order.items?.length || 0} items</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-sm text-gray-900 block">
                            ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-orange-600 font-semibold hover:underline">
                            Inspect ticket →
                          </span>
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

      {/* Order Detail Modal */}
      {selectedOrderDetails && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">
                    Order Ticket #{selectedOrderDetails.id.slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedOrderDetails.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs bg-gray-50 rounded-2xl p-3">
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Dining Option</span>
                <span className="font-bold text-gray-900">
                  {selectedOrderDetails.table?.name
                    ? `🍽️ Table ${selectedOrderDetails.table.name}`
                    : selectedOrderDetails.source === 'QUEUE_PREORDER'
                    ? `⏳ Queue Pre-order #${selectedOrderDetails.queueToken?.tokenNumber || ''}`
                    : '🛍️ Takeaway'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Guest Info</span>
                <span className="font-bold text-gray-900">
                  {selectedOrderDetails.customerName || 'Diner'}{' '}
                  {selectedOrderDetails.customerPhone ? `(${selectedOrderDetails.customerPhone})` : ''}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Status</span>
                <span className="font-bold text-orange-600">{selectedOrderDetails.status}</span>
              </div>
            </div>

            {selectedOrderDetails.specialInstructions && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-bold">Customer Cooking Request:</span> {selectedOrderDetails.specialInstructions}
              </div>
            )}

            {/* Order Items List */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Items</span>
              {selectedOrderDetails.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start text-xs border-b border-gray-100 pb-2">
                  <div>
                    <span className="font-black text-orange-600 text-sm mr-2">{item.quantity}×</span>
                    <span className="font-bold text-gray-900">{item.menuItem?.name || 'Dish'}</span>
                    {item.specialNote && <p className="text-[11px] text-gray-500 italic ml-6">• {item.specialNote}</p>}
                  </div>
                  <span className="font-bold text-gray-800">
                    ₹{Number(item.totalPrice || item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400">
                  {describePayments(selectedOrderDetails.payments, Number(selectedOrderDetails.totalAmount || 0)).paid
                    ? 'Paid'
                    : 'Due at the counter'}
                </span>
                <p className="text-lg font-black text-gray-900">
                  ₹{Number(selectedOrderDetails.totalAmount).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/r/${selectedBusiness?.slug}/order/${selectedOrderDetails.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Customer View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
