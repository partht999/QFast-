import Link from 'next/link';
import {
  QrCode,
  Ticket,
  ChefHat,
  Star,
  Gift,
  CreditCard,
  ArrowRight,
  Zap,
  CheckCircle2,
  Smartphone,
  LayoutDashboard,
  Rocket,
  Users,
  Store,
  TrendingUp,
} from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'Entrance & Table QR',
    desc: 'No app download. Scans directly in mobile Safari or Chrome.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Ticket,
    title: 'Live Queue & Wait Time',
    desc: 'SMS + Web Push alerts. Smart tokens with zero double-counting.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: ChefHat,
    title: 'Kitchen Display (KDS)',
    desc: 'Real-time order synchronization across kitchen stations.',
    color: 'bg-red-100 text-red-600',
  },
  {
    icon: Star,
    title: 'Google Review Engine',
    desc: 'Automated policy-compliant review requests after every meal.',
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    icon: Gift,
    title: 'Loyalty & Stamp Cards',
    desc: 'Earn points per rupee or visit stamps with OTP verification.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: CreditCard,
    title: 'Razorpay Online Payments',
    desc: 'Instant UPI, card, tips & split bills directly from table QR.',
    color: 'bg-blue-100 text-blue-600',
  },
];

const stats = [
  { value: '2,400+', label: 'Restaurants', icon: Store },
  { value: '1.2M', label: 'Orders processed', icon: TrendingUp },
  { value: '99.9%', label: 'Uptime', icon: CheckCircle2 },
  { value: '4.8★', label: 'Avg. rating', icon: Star },
];

const steps = [
  {
    step: '01',
    icon: Smartphone,
    title: 'Scan the QR code',
    desc: 'Guests scan the QR at the entrance or on their table — no app install required.',
  },
  {
    step: '02',
    icon: LayoutDashboard,
    title: 'Order & track live',
    desc: 'Browse the menu, place orders, and track kitchen progress in real time.',
  },
  {
    step: '03',
    icon: Rocket,
    title: 'Pay, review & earn',
    desc: 'Pay via UPI or card, leave a Google review, and earn loyalty points instantly.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shadow-md shadow-brand-500/25 transition-transform group-hover:scale-105">
              <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black tracking-tight text-gray-900">
              Qfast
            </span>
            <span className="hidden rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 sm:inline-block">
              v2.0
            </span>
          </Link>

          <nav aria-label="Account" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:px-4"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 active:scale-[0.98]"
            >
              <span className="sm:hidden">Get started</span>
              <span className="hidden sm:inline">Start free trial</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-orange-50" />
        {/* Floating decorative elements */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
          <div className="absolute top-1/2 -left-32 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-56 w-56 rounded-full bg-amber-100/40 blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle, #f97316 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24 lg:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm mb-8 transition-all hover:shadow-md">
            <Zap className="h-3.5 w-3.5" />
            Complete restaurant OS — Essential &amp; Advanced plans
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            Queues, ordering &amp; growth{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-brand-500 to-orange-500 bg-clip-text text-transparent">
                all from a single QR scan.
              </span>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-500 sm:mt-8 sm:text-lg md:text-xl">
            Zero app install for customers. Instant table ordering, live queue
            tracking, kitchen display, loyalty points, and Google reviews — built
            for modern restaurants.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/auth/register"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30 active:scale-[0.98] sm:w-auto"
            >
              Get started in 2 minutes
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-[0.98] sm:w-auto"
            >
              Sign in to your dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Trusted By ─── */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
            Trusted by restaurants across India
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="group text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition-colors group-hover:bg-brand-100">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  {s.value}
                </div>
                <div className="mt-0.5 text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Everything your restaurant needs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-500 sm:text-lg">
            From queue management to payments — one platform, zero friction.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {features.map((f) => (
            <article
              key={f.title}
              className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.color} transition-transform duration-300 group-hover:scale-110`}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-gray-900">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">
                {f.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-500 sm:text-lg">
              Three simple steps to transform your restaurant experience.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.step} className="group relative text-center">
                {/* Connector line (hidden on mobile & last item) */}
                {i < steps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute left-1/2 top-10 hidden h-0.5 w-full bg-gradient-to-r from-brand-200 to-brand-100 md:block"
                  />
                )}
                <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-brand-100 bg-white shadow-sm transition-all duration-300 group-hover:border-brand-300 group-hover:shadow-md">
                  <s.icon className="h-8 w-8 text-brand-500" />
                  <span className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white shadow-md">
                    {s.step}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {s.title}
                </h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-gray-500">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-orange-500 px-6 py-14 shadow-2xl shadow-brand-500/20 sm:px-12 sm:py-20">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Ready to modernize your restaurant?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/80 sm:text-lg">
              Join 2,400+ restaurants already using Qfast. Start your 14-day
              free trial — no credit card required.
            </p>
            <Link
              href="/auth/register"
              className="group mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-brand-600 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 shadow-sm">
                <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-black tracking-tight text-gray-900">
                Qfast
              </span>
            </div>

            <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <Link href="#" className="transition-colors hover:text-gray-900">Features</Link>
              <Link href="#" className="transition-colors hover:text-gray-900">Pricing</Link>
              <Link href="#" className="transition-colors hover:text-gray-900">Blog</Link>
              <Link href="#" className="transition-colors hover:text-gray-900">Support</Link>
              <Link href="#" className="transition-colors hover:text-gray-900">Privacy</Link>
            </nav>

            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Qfast. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
