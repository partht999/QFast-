import Link from 'next/link';
import { BrandMark } from './brand-mark';

const industryLinks = [
  ['Restaurants', '/restaurants'],
  ['Cafes', '/cafes'],
  ['Clinics', '/clinics'],
  ['Salons', '/salons'],
  ['Diagnostics', '/diagnostics'],
  ['Service centres', '/service-centres'],
];

export function MarketingFooter() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@qfast.in';

  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-5 py-12 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <BrandMark href="/" />
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-600">
            Live queues for clinics, salons, labs, service centres, and restaurants.
            Customers join in the browser. Staff call the next person from one board.
          </p>
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Product</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li><Link href="/#how-it-works" className="hover:text-orange-600">How it works</Link></li>
            <li><Link href="/for-business" className="hover:text-orange-600">For business</Link></li>
            <li><Link href="/features" className="hover:text-orange-600">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-orange-600">Pricing</Link></li>
            <li><Link href="/auth/login" className="hover:text-orange-600">Log in</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Industries</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {industryLinks.map(([label, href]) => (
              <li key={href}><Link href={href} className="hover:text-orange-600">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Qfast</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li><Link href="/about" className="hover:text-orange-600">About</Link></li>
            <li><Link href="/contact" className="hover:text-orange-600">Contact & support</Link></li>
            <li><a href={`mailto:${supportEmail}`} className="hover:text-orange-600">{supportEmail}</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Qfast</p>
        <p>Built to make customer flow clearer.</p>
      </div>
    </footer>
  );
}
