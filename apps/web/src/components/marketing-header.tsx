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
          <Link href="/auth/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-3.5 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600"
          >
            Get started <ArrowRight className="h-4 w-4" />
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
            <Link href="/auth/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:hidden">
              Log in
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
