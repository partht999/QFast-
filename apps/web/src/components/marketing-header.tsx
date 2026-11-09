import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

const links = [
  { label: 'Product', href: '/features' },
  { label: 'Industries', href: '/industries' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Qfast home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-200">
            <Zap className="h-5 w-5" fill="currentColor" />
          </span>
          <span className="text-xl font-black tracking-tight text-slate-950">Qfast</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-orange-600">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/auth/login" className="hidden px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 sm:block">
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 sm:px-4 sm:text-sm"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <nav aria-label="More navigation" className="flex gap-5 overflow-x-auto border-t border-slate-100 px-5 py-2.5 text-xs font-semibold text-slate-500 lg:hidden">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 hover:text-orange-600">
            {link.label}
          </Link>
        ))}
        <Link href="/auth/login" className="shrink-0 hover:text-orange-600">Log in</Link>
      </nav>
    </header>
  );
}
