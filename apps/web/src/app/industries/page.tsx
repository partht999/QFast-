import Link from 'next/link';
import { ArrowRight, Store, Coffee, Stethoscope, HeartPulse, Scissors, ClipboardList, Wrench, Zap } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';
import { BUSINESS_TYPES, AVAILABLE_BUSINESS_TYPES } from '@/lib/business-types';

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

const industryUrls: Record<string, string> = {
  RESTAURANT: '/restaurants',
  CAFE: '/cafes',
  CLINIC: '/clinics',
  HOSPITAL: '/clinics',
  SALON: '/salons',
  DIAGNOSTIC_CENTRE: '/diagnostics',
  SERVICE_CENTRE: '/service-centres',
};

export default function IndustriesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-300">
            One Platform · Multiple Industries
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            Customer flow solutions for every service industry
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Clinics, salons, diagnostic labs, service centres, and restaurants use the same live queue, QR check-in, and staff board.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_TYPES.map((industry) => {
            const Icon = industryIcons[industry.value] || Store;
            const isAvailable = AVAILABLE_BUSINESS_TYPES.includes(industry.value);
            const detailUrl = industryUrls[industry.value] || '/';

            return (
              <div
                key={industry.value}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isAvailable ? 'Available now' : 'Waitlist ready'}
                    </span>
                  </div>
                  <h2 className="mt-5 text-xl font-bold">{industry.label}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{industry.detail}</p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                  <Link
                    href={detailUrl}
                    className="text-xs font-bold text-slate-600 hover:text-orange-600"
                  >
                    View details
                  </Link>
                  {isAvailable ? (
                    <Link
                      href={`/auth/register?type=${industry.value}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                    >
                      Start free trial <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Queue preview ready</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

