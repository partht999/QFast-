'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Coffee,
  HeartPulse,
  Scissors,
  Stethoscope,
  Store,
  Ticket,
  Wrench,
  Zap,
} from 'lucide-react';
import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingHeader } from '@/components/marketing-header';
import { BUSINESS_TYPES } from '@/lib/business-types';

const industryIcons: Record<string, typeof Store> = {
  RESTAURANT: Store,
  CAFE: Coffee,
  CLINIC: Stethoscope,
  HOSPITAL: HeartPulse,
  SALON: Scissors,
  DIAGNOSTIC_CENTRE: ClipboardList,
  SERVICE_CENTRE: Wrench,
  RETAIL: Store,
  OTHER: Zap,
};

const coreFeatures = [
  {
    icon: Ticket,
    title: 'Atomic Live FIFO Queues',
    description: 'Provide sequential race-condition-free daily tokens, multi-counter and multi-doctor queues, and live customer updates.',
  },
  {
    icon: CalendarDays,
    title: 'Multi-Industry Workflows',
    description: 'Tailored for clinics, salons, diagnostic labs, hospitals, service centres, and dine-in restaurants.',
  },
  {
    icon: ClipboardList,
    title: 'Unified Operations Counter',
    description: 'Touch-friendly counter dashboard with instant Call Next, Buzz Recall, Walk-in entry, and Table QR integration.',
  },
];

export default function ForBusinessPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_30%,rgba(249,115,22,0.22),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:py-32">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              <Zap className="h-3.5 w-3.5" /> One platform. Every business.
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Zero crowd chaos.
              <span className="block bg-gradient-to-r from-orange-300 to-amber-400 bg-clip-text text-transparent">
                Faster customer turnaround.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Live first-come queues for clinics, salons, labs, service centres, and restaurants, with a separate line for each counter or doctor.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-orange-500 px-7 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/30 transition hover:bg-orange-600"
              >
                Start 14-day free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Find a queue
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              No credit card required • Instant setup in 2 minutes • Multi-counter support
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                  <Ticket className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white">Live Queue Operations</h2>
                  <p className="text-xs text-slate-400">Real-time status</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Active
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-800/60 p-4 border border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-orange-400">#12</span>
                    <span className="font-bold text-white text-sm">Rahul Sharma</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Dr. Sarah Smith • General OPD</p>
                </div>
                <span className="rounded-lg bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-300">
                  Now Serving
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-800/40 p-4 border border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-300">#13</span>
                    <span className="font-bold text-white text-sm">Priya Patel</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Est. wait: ~6 mins</p>
                </div>
                <span className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                  Waiting Next
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Built for operations
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Engineered for busy service counters
            </h2>
            <p className="mt-3 text-slate-600">
              From walk-ins to remote scans, manage customer flow without friction.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {coreFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{feat.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Versatile & Configurable
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Tailored for your business type
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_TYPES.map((bt) => {
              const Icon = industryIcons[bt.value] || Store;
              return (
                <Link
                  key={bt.value}
                  href={`/auth/register?type=${bt.value}`}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-5 hover:border-orange-300 hover:shadow-md transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-50 group-hover:bg-orange-500 text-orange-600 group-hover:text-white flex items-center justify-center transition flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition">
                      {bt.label}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{bt.detail}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
          <h2 className="text-3xl font-black">Ready to eliminate your wait lines?</h2>
          <p className="mt-3 text-slate-400 max-w-md mx-auto text-sm">
            Join hundreds of providers delivering a modern, stress-free queue experience.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 transition shadow-lg shadow-orange-500/20"
            >
              Get Started Free
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700 transition"
            >
              Find a queue
            </Link>
          </div>
        </div>
      </footer>
      <MarketingFooter />
    </main>
  );
}
