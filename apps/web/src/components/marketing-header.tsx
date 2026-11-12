'use client';

import { useState } from 'react';
import Link from 'next/link';
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <BrandMark href="/" label="Qfast home" />

        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-semibold text-slate-600 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-slate-950">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href={secondaryCta.href} className="ui-btn-secondary hidden px-3 sm:inline-flex">
            {secondaryCta.label}
          </Link>
          <Link href={primaryCta.href} className="ui-btn-primary px-3.5">
            {primaryCta.label} <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-800 lg:hidden"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile navigation" className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:hidden">
              Book a demo
            </Link>
            <Link href="/auth/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:hidden">
              Log in
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
