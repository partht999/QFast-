'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Gift,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu as MenuIcon,
  MoreHorizontal,
  Settings,
  Star,
  Users,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { getApiUrl } from '@/lib/api';
import { BUSINESS_TYPES } from '@/lib/business-types';
import { isFoodBusiness } from '@/lib/business-links';

const navigation = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Queue', href: '/dashboard/queue', icon: ListOrdered },
  { label: 'Kitchen', href: '/dashboard/kds', icon: ChefHat },
  { label: 'Menu', href: '/dashboard/menu', icon: MenuIcon },
  { label: 'Tables', href: '/dashboard/tables', icon: Utensils },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { label: 'Stamps', href: '/dashboard/loyalty', icon: Gift },
  { label: 'Staff', href: '/dashboard/staff', icon: Users },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/queue': 'Live Queue',
  '/dashboard/kds': 'Kitchen Display',
  '/dashboard/menu': 'Menu Editor',
  '/dashboard/tables': 'Tables & QR',
  '/dashboard/reviews': 'Google Reviews',
  '/dashboard/loyalty': 'Stamp card',
  '/dashboard/staff': 'Staff',
  '/dashboard/settings': 'Settings',
  '/dashboard/onboarding': 'Onboarding',
};

function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}

function getPageTitle(pathname: string): string {
  return pageTitles[pathname] || 'Dashboard';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string>('OWNER');
  const [planStatus, setPlanStatus] = useState<string>('');
  const [trialEndsAt, setTrialEndsAt] = useState<string>('');
  const roleNavigation = navigation.filter((item) => {
    if (staffRole === 'KITCHEN_STAFF') return item.href === '/dashboard/kds';
    if (staffRole === 'WAITER') return ['/dashboard/queue', '/dashboard/tables'].includes(item.href);
    if (staffRole === 'CASHIER') return ['/dashboard', '/dashboard/queue', '/dashboard/tables'].includes(item.href);
    if (!['OWNER', 'MANAGER'].includes(staffRole) && item.href === '/dashboard/staff') return false;
    return true;
  });
  const visibleNavigation = !businessType
    ? roleNavigation.filter((item) => ['/dashboard', '/dashboard/queue', '/dashboard/settings', '/dashboard/staff'].includes(item.href))
    : !isFoodBusiness(businessType)
      ? roleNavigation.filter((item) => ['/dashboard', '/dashboard/queue', '/dashboard/reviews', '/dashboard/settings', '/dashboard/staff'].includes(item.href))
      : roleNavigation;
  const primaryNavigation = visibleNavigation.slice(0, 4);
  const moreNavigation = visibleNavigation.slice(4);
  const moreIsActive = moreNavigation.some((item) => isActive(pathname, item.href));
  const businessLabel = BUSINESS_TYPES.find((type) => type.value === businessType)?.label;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userEmail');
      if (stored) setUserEmail(stored);
    } catch {}

    let cancelled = false;
    const load = async () => {
      const refreshSession = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return null;
        const response = await fetch(`${getApiUrl()}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        return data.accessToken as string;
      };

      let token = localStorage.getItem('accessToken');
      if (!token) token = await refreshSession();
      if (!token) {
        router.replace('/auth/login');
        return;
      }
      let response = await fetch(`${getApiUrl()}/api/v1/business`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        token = await refreshSession();
        if (!token) {
          localStorage.clear();
          router.replace('/auth/login');
          return;
        }
        response = await fetch(`${getApiUrl()}/api/v1/business`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!response.ok) return;
      const businesses = await response.json();
      if (!cancelled && Array.isArray(businesses) && businesses[0]) {
        const current = businesses[0];
        if (current.type) setBusinessType(current.type);
        if (current.myRole) setStaffRole(current.myRole);
        const subscription = current.subscriptions?.[0];
        setPlanStatus(subscription?.status || '');
        setTrialEndsAt(subscription?.trialEndsAt || '');
      }
    };
    load().catch((error) => console.error(error));
    const refreshTimer = window.setInterval(() => {
      load().catch((error) => console.error(error));
    }, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [router]);

  useEffect(() => {
    if (planStatus === 'LAPSED') return;
    if (staffRole === 'KITCHEN_STAFF' && pathname !== '/dashboard/kds') {
      router.replace('/dashboard/kds');
    }
  }, [planStatus, staffRole, pathname, router]);

  // Close the more drawer when navigating
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/auth/login');
  };

  if (planStatus === 'LAPSED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md text-center">
          <p className="text-xs font-black uppercase tracking-widest text-orange-300">Qfast</p>
          <h1 className="mt-3 text-3xl font-black">Your plan has expired</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The 30-day premium trial is over. Buy a subscription to keep the queue, table ordering, and the kitchen open.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/contact" className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white">Talk to us</Link>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  if (pathname === '/dashboard/kds') {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={`hidden md:flex flex-col border-r border-neutral-800 bg-neutral-900 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center border-b border-neutral-800 px-4">
          <BrandMark href="/dashboard" tone="light" size="sm" showWordmark={!sidebarCollapsed} label="Qfast dashboard" />
        </div>

        {/* Navigation items */}
        <nav aria-label="Dashboard sections" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {visibleNavigation.map(({ label, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    title={sidebarCollapsed ? label : undefined}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon
                      aria-hidden="true"
                      size={18}
                      strokeWidth={active ? 2.2 : 1.8}
                      className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                        active ? '' : 'group-hover:text-brand-400'
                      }`}
                    />
                    {!sidebarCollapsed && <span>{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-neutral-800 px-3 py-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>
        </div>

        {/* User profile */}
        <div className="border-t border-neutral-800 p-3">
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-lg p-2 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-bold uppercase text-neutral-300">
                {userEmail ? userEmail[0] : '?'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-neutral-300">
                  {userEmail || 'Business account'}
                </p>
                <p className="truncate text-[11px] text-neutral-500">
                  {businessLabel || 'Staff workspace'}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-0.5 text-[11px] font-medium text-neutral-500 transition-colors hover:text-red-400"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main content area ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="hidden md:flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <h1 className="text-base font-semibold text-gray-900">
            {getPageTitle(pathname)}
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" title="Live" />
            <span className="text-xs text-gray-500">
              {planStatus === 'TRIALING' && trialEndsAt
                ? `Premium trial until ${new Date(trialEndsAt).toLocaleDateString()}`
                : 'Live updates active'}
            </span>
          </div>
        </header>

        {/* Mobile header */}
        <header className="flex md:hidden h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
              <Zap size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-gray-900">
              {getPageTitle(pathname)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-gray-500">Live</span>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav
        aria-label="Dashboard sections"
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* More drawer backdrop */}
        {moreOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* More drawer */}
        <div
          className={`absolute inset-x-0 bottom-full z-40 transition-all duration-300 ease-out ${
            moreOpen
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-4 opacity-0'
          }`}
        >
          <div className="mx-3 mb-2 rounded-2xl border border-gray-200/80 bg-white p-2 shadow-2xl">
            <div className="mb-1 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                More sections
              </p>
            </div>
            {moreNavigation.map(({ label, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      active ? 'bg-brand-100' : 'bg-gray-100'
                    }`}
                  >
                    <Icon aria-hidden="true" size={16} />
                  </div>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-gray-200/60 bg-white/80 shadow-[0_-1px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-150">
          <div
            className="mx-auto grid max-w-xl px-2 py-1"
            style={{
              gridTemplateColumns: `repeat(${primaryNavigation.length + (moreNavigation.length ? 1 : 0)}, minmax(0, 1fr))`,
            }}
          >
            {primaryNavigation.map(({ label, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-all duration-150 active:scale-95 ${
                    active
                      ? 'text-brand-600'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <div className="relative">
                    <Icon
                      aria-hidden="true"
                      size={22}
                      strokeWidth={active ? 2.4 : 1.6}
                    />
                    {active && (
                      <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-500" />
                    )}
                  </div>
                  <span className={active ? 'font-semibold' : ''}>{label}</span>
                </Link>
              );
            })}
            {moreNavigation.length > 0 && <button
              type="button"
              aria-expanded={moreOpen}
              aria-label={moreOpen ? 'Close more dashboard sections' : 'More dashboard sections'}
              onClick={() => setMoreOpen((open) => !open)}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-all duration-150 active:scale-95 ${
                moreIsActive || moreOpen
                  ? 'text-brand-600'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                {moreOpen ? (
                  <X aria-hidden="true" size={22} />
                ) : (
                  <MoreHorizontal aria-hidden="true" size={22} />
                )}
                {moreIsActive && !moreOpen && (
                  <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-500" />
                )}
              </div>
              More
            </button>}
          </div>
        </div>
      </nav>
    </div>
  );
}
