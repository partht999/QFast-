import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { PLANS } from '@/lib/plans';

export function PricingPlans() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {PLANS.map((plan) => (
        <article
          key={plan.id}
          className={`relative flex flex-col rounded-3xl border p-7 sm:p-8 ${
            plan.highlighted
              ? 'border-orange-500 bg-white shadow-xl ring-2 ring-orange-500/20'
              : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          {plan.badge && (
            <span className="absolute -top-3.5 right-6 rounded-full bg-orange-500 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
              {plan.badge}
            </span>
          )}
          <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
          <p className="mt-1 text-xs font-semibold text-orange-600">{plan.audience}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900">{plan.price}</span>
            <span className="text-sm font-semibold text-slate-500">{plan.period}</span>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-slate-700">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            href={plan.href}
            className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition ${
              plan.highlighted
                ? 'bg-orange-500 text-white shadow-md hover:bg-orange-600'
                : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
            }`}
          >
            {plan.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      ))}
    </div>
  );
}
