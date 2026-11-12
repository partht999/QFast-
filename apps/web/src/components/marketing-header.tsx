'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandMark } from './brand-mark';

const links = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'For business', href: '/for-business' },
  { label: 'Industries', href: '/industries' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

const primaryCta = { label: 'Get started', href: '/auth/register' };
const secondaryCta = { label: 'Book a demo', href: '/contact' };

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

  // Close the mobile menu on navigation and lock body scroll while it is open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled || open
          ? 'border-slate-200/80 bg-white/85 shadow-soft backdrop-blur-xl'
          : 'border-transparent bg-white/95 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <BrandMark href="/" label="Qfast home" />

        <nav aria-label="Main navigation" className="hidden items-center gap-1 text-sm font-semibold text-slate-600 lg:flex">
          {links.map((link) => {
            const active = !link.href.includes('#') && pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative rounded-lg px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-950 ${
                  active ? 'text-slate-950' : ''
                }`}
              >
                {link.label}
                {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand-600" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 sm:inline-flex">
            Log in
          </Link>
          <Link href={secondaryCta.href} className="ui-btn-secondary hidden px-3 md:inline-flex">
            {secondaryCta.label}
          </Link>
          <Link href={primaryCta.href} className="ui-btn-primary px-3.5">
            {primaryCta.label} <ArrowRight className="h-4 w-4" />
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
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="animate-slide-in-down border-t border-slate-100 bg-white px-4 pb-6 pt-3 lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3.5 text-base font-semibold text-slate-800 active:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <Link href="/auth/login" className="ui-btn-secondary">Log in</Link>
              <Link href="/contact" className="ui-btn-secondary">Book a demo</Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
