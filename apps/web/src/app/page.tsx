import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  ClipboardList,
  Clock3,
  QrCode,
  Scissors,
  Stethoscope,
  Store,
  Coffee,
  Ticket,
  Users,
  Wrench,
} from 'lucide-react';
import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingHeader } from '@/components/marketing-header';

const problems = [
  {
    title: 'The room fills up before anyone is served',
    detail: 'People stand because they are afraid of losing their place. Staff spend the rush answering “how long?” instead of doing the work.',
  },
  {
    title: 'Paper tokens and shouted names do not scale',
    detail: 'A missed call becomes a no-show. The next person does not know they are next. The counter has no shared picture of the line.',
  },
  {
    title: 'One busy hour sets the tone for the whole day',
    detail: 'Clinics, salons, labs, service desks, and restaurants lose the same thing: time, calm, and customers who would have stayed if the wait was clear.',
  },
];

const steps = [
  {
    icon: QrCode,
    title: 'Put a QR at the entrance',
    detail: 'Customers join from the browser. There is no app to install and no public directory of every business on Qfast.',
  },
  {
    icon: Ticket,
    title: 'They keep their place in line',
    detail: 'Each person sees their token and where they stand. Your team sees the same line, in the order people joined.',
  },
  {
    icon: Bell,
    title: 'Call the next person',
    detail: 'One tap on the staff board calls, recalls, or completes the visit. The customer is notified on the page they already have open.',
  },
];

const outcomes = [
  { icon: Users, title: 'For the people waiting', detail: 'They can step away from the door without losing their turn.' },
  { icon: ClipboardList, title: 'For the counter', detail: 'Walk-ins and remote joins sit in one list. The next name is never a guess.' },
  { icon: Clock3, title: 'For the business', detail: 'A clearer wait means fewer walkaways and a team that spends the rush serving, not managing a crowd.' },
];

const stats = [
  { value: '30 days', label: 'full product trial' },
  { value: '1 QR', label: 'all guest journeys start here' },
  { value: '100%', label: 'browser-based, no app install' },
];

const industries = [
  { icon: Stethoscope, label: 'Clinics', href: '/clinics', detail: 'One live queue. A completed visit asks for a Google review.' },
  { icon: Scissors, label: 'Salons', href: '/salons', detail: 'One walk-in queue, in arrival order.' },
  { icon: ClipboardList, label: 'Diagnostics', href: '/diagnostics', detail: 'One queue for collection and imaging.' },
  { icon: Wrench, label: 'Service centres', href: '/service-centres', detail: 'One queue for the counter.' },
  { icon: Store, label: 'Restaurants', href: '/restaurants', detail: 'The waitlist, plus table ordering, bills, and stamp cards.' },
  { icon: Coffee, label: 'Cafes', href: '/cafes', detail: 'The same queue and table QR, sized for a counter that turns over fast.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,rgba(249,115,22,0.22),transparent_46%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              For clinics, salons, labs, service desks, and restaurants
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              The wait should be obvious.
              <span className="mt-2 block bg-gradient-to-r from-orange-300 to-amber-400 bg-clip-text text-transparent">
                The crowd should not be.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Qfast gives every customer a place in line and gives your team one board to call the next person. They join from a QR code. You stay in control of who is waiting.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/30 hover:bg-orange-600"
              >
                Open your queue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-base font-semibold text-white hover:bg-white/15"
              >
                Book a demo
              </Link>
            </div>
            <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xl font-black text-white">{item.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-300">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">The full product is free for 30 days. After that, a subscription keeps the queue open.</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-300">Staff board</p>
                <h2 className="mt-1 text-lg font-black">General queue</h2>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">3 waiting</span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['Now serving', '#12 · Ananya Rao', 'Called'],
                ['Next', '#13 · Imran Qureshi', 'Waiting'],
                ['After', '#14 · Meera Iyer', 'Waiting'],
              ].map(([state, name, badge]) => (
                <div key={name} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-800/60 p-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{state}</p>
                    <p className="mt-1 font-bold text-white">{name}</p>
                  </div>
                  <span className={`rounded-lg px-3 py-1 text-xs font-bold ${badge === 'Called' ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-300'}`}>
                    {badge}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">Illustrative board. Customers only see the queue for your business.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <p className="text-xs font-black uppercase tracking-widest text-orange-600">The problem</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Waiting feels worse when nobody can see the line.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {problems.map((problem) => (
            <article key={problem.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-lg font-black">{problem.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{problem.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="text-xs font-black uppercase tracking-widest text-orange-300">How Qfast solves it</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Three steps between the door and a calmer counter.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-sm font-black text-orange-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{step.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-600">What changes</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Both sides of the counter get a clearer hour.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {outcomes.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-3xl border border-slate-200 p-5">
                  <Icon className="h-5 w-5 text-orange-600" />
                  <h3 className="mt-4 font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-black">The same queue, shaped for the work you do</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry) => {
              const Icon = industry.icon;
              return (
                <Link key={industry.label} href={industry.href} className="rounded-3xl border border-slate-200 p-5 transition hover:border-orange-300 hover:shadow-md">
                  <Icon className="h-5 w-5 text-orange-600" />
                  <h3 className="mt-4 font-black">{industry.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{industry.detail}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="advanced" className="border-t border-slate-200 bg-slate-50 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-black uppercase tracking-widest text-orange-600">Advanced plan</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Thirty days of the full product, then a subscription.</h2>
          <p className="mt-4 text-slate-600 leading-7">
            Restaurants and cafes get the queue, table QR ordering, the kitchen, bills, and stamp cards. Clinics, salons, labs, and service desks get a live queue and a Google review after the visit. When the 30 days end, the workspace asks you to subscribe before customers can join again.
          </p>
          <Link href="/auth/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-600">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-slate-950 px-5 py-16 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-black">Open your queue today.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Create the workspace, print the entrance QR, and call the next person from one board.</p>
          </div>
          <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-600">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
