import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  Coffee,
  HeartPulse,
  Scissors,
  Stethoscope,
  Store,
  Ticket,
  Wrench,
  Zap,
} from 'lucide-react';
import { MarketingFooter } from './marketing-footer';
import { MarketingHeader } from './marketing-header';
import { AVAILABLE_BUSINESS_TYPES } from '@/lib/business-types';

const iconByType: Record<string, typeof Store> = {
  RESTAURANT: Store,
  CAFE: Coffee,
  CLINIC: Stethoscope,
  HOSPITAL: HeartPulse,
  SALON: Scissors,
  DIAGNOSTIC_CENTRE: ClipboardList,
  SERVICE_CENTRE: Wrench,
};

const industryContent: Record<string, {
  title: string;
  description: string;
  useCases: string[];
  note?: string;
}> = {
  RESTAURANT: {
    title: 'Serve more. Make customers wait less.',
    description: 'Give walk-ins a clear place in line, let guests track their queue, and keep front-of-house operations together.',
    useCases: ['Manage walk-in queues with FIFO order', 'Share a digital queue link and entrance QR', 'Show customers their position and estimated wait', 'Use table QR ordering and kitchen tools'],
  },
  CAFE: {
    title: 'A smoother line for every cafe visit.',
    description: 'Help guests join the line online or at the counter, then manage your cafe queue and ordering experience in one place.',
    useCases: ['Manage walk-in queues in FIFO order', 'Share a customer queue link or QR', 'Keep guests informed of their estimated wait', 'Use digital menu and ordering tools'],
  },
  CLINIC: {
    title: 'A clearer wait for clinic visitors.',
    description: 'Run named doctor and OPD queues. Visitors join from the discovery page or a QR code, then follow their place in line.',
    useCases: ['Separate queues for each doctor or OPD', 'A public join page with live wait estimates', 'Staff tools to call, recall, and complete the next visitor'],
    note: 'Appointments, clinical records, and priority triage are not part of Qfast. Do not enter medical or diagnostic information.',
  },
  HOSPITAL: {
    title: 'Make non-emergency waiting easier to follow.',
    description: 'Give suitable non-emergency departments an arrival-order queue that visitors can join and follow.',
    useCases: ['A clear arrival-order line for eligible services', 'Customer-facing queue status and wait estimates', 'Staff-managed call and service completion'],
    note: 'Qfast does not support emergency, triage, or clinical priority workflows. Do not enter medical information.',
  },
  SALON: {
    title: 'Make walk-in waiting easier at your salon.',
    description: 'Give each stylist desk or service counter its own live walk-in queue, and let guests join before they reach the door.',
    useCases: ['A clear place in a walk-in line', 'Separate counters for styling, skin, and spa desks', 'A shared staff view of who is waiting'],
    note: 'Stylist calendars and appointment booking are not included. Qfast keeps an arrival-order waitlist.',
  },
  DIAGNOSTIC_CENTRE: {
    title: 'A clearer queue for diagnostic visits.',
    description: 'Open arrival-order queues for collection and imaging desks so visitors know which counter to join.',
    useCases: ['A visible place in a customer line', 'Separate desks for collection and imaging', 'Staff tools for calling the next visitor'],
    note: 'Test booking and clinical-data handling are not included. Do not enter health information.',
  },
  SERVICE_CENTRE: {
    title: 'Keep customer service moving.',
    description: 'Run inspection, warranty, and pickup counters as live queues, and call the next customer in arrival order.',
    useCases: ['Separate counters for inspection, claims, and pickups', 'A public queue link or entrance QR', 'A staff board of waiting and completed visits'],
    note: 'Repair job tracking beyond the queue is not included.',
  },
};

export function IndustryLandingPage({ type }: { type: string }) {
  const content = industryContent[type];
  const Icon = iconByType[type] || Zap;
  const available = AVAILABLE_BUSINESS_TYPES.includes(type as (typeof AVAILABLE_BUSINESS_TYPES)[number]);

  if (!content) return null;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="overflow-hidden bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-300">
              <Icon className="h-4 w-4" /> Qfast for {type === 'DIAGNOSTIC_CENTRE' ? 'diagnostic centres' : type.toLowerCase().replaceAll('_', ' ')}
            </p>
            <h1 className="mt-7 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">{content.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{content.description}</p>
            {content.note && (
              <p className="mt-5 max-w-xl rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                {content.note}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {available ? (
                <Link href={`/auth/register?type=${type}`} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-bold text-white hover:bg-orange-400">
                  Start for your business <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold text-slate-300">
                  This industry is not open for signup yet
                </span>
              )}
              <Link href="/industries" className="inline-flex items-center rounded-xl border border-white/15 px-5 py-3.5 text-sm font-bold text-white hover:bg-white/10">
                Explore industries
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Illustrative preview</p>
                <h2 className="mt-1 text-lg font-black">A simple FIFO queue</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Arrival order</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <Clock3 className="h-5 w-5 text-orange-600" />
                <p className="mt-3 text-xs text-slate-500">People waiting</p>
                <p className="text-2xl font-black">08</p>
              </div>
              <div className="rounded-xl bg-orange-50 p-4">
                <Ticket className="h-5 w-5 text-orange-600" />
                <p className="mt-3 text-xs text-orange-700">Estimated wait</p>
                <p className="text-2xl font-black text-orange-700">~24 min</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {['Now serving · #01', 'Waiting · #02', 'Waiting · #03'].map((entry, index) => (
                <div key={entry} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm">
                  <span className="font-semibold">{entry}</span>
                  {index === 0 && <span className="text-xs font-bold text-emerald-600">Called next</span>}
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">Sample interface, not live business data.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-600">What Qfast can help with</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">A more orderly customer wait</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Qfast&apos;s queue tools are designed around a straightforward rule: customers are served in the order they join.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {content.useCases.map((useCase) => (
              <li key={useCase} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                <span className="text-sm font-semibold leading-6 text-slate-700">{useCase}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-orange-600" />
          <h2 className="mt-4 text-2xl font-black">What stays out of the queue</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Qfast runs live, first-come queues and multiple counters. Appointment booking, clinical records, and repair job tracking stay outside the product. Restaurants and cafes can add table QR ordering and a kitchen display on top of the same queue.
          </p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
