import Link from 'next/link';
import { Mail } from 'lucide-react';
import { BrandMark } from './brand-mark';

const industryLinks = [
  ['Restaurants', '/restaurants'],
  ['Cafes', '/cafes'],
  ['Clinics', '/clinics'],
  ['Salons', '/salons'],
  ['Diagnostics', '/diagnostics'],
  ['Service centres', '/service-centres'],
];

const productLinks = [
  ['How it works', '/#how-it-works'],
  ['For business', '/for-business'],
  ['Features', '/features'],
  ['Pricing', '/pricing'],
  ['Log in', '/auth/login'],
];

const linkClass = 'inline-block py-0.5 transition-colors hover:text-brand-600';
const headingClass = 'text-xs font-semibold uppercase tracking-[0.14em] text-slate-900';

export function MarketingFooter() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@qfast.in';

  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-5 pb-8 pt-14 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <BrandMark href="/" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">
            Live queues for clinics, salons, labs, service centres, and restaurants.
            Customers join in the browser, and your team runs the flow from one calm board.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/contact" className="ui-btn-secondary min-h-10 px-3.5">
              Book a demo
            </Link>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-brand-600"
            >
              <Mail className="h-4 w-4" /> {supportEmail}
            </a>
          </div>
        </div>
        <nav aria-label="Product">
          <h2 className={headingClass}>Product</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {productLinks.map(([label, href]) => (
              <li key={href}><Link href={href} className={linkClass}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Industries">
          <h2 className={headingClass}>Industries</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {industryLinks.map(([label, href]) => (
              <li key={href}><Link href={href} className={linkClass}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className={headingClass}>Qfast</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li><Link href="/about" className={linkClass}>About</Link></li>
            <li><Link href="/contact" className={linkClass}>Contact & support</Link></li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Qfast. All rights reserved.</p>
        <p>Built to make customer flow clearer.</p>
      </div>
    </footer>
  );
}
