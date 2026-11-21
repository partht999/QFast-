'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  Flame,
  Hourglass,
  ListOrdered,
  PartyPopper,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Utensils,
  UtensilsCrossed,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { isFoodBusiness } from '@/lib/business-links';
import { describePayments } from '@/lib/payment';
import { lineName } from '@/lib/order-line';
import { readApiError } from '@/lib/read-api-error';
import { rupees, guestsLabel } from '@/lib/format';
import { tableLabel } from '@/lib/table-label';
import { storageGet, storageSet } from '@/lib/safe-storage';
import { useToast } from '@/components/ui/toast';
import { pickBusiness } from '@/lib/current-business';

/* ────────────────────────────────────────────────────────────────────────────
 * Data
 * ──────────────────────────────────────────────────────────────────────────── */

type Snapshot = {
  business: any | null;
  tokens: any[];
  orders: any[];
  tables: any[];
  dishCount: number | null;
};

const EMPTY: Snapshot = { business: null, tokens: [], orders: [], tables: [], dishCount: null };

async function getJson(url: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) throw Object.assign(new Error('signed-out'), { status: 401 });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

/** Loads everything the live board needs and refreshes it every few seconds. */
export function useLiveService(intervalMs = 5000) {
  const router = useRouter();
  const apiUrl = getApiUrl();
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const reload = useCallback(async () => {
    const token = storageGet('accessToken');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    try {
      const businesses = await getJson(`${apiUrl}/api/v1/business`, token);
      const business = pickBusiness(businesses);
      if (!business) {
        setData(EMPTY);
        return;
      }
      const food = isFoodBusiness(business.type);
      const [queue, orders, tables, menu] = await Promise.all([
        getJson(`${apiUrl}/api/v1/queue/manage/${business.id}`, token),
        food ? getJson(`${apiUrl}/api/v1/orders/bills/${business.id}`, token) : Promise.resolve([]),
        food ? getJson(`${apiUrl}/api/v1/tables/${business.id}`, token) : Promise.resolve([]),
        food ? getJson(`${apiUrl}/api/v1/menu/${business.id}`, token) : Promise.resolve(null),
      ]);
      const dishCount = menu?.categories
        ? menu.categories.reduce((sum: number, category: any) => sum + (category.items?.length || 0), 0)
        : food
          ? null
          : 0;
      setData({
        business,
        tokens: Array.isArray(queue?.tokens) ? queue.tokens : [],
        orders: Array.isArray(orders) ? orders : [],
        tables: Array.isArray(tables) ? tables : [],
        dishCount,
      });
      setError('');
      setUpdatedAt(new Date());
    } catch (err: any) {
      if (err?.status === 401) {
        router.replace('/auth/login');
        return;
      }
      setError('Could not reach the server. Showing the last update.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, router]);

  useEffect(() => {
    void reload();
    const tick = () => {
      if (!document.hidden) void reload();
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [reload, intervalMs]);

  return { ...data, loading, error, updatedAt, reload, apiUrl };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage logic: which column a guest or order is in, and what the next step is
 * ──────────────────────────────────────────────────────────────────────────── */

export type StageKey = 'waiting' | 'called' | 'new' | 'cooking' | 'ready' | 'payment';

type StageMeta = {
  key: StageKey;
  title: string;
  who: string;
  hint: string;
  icon: any;
  tone: string;
  dot: string;
};

const FOOD_STAGES: StageMeta[] = [
  { key: 'waiting', title: 'In the queue', who: 'Host', hint: 'Guests waiting for a table. Call the first one when a table is free.', icon: ListOrdered, tone: 'border-sky-200 bg-sky-50 text-sky-800', dot: 'bg-sky-500' },
  { key: 'called', title: 'Called & seated', who: 'Host', hint: 'Seat them when they reach the host stand. Finish the visit when they leave.', icon: Bell, tone: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  { key: 'new', title: 'New orders', who: 'Kitchen', hint: 'Fresh orders from tables, the queue and takeaway. Accept to start cooking.', icon: Sparkles, tone: 'border-orange-200 bg-orange-50 text-orange-800', dot: 'bg-orange-500' },
  { key: 'cooking', title: 'Cooking', who: 'Kitchen', hint: 'Food on the stove. Mark it ready when it is plated.', icon: Flame, tone: 'border-rose-200 bg-rose-50 text-rose-800', dot: 'bg-rose-500' },
  { key: 'ready', title: 'Ready to serve', who: 'Waiter', hint: 'Take it to the table (or hand over takeaway), then mark it served.', icon: UtensilsCrossed, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  { key: 'payment', title: 'Payment', who: 'Counter', hint: 'Served and waiting to pay. Mark paid, then close the bill.', icon: CreditCard, tone: 'border-violet-200 bg-violet-50 text-violet-800', dot: 'bg-violet-500' },
];

const SERVICE_STAGES: StageMeta[] = [
  { key: 'waiting', title: 'In the queue', who: 'Front desk', hint: 'People waiting. Call the first one when you are free.', icon: ListOrdered, tone: 'border-sky-200 bg-sky-50 text-sky-800', dot: 'bg-sky-500' },
  { key: 'called', title: 'Being served', who: 'Front desk', hint: 'Called in. Mark done when the visit is finished.', icon: Bell, tone: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
];

function minutesSince(value?: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}

function ago(value?: string | null) {
  const min = minutesSince(value);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m ago`;
}

function orderWhere(order: any) {
  if (order.table?.name) return tableLabel(order.table.name);
  if (order.source === 'TAKEAWAY') return 'Takeaway';
  if (order.queueToken?.tokenNumber) return `Queue #${order.queueToken.tokenNumber}`;
  return 'Order';
}

function orderStage(order: any): StageKey | null {
  if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status)) return null;
  if (order.servedAt) return 'payment';
  if (order.status === 'READY') return 'ready';
  if (order.status === 'PREPARING') return 'cooking';
  return 'new';
}

/** A pre-order stays on hold until its party is called, the API refuses to cook it before that. */
function heldPreorder(order: any) {
  const status = order.queueToken?.status;
  return Boolean(order.queueTokenId && status && status !== 'CALLED' && status !== 'SEATED');
}

const ORDER_STEPS = ['Placed', 'Cooking', 'Ready', 'Served', 'Paid'];

function orderStepIndex(order: any) {
  const paid = describePayments(order.payments, Number(order.totalAmount || 0)).paid;
  if (order.servedAt && paid) return 4;
  if (order.servedAt) return 3;
  if (order.status === 'READY') return 2;
  if (order.status === 'PREPARING') return 1;
  return 0;
}

/* ────────────────────────────────────────────────────────────────────────────
 * UI pieces
 * ──────────────────────────────────────────────────────────────────────────── */

function MiniSteps({ index }: { index: number }) {
  return (
    <ol className="mt-3 flex items-center gap-1" aria-label={`Step ${index + 1} of ${ORDER_STEPS.length}: ${ORDER_STEPS[index]}`}>
      {ORDER_STEPS.map((step, i) => (
        <li key={step} className="flex flex-1 flex-col items-center gap-1">
          <span className={`h-1.5 w-full rounded-full ${i <= index ? 'bg-orange-500' : 'bg-neutral-200'}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wide ${i === index ? 'text-orange-700' : 'text-neutral-400'}`}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function ActionButton({
  children,
  onClick,
  busy,
  disabled,
  tone = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'success';
}) {
  const styles =
    tone === 'secondary'
      ? 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
      : tone === 'success'
        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
        : 'bg-orange-500 text-white hover:bg-orange-600';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function TablePicker({
  tables,
  partySize,
  value,
  onChange,
}: {
  tables: any[];
  partySize: number;
  value: string;
  onChange: (id: string) => void;
}) {
  const free = tables.filter(
    (table) => !(table.orders?.length || table.queueTokens?.length) && (table.capacity || 0) >= (partySize || 1),
  );
  if (!free.length) {
    return <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-900">No free table fits {guestsLabel(partySize)} right now.</p>;
  }
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Choose a table"
      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800"
    >
      <option value="">Choose a free table…</option>
      {free.map((table) => (
        <option key={table.id} value={table.id}>
          {tableLabel(table.name)} · seats {table.capacity}
        </option>
      ))}
    </select>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The board
 * ──────────────────────────────────────────────────────────────────────────── */

export function LiveBoard() {
  const toast = useToast();
  const live = useLiveService();
  const { business, tokens, orders, tables, dishCount, loading, error, updatedAt, reload, apiUrl } = live;
  const food = isFoodBusiness(business?.type);
  const stages = food ? FOOD_STAGES : SERVICE_STAGES;
  const [busyId, setBusyId] = useState('');
  const [tableChoice, setTableChoice] = useState<Record<string, string>>({});
  const [focus, setFocus] = useState<StageKey | 'all'>('all');
  const [sound, setSound] = useState(true);
  const seenOrders = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSound(storageGet('qfast_board_sound') !== 'off');
  }, []);

  // Chime and highlight when an order arrives that we have not seen before.
  useEffect(() => {
    if (loading) return;
    const ids = new Set(orders.map((order) => order.id));
    if (seenOrders.current === null) {
      seenOrders.current = ids;
      return;
    }
    const arrived = orders.filter((order) => !seenOrders.current!.has(order.id)).map((order) => order.id);
    seenOrders.current = ids;
    if (!arrived.length) return;
    setFreshIds((current) => new Set([...current, ...arrived]));
    window.setTimeout(() => {
      setFreshIds((current) => {
        const next = new Set(current);
        arrived.forEach((id) => next.delete(id));
        return next;
      });
    }, 15000);
    if (sound) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } catch {
        /* autoplay blocked until the page is clicked */
      }
    }
  }, [orders, sound, loading]);

  const waiting = useMemo(
    () =>
      tokens
        .filter((token) => token.status === 'WAITING')
        .sort((a, b) => (b.priority || 0) - (a.priority || 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [tokens],
  );
  const called = useMemo(() => tokens.filter((token) => token.status === 'CALLED' || token.status === 'SEATED'), [tokens]);
  const byStage = useMemo(() => {
    const groups: Record<StageKey, any[]> = { waiting: [], called: [], new: [], cooking: [], ready: [], payment: [] };
    for (const order of orders) {
      const stage = orderStage(order);
      if (stage) groups[stage].push(order);
    }
    return groups;
  }, [orders]);

  const counts: Record<StageKey, number> = {
    waiting: waiting.length,
    called: called.length,
    new: byStage.new.filter((order) => !heldPreorder(order)).length,
    cooking: byStage.cooking.length,
    ready: byStage.ready.length,
    payment: byStage.payment.length,
  };
  const needsYou = counts.new + counts.ready + counts.payment;

  useEffect(() => {
    const base = 'Live board · Qfast';
    document.title = needsYou > 0 ? `(${needsYou}) ${base}` : base;
    return () => {
      document.title = 'Qfast';
    };
  }, [needsYou]);

  const run = async (id: string, request: () => Promise<Response>, success: string, detail?: string) => {
    setBusyId(id);
    try {
      const response = await request();
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(body, 'That did not work. Please try again.'));
      toast.success(success, detail);
      await reload();
    } catch (err) {
      toast.error('Not done', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId('');
    }
  };

  const authed = (path: string, body?: unknown) => () =>
    fetch(`${apiUrl}/api/v1/${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storageGet('accessToken') || ''}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-neutral-500">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading the live board…
      </div>
    );
  }

  if (!business) {
    return (
      <div className="ui-card mx-auto max-w-lg p-6 text-center">
        <h1 className="ui-title">Set up your business first</h1>
        <p className="ui-copy mt-2">Finish onboarding, then this board shows every guest from the queue to the bill.</p>
        <Link href="/dashboard/onboarding" className="ui-btn-primary mt-4 inline-flex">
          Start setup <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const setupSteps = food
    ? [
        { done: (dishCount ?? 1) > 0, label: 'Add your dishes', detail: 'Guests order from this menu.', href: '/dashboard/menu', cta: 'Add dishes' },
        { done: tables.length > 0, label: 'Create tables & print QR codes', detail: 'One QR per table for ordering.', href: '/dashboard/tables', cta: 'Add tables' },
        { done: tokens.length > 0 || orders.length > 0, label: 'Try it as a guest', detail: 'Join your own queue from your phone.', href: `/r/${business.slug}/join`, cta: 'Open guest page' },
      ]
    : [];
  const setupLeft = setupSteps.filter((step) => !step.done);

  const visibleStages = stages.filter((stage) => focus === 'all' || stage.key === focus);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="ui-title">Live board</h1>
          <p className="ui-copy max-w-2xl">
            {food
              ? 'Every guest and order, from joining the queue to paying. Press the button on a card to move it to the next step.'
              : 'Everyone in your queue. Press the button on a card to move them to the next step.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
          </span>
          {updatedAt && <span>Updated {updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          {food && (
            <button
              type="button"
              onClick={() => {
                const next = !sound;
                setSound(next);
                storageSet('qfast_board_sound', next ? 'on' : 'off');
              }}
              aria-pressed={sound}
              title={sound ? 'Chime on new orders: on' : 'Chime on new orders: off'}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            >
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => void reload()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            aria-label="Refresh now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{error}</p>}

      {/* Getting started checklist for a new restaurant */}
      {setupLeft.length > 0 && (
        <section className="ui-card p-4 sm:p-5" aria-labelledby="setup-title">
          <h2 id="setup-title" className="text-base font-black text-neutral-950">Get ready for your first guest</h2>
          <p className="mt-0.5 text-sm text-neutral-500">{setupSteps.length - setupLeft.length} of {setupSteps.length} done</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {setupSteps.map((step, index) => (
              <li
                key={step.label}
                className={`flex items-start gap-3 rounded-2xl border p-3 ${step.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-neutral-200 bg-white'}`}
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${step.done ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  {step.done ? '✓' : index + 1}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${step.done ? 'text-emerald-900 line-through decoration-emerald-400' : 'text-neutral-900'}`}>{step.label}</p>
                  <p className="text-xs text-neutral-500">{step.detail}</p>
                  {!step.done && (
                    <Link href={step.href} target={step.href.startsWith('/r/') ? '_blank' : undefined} className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-orange-700 hover:underline">
                      {step.cta} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Journey strip: doubles as a filter */}
      <nav aria-label="Stages" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFocus('all')}
          className={`shrink-0 rounded-2xl border px-3.5 py-2 text-left transition ${focus === 'all' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'}`}
        >
          <span className="block text-[11px] font-bold uppercase tracking-wide opacity-70">Everything</span>
          <span className="block text-sm font-black">{needsYou > 0 ? `${needsYou} need you` : 'All calm'}</span>
        </button>
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const active = focus === stage.key;
          return (
            <div key={stage.key} className="flex shrink-0 items-center gap-2">
              {index > 0 && <ArrowRight className="hidden h-4 w-4 text-neutral-300 sm:block" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => setFocus(active ? 'all' : stage.key)}
                aria-pressed={active}
                className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition ${active ? 'border-neutral-900 ring-2 ring-neutral-900/10' : 'border-neutral-200 hover:border-neutral-300'} bg-white`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${stage.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-neutral-400">{index + 1}. {stage.who}</span>
                  <span className="block text-sm font-black text-neutral-900">
                    {stage.title} <span className="tabular text-neutral-500">· {counts[stage.key]}</span>
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      {focus === 'all' && (
        <p className="-mb-2 text-xs font-semibold text-neutral-500 md:hidden">
          Swipe sideways for the next step, or tap a step above to see just that one.
        </p>
      )}

      {/* Columns */}
      <div
        className={
          focus === 'all'
            ? `flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:grid md:overflow-visible ${food ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`
            : 'flex pb-3'
        }
      >
        {visibleStages.map((stage) => {
          const Icon = stage.icon;
          const cards =
            stage.key === 'waiting' ? waiting : stage.key === 'called' ? called : byStage[stage.key];
          return (
            <section
              key={stage.key}
              aria-labelledby={`stage-${stage.key}`}
              className={`flex shrink-0 snap-start flex-col rounded-3xl border border-neutral-200 bg-neutral-50/70 ${focus === 'all' ? 'w-[85vw] max-w-[340px] md:w-auto md:max-w-none' : 'w-full max-w-xl'}`}
            >
              <div className="border-b border-neutral-200 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 id={`stage-${stage.key}`} className="flex items-center gap-2 text-sm font-black text-neutral-950">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                    {stage.title}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black tabular text-neutral-700 shadow-xs">{cards.length}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  <span className="font-bold text-neutral-700">{stage.who}:</span> {stage.hint}
                </p>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5 md:max-h-[460px]">
                {cards.length === 0 && (
                  <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center text-xs text-neutral-400">
                    <Icon className="h-6 w-6 text-neutral-300" />
                    Nothing here right now
                  </div>
                )}

                {/* Queue: waiting */}
                {stage.key === 'waiting' &&
                  cards.map((token, index) => {
                    const first = index === 0;
                    const choice = tableChoice[token.id] || '';
                    const needsTable = food && !token.tableId;
                    return (
                      <article key={token.id} className={`rounded-2xl border bg-white p-3 shadow-xs ${first ? 'border-sky-300' : 'border-neutral-200'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-neutral-950">
                              <span className="text-orange-600">#{token.tokenNumber}</span> {token.customerName}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              {food ? `${guestsLabel(token.partySize)} · ` : ''}joined {ago(token.createdAt)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase text-neutral-600">
                            {first ? 'Next' : `${index + 1} in line`}
                          </span>
                        </div>
                        {token.notes && <p className="mt-2 rounded-lg bg-neutral-50 px-2 py-1.5 text-xs text-neutral-700">“{token.notes}”</p>}
                        {Array.isArray(token.orders) && token.orders.length > 0 && (
                          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                            <ShoppingBag className="h-3 w-3" /> Ordered ahead
                          </p>
                        )}
                        {first ? (
                          <div className="mt-3 space-y-2">
                            {needsTable && (
                              <TablePicker
                                tables={tables}
                                partySize={token.partySize}
                                value={choice}
                                onChange={(id) => setTableChoice((current) => ({ ...current, [token.id]: id }))}
                              />
                            )}
                            <ActionButton
                              busy={busyId === token.id}
                              disabled={needsTable && !choice}
                              onClick={() =>
                                void run(
                                  token.id,
                                  authed(`queue/manage/token/${token.id}/call`, { tableId: choice || undefined }),
                                  `Called #${token.tokenNumber}`,
                                  'Their phone shows that it is their turn.',
                                )
                              }
                            >
                              <Bell className="h-4 w-4" /> Call {token.customerName.split(' ')[0]}
                            </ActionButton>
                          </div>
                        ) : (
                          <p className="mt-2 text-[11px] text-neutral-400">Call the guests ahead of them first.</p>
                        )}
                      </article>
                    );
                  })}

                {/* Queue: called or seated */}
                {stage.key === 'called' &&
                  cards.map((token) => {
                    const seated = token.status === 'SEATED';
                    const choice = tableChoice[token.id] || token.tableId || '';
                    return (
                      <article key={token.id} className={`rounded-2xl border bg-white p-3 shadow-xs ${seated ? 'border-emerald-200' : 'border-amber-300'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-neutral-950">
                              <span className="text-orange-600">#{token.tokenNumber}</span> {token.customerName}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              {food ? `${guestsLabel(token.partySize)} · ` : ''}
                              {seated ? `seated ${ago(token.seatedAt)}` : `called ${ago(token.calledAt)}`}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${seated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                            {seated ? (token.table?.name ? tableLabel(token.table.name) : 'Seated') : token.arrivedAt ? 'Arrived' : token.onTheWayAt ? 'On the way' : 'Called'}
                          </span>
                        </div>
                        {!seated && token.table?.name && food && (
                          <p className="mt-2 text-xs font-semibold text-neutral-700">Table held: {tableLabel(token.table.name)}</p>
                        )}
                        {!seated && token.arrivalDeadlineAt && !token.arrivedAt && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-800">
                            <Clock className="h-3 w-3" /> Should arrive by{' '}
                            {new Date(token.arrivalDeadlineAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <div className="mt-3 space-y-2">
                          {!seated && food && (
                            <>
                              {!token.tableId && (
                                <TablePicker
                                  tables={tables}
                                  partySize={token.partySize}
                                  value={choice}
                                  onChange={(id) => setTableChoice((current) => ({ ...current, [token.id]: id }))}
                                />
                              )}
                              <ActionButton
                                tone="success"
                                busy={busyId === token.id}
                                disabled={!choice}
                                onClick={() =>
                                  void run(
                                    token.id,
                                    authed(`queue/manage/token/${token.id}/seat`, { tableId: choice || undefined }),
                                    `Seated #${token.tokenNumber}`,
                                    'They can now order from their phone.',
                                  )
                                }
                              >
                                <Utensils className="h-4 w-4" /> Seat at table
                              </ActionButton>
                            </>
                          )}
                          {(seated || !food) && (
                            <ActionButton
                              tone={food ? 'secondary' : 'success'}
                              busy={busyId === token.id}
                              onClick={() =>
                                void run(
                                  token.id,
                                  authed(`queue/manage/token/${token.id}/complete`),
                                  food ? 'Visit finished' : 'Marked done',
                                  food ? 'The table is free again.' : undefined,
                                )
                              }
                            >
                              <CheckCircle2 className="h-4 w-4" /> {food ? 'Guests left · finish visit' : 'Mark done'}
                            </ActionButton>
                          )}
                        </div>
                      </article>
                    );
                  })}

                {/* Orders */}
                {['new', 'cooking', 'ready', 'payment'].includes(stage.key) &&
                  cards.map((order) => {
                    const held = heldPreorder(order);
                    const payment = describePayments(order.payments, Number(order.totalAmount || 0));
                    const takeaway = order.source === 'TAKEAWAY';
                    const late = stage.key === 'cooking' && minutesSince(order.updatedAt) > 25;
                    return (
                      <article
                        key={order.id}
                        className={`rounded-2xl border bg-white p-3 shadow-xs transition ${freshIds.has(order.id) ? 'border-orange-400 ring-4 ring-orange-100' : late ? 'border-rose-300' : 'border-neutral-200'} ${held && stage.key === 'new' ? 'opacity-70' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-black text-neutral-950">
                              {takeaway ? <ShoppingBag className="h-3.5 w-3.5 text-violet-600" /> : <Utensils className="h-3.5 w-3.5 text-orange-600" />}
                              {orderWhere(order)}
                              {freshIds.has(order.id) && <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">New</span>}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-neutral-500">
                              {order.customerName || 'Guest'} · {ago(order.createdAt)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-black tabular text-neutral-900">{rupees(order.totalAmount)}</span>
                        </div>
                        <ul className="mt-2 space-y-0.5 text-[13px] text-neutral-800">
                          {(order.items || []).slice(0, 4).map((item: any) => (
                            <li key={item.id} className="flex gap-1.5">
                              <span className="font-black text-orange-600">{item.quantity}×</span>
                              <span className="min-w-0 truncate">{lineName(item.menuItem?.name, item.addons)}</span>
                            </li>
                          ))}
                          {(order.items || []).length > 4 && <li className="text-xs text-neutral-500">+{order.items.length - 4} more</li>}
                        </ul>
                        {order.specialInstructions && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900">Note: {order.specialInstructions}</p>}
                        <MiniSteps index={orderStepIndex(order)} />
                        {late && <p className="mt-2 text-[11px] font-bold text-rose-700">Cooking for {minutesSince(order.updatedAt)} min</p>}

                        <div className="mt-3 space-y-2">
                          {stage.key === 'new' &&
                            (held ? (
                              <p className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-2 text-xs font-semibold text-neutral-600">
                                <Hourglass className="h-3.5 w-3.5" /> Pre-order on hold until #{order.queueToken?.tokenNumber} is called.
                              </p>
                            ) : (
                              <ActionButton
                                busy={busyId === order.id}
                                onClick={() =>
                                  void run(order.id, authed(`orders/${order.id}/status`, { status: 'PREPARING' }), 'Order accepted', 'It is now in Cooking.')
                                }
                              >
                                <ChefHat className="h-4 w-4" /> Accept & start cooking
                              </ActionButton>
                            ))}
                          {stage.key === 'cooking' && (
                            <ActionButton
                              tone="success"
                              busy={busyId === order.id}
                              onClick={() => void run(order.id, authed(`orders/${order.id}/status`, { status: 'READY' }), 'Marked ready', 'A waiter can take it now.')}
                            >
                              <Bell className="h-4 w-4" /> Food is ready
                            </ActionButton>
                          )}
                          {stage.key === 'ready' && (
                            <ActionButton
                              tone="success"
                              busy={busyId === order.id}
                              onClick={() => void run(order.id, authed(`orders/${order.id}/served`), takeaway ? 'Handed over' : 'Served', 'It moved to Payment.')}
                            >
                              <CheckCircle2 className="h-4 w-4" /> {takeaway ? 'Handed to guest' : 'Served at table'}
                            </ActionButton>
                          )}
                          {stage.key === 'payment' &&
                            (payment.paid ? (
                              <ActionButton
                                tone="secondary"
                                busy={busyId === order.id}
                                onClick={() => void run(order.id, authed(`orders/${order.id}/close`), 'Bill closed', 'Loyalty stamps were added.')}
                              >
                                <Receipt className="h-4 w-4" /> Paid · close bill
                              </ActionButton>
                            ) : (
                              <ActionButton
                                busy={busyId === order.id}
                                onClick={() => void run(order.id, authed(`orders/${order.id}/pay`), 'Payment recorded', 'Now close the bill.')}
                              >
                                <CreditCard className="h-4 w-4" /> Collect {rupees(order.totalAmount)} · mark paid
                              </ActionButton>
                            ))}
                        </div>
                      </article>
                    );
                  })}
              </div>
            </section>
          );
        })}
      </div>

      {food && needsYou === 0 && waiting.length === 0 && called.length === 0 && setupLeft.length === 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <PartyPopper className="h-5 w-5 shrink-0" />
          All calm. New guests and orders appear here on their own, with a chime.
        </div>
      )}

      <ScreenGuide food={food} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * "Which screen does what" guide for staff
 * ──────────────────────────────────────────────────────────────────────────── */

export function ScreenGuide({ food }: { food: boolean }) {
  const rows = food
    ? [
        { name: 'Live board', href: '/dashboard/live', who: 'Manager / host', what: 'See everything at once and move guests and orders to the next step.' },
        { name: 'Queue', href: '/dashboard/queue', who: 'Host stand', what: 'Add walk-in guests, skip or remove someone, open or pause the queue.' },
        { name: 'Kitchen', href: '/dashboard/kds', who: 'Cooks', what: 'A big screen for the kitchen: start cooking and mark food ready.' },
        { name: 'Bills', href: '/dashboard/bills', who: 'Counter', what: 'Take payment (UPI, cash, card) and close bills.' },
        { name: 'Menu', href: '/dashboard/menu', who: 'Owner', what: 'Add dishes, prices and photos. Mark a dish sold out.' },
        { name: 'Tables', href: '/dashboard/tables', who: 'Owner', what: 'Add tables and print the QR code for each table.' },
      ]
    : [
        { name: 'Live board', href: '/dashboard/live', who: 'Front desk', what: 'Call the next person and mark visits done.' },
        { name: 'Queue', href: '/dashboard/queue', who: 'Front desk', what: 'Add walk-ins, skip or remove someone, open or pause the queue.' },
      ];
  return (
    <details className="ui-card group p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-black text-neutral-950">Which screen does what?</span>
          <span className="block text-xs text-neutral-500">Share this with your team so everyone knows their job.</span>
        </span>
        <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-bold text-neutral-600 group-open:hidden">Show</span>
        <span className="hidden rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-bold text-neutral-600 group-open:inline">Hide</span>
      </summary>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <Link key={row.name} href={row.href} className="rounded-2xl border border-neutral-200 p-3 transition hover:border-orange-300 hover:bg-orange-50/40">
            <p className="flex items-center justify-between text-sm font-black text-neutral-950">
              {row.name} <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
            </p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-700">{row.who}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">{row.what}</p>
          </Link>
        ))}
      </div>
    </details>
  );
}
