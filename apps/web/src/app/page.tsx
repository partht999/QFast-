import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
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
import { AVAILABLE_BUSINESS_TYPES, BUSINESS_TYPES } from '@/lib/business-types';

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
    title: 'Live FIFO queues',
    description: 'Give customers a place in line and let staff move the queue forward in arrival order.',
  },
  {
    icon: CalendarDays,
    title: 'Industry-specific workflows',
    description: 'Appointment and service tools are being introduced by category, alongside the shared queue.',
  },
  {
    icon: ClipboardList,
    title: 'One operations workspace',
    description: 'Give your team a shared view of customers and day-to-day service activity.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Qfast home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <Zap className="h-5 w-5" fill="currentColor" />
            </span>
            <span className="text-xl font-black tracking-tight">Qfast</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-orange-600">Features</a>
            <a href="#industries" className="hover:text-orange-600">Industries</a>
            <a href="#pricing" className="hover:text-orange-600">Pricing</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/auth/login" className="px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_30%,rgba(249,115,22,0.22),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:py-32">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              <Zap className="h-3.5 w-3.5" /> One platform. Every business.
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Less waiting.
              <span className="block bg-gradient-to-r from-orange-300 to-amber-400 bg-clip-text text-transparent">
                Better business.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              One platform for queues, appointments, orders and customer operations.
              Qfast helps service businesses make every visit run smoother.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              FIFO queues are the cross-industry foundation. Restaurant tools are our first
              complete experience; appointment and industry-specific workflows for clinics,
              salons and other services are expanding.
              Qfast is not for hospital emergency or triage workflows.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#industries"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 font-bold text-white shadow-xl shadow-orange-950/30 transition hover:-translate-y-0.5 hover:bg-orange-400"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10"
              >
                Explore Qfast <ChevronRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-orange-400" /> Choose your business type</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-orange-400" /> No customer app required</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-8 rounded-[2.5rem] bg-orange-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white p-5 shadow-2xl sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Qfast workspace</p>
                  <h2 className="mt-1 text-xl font-black">Today at a glance</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Live queue</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">People waiting</p>
                  <p className="mt-2 text-3xl font-black">08</p>
                  <p className="mt-1 text-xs text-slate-500">In arrival order</p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4">
                  <p className="text-xs font-semibold text-orange-700">Estimated wait</p>
                  <p className="mt-2 text-3xl font-black text-orange-700">~24m</p>
                  <p className="mt-1 text-xs text-orange-700/70">Keep customers informed</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ['01', 'Customer joined', 'Walk-in · 10:42 AM', 'Serving'],
                  ['02', 'Customer joined', 'Online · 10:45 AM', 'Waiting'],
                  ['03', 'Customer joined', 'QR scan · 10:49 AM', 'Waiting'],
                ].map(([number, name, detail, status]) => (
                  <div key={number} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-600">{number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{name}</p>
                      <p className="text-xs text-slate-500">{detail}</p>
                    </div>
                    <span className={`text-xs font-bold ${status === 'Serving' ? 'text-emerald-600' : 'text-slate-400'}`}>{status}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-[11px] text-slate-400">Illustrative queue preview</p>
            </div>
          </div>
        </div>
      </section>

      <section id="industries" className="scroll-mt-24 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Choose your industry</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Made for the way your business serves</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Start with the category that fits. Every organization gets a Qfast account
              and a FIFO queue; industry-specific workflows are introduced as they become available.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_TYPES.map((industry) => {
              const Icon = industryIcons[industry.value] || Store;
              const availableNow = AVAILABLE_BUSINESS_TYPES.includes(industry.value);
              return (
                <article key={industry.value} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-slate-200/70">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${availableNow ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {availableNow ? 'Available now' : 'Queue available · expanding'}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold">{industry.label}</h3>
                  <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{industry.detail}</p>
                  {industry.value === 'HOSPITAL' && (
                    <p className="mt-2 text-xs leading-5 text-amber-700">For appropriate non-emergency services only. Qfast does not manage triage.</p>
                  )}
                  {availableNow ? (
                    <Link
                      href={`/auth/register?type=${industry.value}`}
                      className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-orange-600 hover:text-orange-700"
                    >
                      Select this business <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <span className="mt-5 inline-block text-sm font-semibold text-slate-400">
                      Coming soon
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">How Qfast works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">From first setup to a smoother service day</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              ['01', 'Set up your business', 'Choose your category, create your organization profile and configure the queue for your team.'],
              ['02', 'Customers join simply', 'Share your Qfast link or QR code so customers can join the line without installing an app.'],
              ['03', 'Serve in FIFO order', 'Your team follows one clear, first-in-first-out line and keeps customers updated on their wait.'],
            ].map(([step, title, description]) => (
              <article key={step} className="border-t-2 border-orange-200 pt-5">
                <span className="text-sm font-black text-orange-600">{step}</span>
                <h3 className="mt-3 text-xl font-extrabold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">One Qfast platform</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">The essentials for better customer flow</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {coreFeatures.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-slate-500">
            Feature availability depends on your business category. Restaurant QR ordering and
            dashboard workflows are available; appointments and specialist service workflows are
            being developed. Hospital emergency and priority triage are not supported.
          </p>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-slate-950 p-8 text-white sm:p-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Try Qfast</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="text-3xl font-black sm:text-4xl">Start with a 14-day free trial</h2>
              <p className="mt-3 max-w-xl leading-7 text-slate-300">
                Set up your organization and explore the features available for your business category.
              </p>
            </div>
            <p className="text-4xl font-black">FREE<span className="text-base font-semibold text-slate-400"> trial</span></p>
          </div>
          <Link
            href="/auth/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 font-bold text-white transition hover:bg-orange-400"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <Link href="/" className="font-black text-slate-900">Qfast</Link>
          <p>One platform for better customer flow.</p>
          <div className="flex gap-5">
            <Link href="/auth/login" className="hover:text-slate-900">Log in</Link>
            <Link href="/auth/register" className="hover:text-slate-900">Register</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
