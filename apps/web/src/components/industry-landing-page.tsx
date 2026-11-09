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
    description: 'Qfast is exploring simple, first-in-first-out waiting lists for suitable clinic reception workflows.',
    useCases: ['One visible place in a FIFO line', 'A shareable customer-facing queue page', 'Staff tools to call and complete the next entry'],
    note: 'Clinic-specific appointments, doctor schedules, patient workflows, and compliance features are not available yet. Do not enter medical or diagnostic information.',
  },
  HOSPITAL: {
    title: 'Make non-emergency waiting easier to follow.',
    description: 'Explore a simple arrival-order queue for suitable non-emergency hospital services.',
    useCases: ['A clear arrival-order line for eligible services', 'Customer-facing queue status and wait estimates', 'Staff-managed call and service completion'],
    note: 'Qfast does not support emergency, triage, or clinical priority workflows. Hospital-specific workflows are not currently available.',
  },
  SALON: {
    title: 'Make walk-in waiting easier at your salon.',
    description: 'Qfast is working toward a clear first-in-first-out waitlist for salon and spa walk-ins.',
    useCases: ['A clear place in a walk-in line', 'A customer-facing queue page', 'A shared staff view of waiting customers'],
    note: 'Stylist schedules, service duration, and appointments are not available yet.',
  },
  DIAGNOSTIC_CENTRE: {
    title: 'A clearer queue for diagnostic visits.',
    description: 'Qfast is exploring arrival-order queues for suitable diagnostic-centre service counters.',
    useCases: ['A visible place in a customer line', 'A QR code or public link for joining', 'Staff tools for managing the queue'],
    note: 'Test booking, sample workflows, and clinical-data handling are not available. Do not enter health information.',
  },
  SERVICE_CENTRE: {
    title: 'Keep customer service moving.',
    description: 'Give walk-in customers a clear place in line and help your team call the next person in arrival order.',
    useCases: ['Manage a simple FIFO walk-in line', 'Share a public queue link or QR code', 'Track waiting and completed entries'],
    note: 'Job tracking and service-centre-specific workflows are not currently available.',
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
          <h2 className="mt-4 text-2xl font-black">Appointments and specialist workflows</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Appointment booking, staff schedules, multi-service configuration, and industry-specific operations are not part of the current release. We will make these capabilities available only after they are implemented and validated.
          </p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
