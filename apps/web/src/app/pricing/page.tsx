import Link from 'next/link';
import { ArrowRight, Check, Sparkles, ShieldCheck, Ticket, Users } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingHeader } from '@/components/marketing-header';

const pricingTiers = [
  {
    name: 'Starter',
    price: '₹0',
    subtitle: 'For a simple queue that needs to launch quickly',
    tag: '30-day free trial',
    features: ['1 workspace', 'QR join page', 'Live queue board', 'Customer status updates'],
    cta: 'Try for free',
    highlight: false,
  },
  {
    name: 'Growth',
    price: 'Custom',
    subtitle: 'For high-traffic teams that need more control and visibility',
    tag: 'Most popular',
    features: ['Multiple queues', 'Staff insights', 'Review capture', 'Brand customisation'],
    cta: 'Talk to sales',
    highlight: true,
  },
  {
    name: 'Advanced',
    price: 'From ₹1,499 / mo',
    subtitle: 'For restaurants, clinics, and service desks that need the full stack',
    tag: 'Includes full product',
    features: ['Table ordering tools', 'Bills and loyalty', 'Kitchen or desk workflows', 'Priority support'],
    cta: 'Get started',
    highlight: false,
  },
];

const planBenefits = [
  {
    icon: Ticket,
    title: 'Clarity at the counter',
    description: 'Guests know their place and staff can call the next person without shouting names or guessing the line.',
  },
  {
    icon: Users,
    title: 'A calmer customer journey',
    description: 'Walk-ins, remote guests, and returning visitors all sit in the same queue without unnecessary friction.',
  },
  {
    icon: ShieldCheck,
    title: 'Ready for real operations',
    description: 'Every workspace is secure, organised, and built for the pace of a busy front desk or counter.',
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
            <Sparkles className="h-3.5 w-3.5" /> Simple pricing
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">A queue system that scales with your business.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Start free, learn from the first few days of live traffic, and keep the full product when you are ready to scale.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl border p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                tier.highlight
                  ? 'border-orange-200 bg-orange-50/70 shadow-orange-100'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-slate-900">{tier.name}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                  {tier.tag}
                </span>
              </div>

              <div className="mt-6">
                <p className="text-4xl font-black tracking-tight text-slate-950">{tier.price}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{tier.subtitle}</p>
              </div>

              <ul className="mt-8 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/register"
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  tier.highlight
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tier.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-3">
          {planBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black text-slate-900">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
        <div className="rounded-3xl bg-slate-950 p-8 text-center text-white shadow-2xl sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">30-day free product access</p>
          <h2 className="mt-4 text-3xl font-black sm:text-4xl">Start with a queue your team can trust.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Every workspace comes with live queue management, a customer-facing join experience, and a staff board for calling the next person. When the trial ends, you stay in control of your subscription before customers can join again.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-orange-600">
              Open your queue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
