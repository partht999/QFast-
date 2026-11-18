'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight, ChevronDown, Coffee, FlaskConical, Menu, Scissors, Stethoscope, UtensilsCrossed, Wrench, X,
} from 'lucide-react';
import { BrandMark } from './brand-mark';
import { TextReveal } from './text-reveal';

const solutions = [
  { label: 'Restaurants', href: '/restaurants', icon: UtensilsCrossed, detail: 'Waitlist, table orders & bills' },
  { label: 'Cafés', href: '/cafes', icon: Coffee, detail: 'Fast counter queue & table QR' },
  { label: 'Clinics', href: '/clinics', icon: Stethoscope, detail: 'Calm, orderly patient queue' },
  { label: 'Salons', href: '/salons', icon: Scissors, detail: 'Walk-ins in arrival order' },
  { label: 'Diagnostics', href: '/diagnostics', icon: FlaskConical, detail: 'Collection & imaging queue' },
  { label: 'Service Centres', href: '/service-centres', icon: Wrench, detail: 'One queue for the counter' },
];

const links = [
  { label: 'Product', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const navLink = 'rounded-full px-3.5 py-2 transition-colors hover:bg-orange-50 hover:text-brand-600';

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled || open ? 'border-slate-200/70 bg-white/80 shadow-soft backdrop-blur-xl' : 'border-transparent bg-transparent'
      }`}
    >
      <TextReveal />
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <BrandMark href="/" label="Qfast home" />

        <nav aria-label="Main navigation" className="hidden items-center gap-1 text-[15px] font-medium text-slate-700 lg:flex">
          <Link href={links[0].href} aria-current={pathname === links[0].href ? 'page' : undefined} className={navLink}>{links[0].label}</Link>
          <div className="group relative">
            <button type="button" className={`${navLink} inline-flex items-center gap-1`} aria-haspopup="true">
              Solutions <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="invisible absolute left-1/2 top-full w-[520px] -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_30px_60px_-20px_rgba(15,26,58,.3)]">
                {solutions.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link key={s.href} href={s.href} className="group/item flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-orange-50">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand-600 transition-colors group-hover/item:bg-brand-600 group-hover/item:text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{s.label}</span>
                        <span className="block text-xs text-slate-500">{s.detail}</span>
                      </span>
                    </Link>
                  );
                })}
                <div className="col-span-2 mt-1 flex items-center justify-between rounded-xl bg-[#0d1733] px-4 py-3 text-[13px] text-white">
                  <span>Not sure which fits?</span>
                  <Link href="/industries" className="font-semibold text-orange-300 hover:text-orange-200">See all industries →</Link>
                </div>
              </div>
            </div>
          </div>
          {links.slice(1).map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} className={navLink}>{link.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-brand-600 sm:inline-flex">
            Login
          </Link>
          <Link
            href="/auth/register"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-orange-400 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_#ea580c] transition hover:-translate-y-0.5"
          >
            Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 transition active:scale-95 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile navigation" className="animate-slide-in-down max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-slate-100 bg-white px-4 pb-6 pt-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col">
            <Link href="/features" className="rounded-xl px-3 py-3.5 text-base font-semibold text-slate-800 active:bg-slate-100">Product</Link>
            <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Solutions</p>
            <div className="grid grid-cols-2 gap-2 px-1 py-3">
              {solutions.map((s) => {
                const Icon = s.icon;
                return (
                  <Link key={s.href} href={s.href} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-800">
                    <Icon className="h-4 w-4 text-brand-600" /> {s.label}
                  </Link>
                );
              })}
            </div>
            {[...links.slice(1), { label: 'For business', href: '/for-business' }].map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl px-3 py-3.5 text-base font-semibold text-slate-800 active:bg-slate-100">{link.label}</Link>
            ))}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <Link href="/auth/login" className="ui-btn-secondary">Login</Link>
              <Link href="/contact" className="ui-btn-secondary">Book a demo</Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
