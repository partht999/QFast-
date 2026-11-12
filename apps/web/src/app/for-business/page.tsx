import Link from 'next/link';
import { ArrowRight, Bell, Check, ClipboardList, Store, Users } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingHeader } from '@/components/marketing-header';

const benefits = [
  {
    icon: ClipboardList,
    title: 'Live queue visibility',
    description: 'Customers see their place and expected wait, while your team works from one clear board instead of guessing.',
  },
  {
    icon: Bell,
    title: 'Fewer missed calls',
    description: 'No paper slips, no shouted names, and no confusion when the room gets busy. Calls stay visible, ordered, and trackable.',
  },
  {
    icon: Users,
    title: 'Smarter front-of-house operations',
    description: 'Shift staff attention from crowd management to real service, without losing the queue or losing time to admin.',
  },
];

const useCases = [
  'Walk-in clinics and OPD desks',
  'Busy salons and grooming counters',
  'Service centres and customer support desks',
  'Restaurants, cafes, and counters with high turnover',
];

export default function ForBusinessPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <section className="overflow-hidden bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              <Store className="h-3.5 w-3.5" /> Built for operations teams
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Make your queue feel organised from the first step to the last.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Qfast helps busy businesses turn a crowded entrance into an orderly, visible, customer-friendly flow with real-time updates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-600">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold text-white hover:bg-white/10">
                View pricing
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Operations board</p>
                <h2 className="mt-1 text-lg font-black">Today&apos;s queue</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">8 waiting</span>
            </div>

            <div className="mt-5 space-y-3">
              {['Now serving #12 · Ananya', 'Next #13 · Imran', 'After #14 · Meera'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="font-semibold text-slate-900">{item}</span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">Live</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Why teams switch</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Less chaos. More time for service.</h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
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

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Built for busy teams</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">A single system for a growing line.</h2>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <ul className="space-y-3">
                {useCases.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
        <div className="rounded-3xl bg-slate-950 p-8 text-center text-white sm:p-12">
          <h2 className="text-3xl font-black sm:text-4xl">Let your queue take care of itself.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Turn a crowded front desk into a calm customer experience with live queue updates, staff controls, and clear operational visibility.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-orange-600">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
