'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

type PlanCard = {
  id: string;
  tier: string;
  name: string;
  description?: string | null;
  priceMonthly: number;
  highlights: string[];
};

type CurrentPlan = {
  name: string;
  tier?: string;
  status: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
};

function money(amount: number) {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function statusLabel(status: string) {
  switch (status) {
    case 'TRIALING':
      return 'Trial';
    case 'ACTIVE':
      return 'Active';
    case 'PAST_DUE':
      return 'Payment due';
    case 'CANCELED':
      return 'Canceled';
    case 'LAPSED':
      return 'Expired';
    default:
      return 'No plan';
  }
}

function when(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PlanBoard() {
  const apiUrl = getApiUrl();
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [current, setCurrent] = useState<CurrentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Sign in again to see your plan.');
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${apiUrl}/api/v1/business`, { headers }).then((response) => response.json()),
      fetch(`${apiUrl}/api/v1/business/plans`, { headers }).then((response) => response.json()),
    ])
      .then(([businesses, planList]) => {
        const business = Array.isArray(businesses) ? businesses[0] : null;
        const subscription = business?.subscriptions?.[0];
        if (subscription?.plan) {
          setCurrent({
            name: subscription.plan.name,
            tier: subscription.plan.tier,
            status: subscription.status,
            trialEndsAt: subscription.trialEndsAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
          });
        }
        setPlans(Array.isArray(planList) ? planList : []);
      })
      .catch(() => setError('Could not load plans.'))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  if (loading) {
    return <p className="text-sm font-semibold text-neutral-500">Loading plans…</p>;
  }

  const trialDate = when(current?.trialEndsAt);
  const periodDate = when(current?.currentPeriodEnd);
  const timing =
    current?.status === 'TRIALING' && trialDate
      ? `Free until ${trialDate}`
      : current?.status === 'LAPSED'
        ? 'The trial is over. Choose a plan to reopen the queue, tables, and kitchen.'
        : periodDate
          ? `Current period ends ${periodDate}`
          : '';

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Current plan</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-neutral-950">{current?.name || 'No plan yet'}</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600">{statusLabel(current?.status || '')}</p>
          </div>
          {timing && <p className="max-w-sm text-sm leading-6 text-neutral-600">{timing}</p>}
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const selected = current?.tier === plan.tier;
          return (
            <article
              key={plan.id}
              className={`flex flex-col rounded-3xl border bg-white p-5 ${selected ? 'border-orange-400 shadow-sm' : 'border-neutral-200'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-black text-neutral-950">{plan.name}</h3>
                {selected && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-orange-800">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-3 text-3xl font-black text-neutral-950">
                {money(plan.priceMonthly)}
                <span className="text-sm font-semibold text-neutral-500">{plan.priceMonthly > 0 ? ' / month' : ''}</span>
              </p>
              {plan.description && <p className="mt-2 text-sm leading-6 text-neutral-600">{plan.description}</p>}
              <ul className="mt-4 space-y-2">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-neutral-800">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {selected ? (
                  <p className="rounded-xl bg-neutral-100 px-3 py-3 text-center text-sm font-bold text-neutral-700">This is your plan</p>
                ) : (
                  <Link href="/contact" className="block rounded-xl bg-neutral-950 px-3 py-3 text-center text-sm font-bold text-white">
                    Talk to us
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
