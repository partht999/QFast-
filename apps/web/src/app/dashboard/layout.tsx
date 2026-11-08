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
  Star,
  Utensils,
  X,
  Zap,
} from 'lucide-react';

const navigation = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Queue', href: '/dashboard/queue', icon: ListOrdered },
  { label: 'Kitchen', href: '/dashboard/kds', icon: ChefHat },
  { label: 'Menu', href: '/dashboard/menu', icon: MenuIcon },
  { label: 'Tables', href: '/dashboard/tables', icon: Utensils },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { label: 'Loyalty', href: '/dashboard/loyalty', icon: Gift },
];

const primaryNavigation = navigation.slice(0, 4);
const moreNavigation = navigation.slice(4);

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/queue': 'Live Queue',
  '/dashboard/kds': 'Kitchen Display',
  '/dashboard/menu': 'Menu Editor',
  '/dashboard/tables': 'Tables & QR',
  '/dashboard/reviews': 'Google Reviews',
  '/dashboard/loyalty': 'Loyalty & Points',
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
  const moreIsActive = moreNavigation.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    // Try to read email from localStorage for display in sidebar
    try {
      const stored = localStorage.getItem('userEmail');
      if (stored) setUserEmail(stored);
    } catch {}
  }, []);

  // Close the more drawer when navigating
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/auth/login');
  };

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
        <div className="flex h-16 items-center gap-2.5 border-b border-neutral-800 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500">
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-extrabold tracking-tight text-white">
              Qfast
            </span>
          )}
        </div>

        {/* Navigation items */}
        <nav aria-label="Dashboard sections" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map(({ label, href, icon: Icon }) => {
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
                  {userEmail || 'Restaurant Owner'}
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
            <span className="text-xs text-gray-500">Live updates active</span>
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
          <div className="mx-auto grid max-w-xl grid-cols-5 px-2 py-1">
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
            <button
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
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
