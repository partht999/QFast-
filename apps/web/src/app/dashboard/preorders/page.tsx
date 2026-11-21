'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, Clock, Hourglass, Flame, BellRing, UserX, Trash2, ChefHat, RefreshCw, Phone, Zap } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { rupees } from '@/lib/format';
import { lineName } from '@/lib/order-line';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { pickBusiness } from '@/lib/current-business';

type Group = 'SCHEDULED' | 'COOKING' | 'READY' | 'SKIPPED';

const GROUPS: { key: Group; title: string; hint: string; icon: typeof Clock; tone: string }[] = [
  { key: 'SCHEDULED', title: 'Scheduled', hint: 'Kitchen starts automatically when the guest is close to their turn', icon: Hourglass, tone: 'amber' },
  { key: 'COOKING', title: 'Cooking for guest', hint: 'Guest was told when to reach', icon: Flame, tone: 'orange' },
  { key: 'READY', title: 'Ready, guest on the way', hint: 'Hot food is waiting at the pass', icon: BellRing, tone: 'emerald' },
  { key: 'SKIPPED', title: 'Skipped or missing', hint: 'Cancel if the guest is not coming back', icon: UserX, tone: 'rose' },
];

const TONES: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
};

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function ManagePreordersPage() {
  const router = useRouter();
  const apiUrl = getApiUrl();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return router.push('/auth/login');
    try {
      const bizRes = await fetch(`${apiUrl}/api/v1/business`, { headers: { Authorization: `Bearer ${token}` } });
      if (bizRes.status === 401) return router.push('/auth/login');
      const biz = pickBusiness(await bizRes.json());
      if (!biz) return;
      const res = await fetch(`${apiUrl}/api/v1/orders/preorders/${biz.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Could not load pre-orders.');
      setOrders(await res.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load pre-orders.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, router]);

  useEffect(() => {
    void load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const grouped = useMemo(() => {
    const map: Record<Group, any[]> = { SCHEDULED: [], COOKING: [], READY: [], SKIPPED: [] };
    for (const o of orders) {
      const s = o.queueToken?.status;
      if (s !== 'WAITING' && s !== 'CALLED') map.SKIPPED.push(o);
      else if (o.status === 'READY') map.READY.push(o);
      else if (o.status === 'PENDING') map.SCHEDULED.push(o);
      else map.COOKING.push(o);
    }
    return map;
  }, [orders]);

  const fireNow = async (orderId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiUrl}/api/v1/orders/${orderId}/fire`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Could not send this to the kitchen.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send this to the kitchen.');
    }
  };

  const cancel = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiUrl}/api/v1/orders/${target.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Could not cancel this pre-order.');
      }
      setTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this pre-order.');
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Manage pre-orders</h1>
            <p className="text-sm text-neutral-500">Food ordered from the queue. The kitchen starts it in time so it is hot when the guest arrives.</p>
          </div>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <ChefHat className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          <p className="font-bold text-neutral-800">No pre-orders on hold</p>
          <p className="mt-1 text-sm text-neutral-500">When a waiting guest orders food, it shows up here until you seat them.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {GROUPS.map(({ key, title, hint, icon: Icon, tone }) => (
            <section key={key} className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-3">
              <header className="mb-3 flex items-start gap-2 px-1">
                <span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-xl border ${TONES[tone]}`}><Icon className="h-4 w-4" /></span>
                <div className="flex-1">
                  <h2 className="text-sm font-extrabold text-neutral-900">{title} <span className="ml-1 text-neutral-400">{grouped[key].length}</span></h2>
                  <p className="text-xs text-neutral-500">{hint}</p>
                </div>
              </header>
              <div className="space-y-3">
                {grouped[key].length === 0 && <p className="rounded-2xl border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400">Nothing here</p>}
                {grouped[key].map((o) => (
                  <article key={o.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-lg bg-neutral-900 px-2 py-0.5 text-xs font-extrabold text-white">#{o.queueToken?.tokenNumber ?? '?'}</span>
                      <span className="flex items-center gap-1 text-xs text-neutral-400"><Clock className="h-3 w-3" />{ago(o.createdAt)}</span>
                    </div>
                    <p className="font-bold text-neutral-900">{o.customerName}</p>
                    {o.customerPhone && <p className="flex items-center gap-1 text-xs text-neutral-500"><Phone className="h-3 w-3" />{o.customerPhone}</p>}
                    <ul className="my-3 space-y-1 border-y border-dashed border-neutral-200 py-3 text-sm text-neutral-700">
                      {o.items?.map((it: any) => (
                        <li key={it.id} className="flex justify-between gap-2">
                          <span>{it.quantity} × {lineName(it.menuItem?.name, it.addons)}</span>
                          <span className="text-neutral-400">{rupees(it.totalPrice)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-neutral-900">{rupees(o.totalAmount)}</span>
                      <div className="flex gap-2">
                        {key === 'SCHEDULED' && (
                          <button onClick={() => void fireNow(o.id)} className="inline-flex items-center gap-1 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600">
                            <Zap className="h-3 w-3" /> Start now
                          </button>
                        )}
                        {(key === 'COOKING' || key === 'READY') && (
                          <Link href="/dashboard/queue" className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-700">Queue</Link>
                        )}
                        {key !== 'READY' && <button onClick={() => setTarget(o)} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">
                          <Trash2 className="h-3 w-3" /> Cancel
                        </button>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={cancel}
        title="Cancel this pre-order?"
        description={`Party #${target?.queueToken?.tokenNumber ?? ''} will not be charged. If cooking already started, tell the kitchen to stop.`}
        confirmLabel="Yes, cancel pre-order"
        cancelLabel="Keep it"
        variant="danger"
        loading={busy}
      />
    </div>
  );
}
