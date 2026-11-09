import Link from 'next/link';
import { ArrowRight, Check, Zap, HelpCircle } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';

export default function PricingPage() {
  const plans = [
    {
      name: 'Essential',
      tier: 'For Single Locations & Growing Teams',
      price: '₹1,999',
      period: '/ month',
      desc: 'Perfect for cafes, clinics, salons, and single-outlet restaurants ready to automate customer arrival.',
      features: [
        'Live FIFO Queue Management',
        'Unlimited QR Scans & Tokens',
        'Customer SMS & Status Alerts',
        'Basic Floor / Counter Management',
        'Table ordering for restaurants and cafes',
        'Single Branch Operations',
        'Standard Email Support',
      ],
      popular: true,
      cta: 'Start 14-day free trial',
      href: '/auth/register',
    },
    {
      name: 'Advanced',
      tier: 'For High-Volume & Multi-Branch Brands',
      price: '₹4,999',
      period: '/ month',
      desc: 'Advanced tools for multi-counter service centres, large venues, hospital wings, and restaurant chains.',
      features: [
        'Everything in Essential',
        'Multi-Branch & Regional Switcher',
        'Staff Permissions & Role Management',
        'Kitchen Display System (KDS)',
        'Customer Loyalty & Points Wallet',
        'Google Reviews Integration & Feedback',
        'Priority Phone & WhatsApp Support',
        'Custom Domain & Custom Branding',
      ],
      popular: false,
      cta: 'Explore Advanced',
      href: '/auth/register',
    },
  ];

  const faqs = [
    {
      q: 'Do customers need to download any application?',
      a: 'Never. Qfast operates 100% in mobile web browsers (Safari, Chrome, etc.) upon scanning your entrance QR code or tapping your link.',
    },
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Yes, you can upgrade, downgrade, or cancel your subscription anytime directly from your dashboard settings with no lock-in periods.',
    },
    {
      q: 'How does the 14-day free trial work?',
      a: 'You get full access to all features upon registration. No credit card is required to begin testing and setting up your first live queue.',
    },
    {
      q: 'Can I use Qfast if I am not a restaurant?',
      a: 'Absolutely. Qfast was built from the ground up for customer flow in clinics, salons, diagnostic centres, and service centres.',
    },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-300">
            Simple & Transparent
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            Predictable plans that scale with your visits
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            No hidden fees, no per-token charges, and zero customer friction. Start with a 14-day trial on us.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col justify-between rounded-3xl border p-8 sm:p-10 ${
                p.popular
                  ? 'border-orange-500 bg-white shadow-xl ring-2 ring-orange-500/20'
                  : 'border-slate-200 bg-white shadow-sm'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3.5 right-8 rounded-full bg-orange-500 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                  Most Popular
                </span>
              )}
              <div>
                <h2 className="text-2xl font-black text-slate-900">{p.name}</h2>
                <p className="mt-1 text-xs font-semibold text-orange-600">{p.tier}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{p.desc}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{p.price}</span>
                  <span className="text-sm font-semibold text-slate-500">{p.period}</span>
                </div>

                <ul className="mt-8 space-y-3.5 text-sm text-slate-700">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3">
                      <Check className="h-4 w-4 shrink-0 text-orange-600" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-100">
                <Link
                  href={p.href}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition ${
                    p.popular
                      ? 'bg-orange-500 text-white shadow-md hover:bg-orange-600'
                      : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="mt-24 border-t border-slate-200 pt-16">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
            <p className="mt-2 text-sm text-slate-600">Everything you need to know about getting started with Qfast.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-bold text-slate-900">{f.q}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

