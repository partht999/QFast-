'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Info, Users } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { readApiError } from '@/lib/read-api-error';
import { Heatmap, OutcomeDonut, QueueCharts, SalesChart, TrafficChart } from './charts';

type Kpi = {
  key: string;
  label: string;
  value: number | null;
  text: string | null;
  previous: number | null;
  changePercent: number | null;
  unit: 'count' | 'duration' | 'percent' | 'rate' | 'text';
  goodWhen: 'up' | 'down';
  sparkline: { label: string; value: number }[];
  unavailableReason: string | null;
};

type Report = {
  meta: {
    timeZone: string;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    groupBy: 'hour' | 'day' | 'week' | 'month';
    definitions: Record<string, string>;
    branches: { id: string; name: string }[];
    serviceTypes: string[];
    businessType?: string;
    excludedDurations: number;
  };
  kpis: Kpi[];
  traffic: { bucket: string; label: string; joined: number; served: number; previousJoined: number | null; previousServed: number | null }[];
  queuePerformance: {
    byHour: { label: string; hour: number; joined: number; avgWaitSeconds: number | null; avgServiceSeconds: number | null; cancelled: number; noShow: number }[];
    abandonmentReason: string;
    outcomes: { label: string; bucket: string; cancelled: number; noShow: number }[];
  };
  peakHours: {
    cells: { dow: number; hour: number; label: string; joined: number; cancelled: number; avgWaitSeconds: number | null; cancellationRate: number | null }[];
    topHours: { label: string; joined: number }[];
    topDays: { name: string; joined: number }[];
  };
  behaviour: { remote: number; physical: number; newCustomers: number; returning: number; cancelled: number; noShow: number; abandoned: null; avgPartySize: number | null };
  performance: { completed: number; cancelled: number; abandoned: null; noShow: number; skipped: number; inProgress: number; avgPerActiveDay: number | null; busiestDays: { name: string; joined: number }[]; dayOverDay: { current: number; previous: number; changePercent: number | null; currentLabel: string; previousLabel: string } | null; monthOverMonth: { current: number; previous: number; changePercent: number | null } | null };
  insights: { id: string; severity: 'positive' | 'neutral' | 'warning'; message: string }[];
  counts: { current: { joined: number } };
  orders?: {
    placed: number;
    completed: number;
    cancelled: number;
    revenue: number;
    averageBill: number | null;
    previousPlaced: number;
    previousRevenue: number;
    bySource: { source: string; label: string; placed: number; revenue: number }[];
    byDay: { bucket: string; placed: number; revenue: number }[];
  };
};

const PRESETS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['month', 'This month'],
  ['last-month', 'Last month'],
  ['custom', 'Custom'],
] as const;

function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function rangeFor(preset: string, today: string) {
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'yesterday') return { from: addDays(today, -1), to: addDays(today, -1) };
  if (preset === '30d') return { from: addDays(today, -29), to: today };
  if (preset === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (preset === 'last-month') {
    const [year, month] = today.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
    return { from: start, to: end };
  }
  return { from: addDays(today, -6), to: today };
}

function inclusiveDays(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return 'Not available';
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours} h ${minutes} min`;
  if (minutes) return secs ? `${minutes} min ${secs} s` : `${minutes} min`;
  return `${secs} s`;
}

function formatValue(kpi: Kpi) {
  if (kpi.unit === 'text') return kpi.text || 'Not available';
  if (kpi.value == null) return 'Not available';
  if (kpi.unit === 'duration') return formatDuration(kpi.value);
  if (kpi.unit === 'percent') return `${kpi.value.toLocaleString('en-IN')}%`;
  if (kpi.unit === 'rate') return kpi.value.toLocaleString('en-IN', { maximumFractionDigits: 1 });
  return kpi.value.toLocaleString('en-IN');
}

function formatChange(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('en-IN')}% vs previous`;
}

function rupees(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return '';
  return formatChange(((current - previous) / previous) * 100);
}

function Sparkline({ points }: { points: { value: number }[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((point) => point.value), 1);
  const width = 88;
  const height = 28;
  const path = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - (point.value / max) * (height - 2) - 1;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return <svg width={width} height={height} aria-hidden="true" className="text-orange-500"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

const HINTS: Record<string, string> = {
  served: 'Guests whose queue visit was marked completed in this period.',
  joined: 'Everyone who joined the queue in this period.',
  wait: 'Average time from joining until the guest was seated. Visits that were never seated are left out.',
  service: 'Average time from being seated until the visit was completed.',
  abandonment: 'Not available. Cancellations are counted on their own. Abandoned visits are not recorded.',
  servedPerHour: 'Completed visits divided by the hours between the first and last completion each day.',
  peak: 'The hour of the day, in your restaurant timezone, when the most guests joined.',
  daily: 'Completed visits divided by days in this range that had at least one join.',
};

export default function AnalyticsView() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const apiUrl = getApiUrl();
  const [timeZone, setTimeZone] = useState('Asia/Kolkata');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const preset = search.get('preset') || '7d';
  const requestedGroup = search.get('groupBy') as Report['meta']['groupBy'] | null;
  const compare = search.get('compare') !== '0';
  const branchId = search.get('branch') || '';
  const serviceType = search.get('service') || '';
  const today = todayIn(timeZone);
  const customFrom = search.get('from') || '';
  const customTo = search.get('to') || '';
  const range = preset === 'custom' && customFrom && customTo ? { from: customFrom, to: customTo } : rangeFor(preset, today);
  const days = inclusiveDays(range.from, range.to);
  const hourDisabled = days > 7;
  const suggestedGroup: Report['meta']['groupBy'] = days <= 2 ? 'hour' : days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';
  const groupBy: Report['meta']['groupBy'] = requestedGroup === 'hour' && hourDisabled ? 'day' : (requestedGroup || suggestedGroup);

  const write = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const query = useMemo(() => {
    const params = new URLSearchParams({ from: range.from, to: range.to, groupBy: hourDisabled && groupBy === 'hour' ? 'day' : groupBy });
    if (branchId) params.set('branchId', branchId);
    if (serviceType) params.set('serviceType', serviceType);
    return params.toString();
  }, [range.from, range.to, groupBy, hourDisabled, branchId, serviceType]);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    if (range.from > range.to || days > 366 || days < 1) {
      setError('Choose a start date on or before the end date, within 366 days.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    fetch(`${apiUrl}/api/v1/analytics?${query}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace('/auth/login');
          return null;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(readApiError(data, 'Could not load analytics'));
        return data as Report;
      })
      .then((data) => {
        if (!data) return;
        setReport(data);
        if (data.meta.timeZone && data.meta.timeZone !== timeZone) setTimeZone(data.meta.timeZone);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Could not load analytics');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [apiUrl, query, reloadKey, router, timeZone]);

  const download = async (format: 'csv' | 'pdf') => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${apiUrl}/api/v1/analytics/export?${query}&format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      setError('Could not download the report.');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qfast-analytics.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const visibleKpis = (report?.kpis || []).filter((kpi) => !['abandonment', 'servedPerHour'].includes(kpi.key));
  const food = report?.meta.businessType === 'RESTAURANT' || report?.meta.businessType === 'CAFE';
  const orders = report?.orders;
  const completion = report && report.counts.current.joined > 0
    ? Math.round((report.performance.completed / report.counts.current.joined) * 1000) / 10
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="ui-title">Analytics</h1>
          <p className="ui-copy">How the queue moved, and what the closed bills added up to.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void download('csv')} className="ui-btn-secondary"><Download className="h-4 w-4" /> CSV</button>
          <button type="button" onClick={() => void download('pdf')} className="ui-btn-secondary"><Download className="h-4 w-4" /> PDF</button>
        </div>
      </div>
      <div className="ui-card space-y-3 p-3 sm:p-4">
        <div className="flex gap-2 overflow-x-auto">
          {PRESETS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => {
              const next = id === 'custom' ? range : rangeFor(id, today);
              const span = inclusiveDays(next.from, next.to);
              const nextGroup = span <= 2 ? 'hour' : span <= 31 ? 'day' : span <= 120 ? 'week' : 'month';
              write({ preset: id, from: null, to: null, groupBy: id === 'custom' ? null : nextGroup });
            }} className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold ${preset === id ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700'}`}>{label}</button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap gap-3">
            <label className="ui-label">From
              <input type="date" value={customFrom || range.from} max={customTo || range.to} onChange={(event) => write({ preset: 'custom', from: event.target.value, to: customTo || range.to })} className="ui-field mt-1.5" />
            </label>
            <label className="ui-label">To
              <input type="date" value={customTo || range.to} min={customFrom || range.from} onChange={(event) => write({ preset: 'custom', from: customFrom || range.from, to: event.target.value })} className="ui-field mt-1.5" />
            </label>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {(['hour', 'day', 'week', 'month'] as const).map((option) => (
            <button key={option} type="button" disabled={option === 'hour' && hourDisabled} onClick={() => write({ groupBy: option })} className={`min-h-11 rounded-xl px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${groupBy === option ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-900'}`}>{option === 'hour' ? 'Hourly' : option === 'day' ? 'Daily' : option === 'week' ? 'Weekly' : 'Monthly'}</button>
          ))}
          <button type="button" aria-pressed={compare} onClick={() => write({ compare: compare ? '0' : '1' })} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${compare ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700'}`}>Compare previous</button>
          {!!report?.meta.branches.length && (
            <select aria-label="Branch" value={branchId} onChange={(event) => write({ branch: event.target.value || null })} className="ui-field w-auto min-w-[10rem]">
              <option value="">All branches</option>
              {report.meta.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          )}
          {!!report?.meta.serviceTypes.length && (
            <select aria-label="Service" value={serviceType} onChange={(event) => write({ service: event.target.value || null })} className="ui-field w-auto min-w-[10rem]">
              <option value="">All services</option>
              {report.meta.serviceTypes.map((service) => <option key={service} value={service}>{service}</option>)}
            </select>
          )}
        </div>
        {report && <p className="text-xs text-neutral-500">{report.meta.from} to {report.meta.to} · previous period {report.meta.previousFrom} to {report.meta.previousTo} · {report.meta.timeZone}</p>}
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <button type="button" className="mt-2 font-bold underline" onClick={() => setReloadKey((value) => value + 1)}>Retry</button>
        </div>
      )}

      {loading && !report && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading analytics">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-gray-200" />)}
        </div>
      )}

      {report && (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {report.insights.length > 0 && (
            <section className="ui-card p-4 sm:p-5" aria-label="What stands out">
              <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-950"><Users className="h-4 w-4 text-brand-700" /> What stands out</h2>
              <ul className="mt-3 space-y-2">
                {report.insights.map((insight) => (
                  <li key={insight.id} className={`rounded-xl px-3 py-2 text-sm ${insight.severity === 'warning' ? 'bg-amber-50 text-amber-950' : insight.severity === 'positive' ? 'bg-emerald-50 text-emerald-950' : 'bg-neutral-50 text-neutral-800'}`}>
                    {insight.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.counts.current.joined === 0 && (
            <p className="ui-card border-dashed p-4 text-sm text-neutral-600">No guests joined in this period. The charts fill in from visits once people take a number.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="ui-card p-4">
              <h2 className="text-sm font-semibold text-neutral-500">Finished visits</h2>
              <p className="mt-2 text-2xl font-semibold text-neutral-950">{completion == null ? '—' : `${completion}%`}</p>
              <p className="mt-1 text-xs text-neutral-500">{report.performance.completed.toLocaleString('en-IN')} served of {report.counts.current.joined.toLocaleString('en-IN')} who joined</p>
            </article>
            {visibleKpis.map((kpi) => {
              const change = formatChange(kpi.changePercent);
              const improved = kpi.changePercent != null && kpi.changePercent !== 0 && (kpi.goodWhen === 'up' ? kpi.changePercent > 0 : kpi.changePercent < 0);
              const worse = kpi.changePercent != null && kpi.changePercent !== 0 && !improved;
              return (
                <article key={kpi.key} className="ui-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-neutral-500">{kpi.label}</h2>
                    <button type="button" className="text-neutral-400" aria-label={HINTS[kpi.key] || kpi.label} title={HINTS[kpi.key]}><Info className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-neutral-950">{formatValue(kpi)}</p>
                  {change && <p className={`mt-1 text-xs font-semibold ${improved ? 'text-emerald-700' : worse ? 'text-red-700' : 'text-neutral-500'}`}>{change}</p>}
                  {kpi.unavailableReason && <p className="mt-1 text-xs text-neutral-500">{kpi.unavailableReason}</p>}
                  <div className="mt-2"><Sparkline points={kpi.sparkline} /></div>
                </article>
              );
            })}
          </div>

          {(food || (orders && orders.placed > 0)) && orders && (
            <section className="ui-card p-4 sm:p-5">
              <h2 className="text-base font-semibold text-neutral-950">Bills</h2>
              <p className="mt-1 text-sm text-neutral-500">Orders placed in this period. Closed-bill totals count only orders that were completed.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <p className="text-sm text-neutral-500">Orders</p>
                  <p className="mt-1 text-xl font-semibold">{orders.placed.toLocaleString('en-IN')}</p>
                  {percentChange(orders.placed, orders.previousPlaced) && <p className="text-xs text-neutral-500">{percentChange(orders.placed, orders.previousPlaced)}</p>}
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Closed</p>
                  <p className="mt-1 text-xl font-semibold">{orders.completed.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Cancelled</p>
                  <p className="mt-1 text-xl font-semibold">{orders.cancelled.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Closed-bill total</p>
                  <p className="mt-1 text-xl font-semibold">{rupees(orders.revenue)}</p>
                  {percentChange(orders.revenue, orders.previousRevenue) && <p className="text-xs text-neutral-500">{percentChange(orders.revenue, orders.previousRevenue)}</p>}
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Average closed bill</p>
                  <p className="mt-1 text-xl font-semibold">{orders.averageBill == null ? '—' : rupees(orders.averageBill)}</p>
                </div>
              </div>
              {orders.bySource.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {orders.bySource.map((source) => (
                    <li key={source.source} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                      {source.label}: {source.placed.toLocaleString('en-IN')} · {rupees(source.revenue)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <SalesChart points={orders.byDay.map((day) => ({ label: day.bucket.slice(5), revenue: day.revenue, placed: day.placed }))} />
              </div>
            </section>
          )}

          <TrafficChart points={report.traffic} compare={compare} timeZone={report.meta.timeZone} onDrillDay={(day) => write({ preset: 'custom', from: day, to: day, groupBy: 'hour' })} />
          <QueueCharts byHour={report.queuePerformance.byHour} outcomes={report.queuePerformance.outcomes} abandonmentReason="Cancellations and no-shows are counted separately. A visit left the line only when staff cancelled it or marked a no-show." timeZone={report.meta.timeZone} />
          <Heatmap cells={report.peakHours.cells} onSelect={() => undefined} />

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="ui-card p-4 sm:p-5">
              <h2 className="text-base font-semibold text-neutral-950">How guests arrived</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ['From their phone', report.behaviour.remote],
                  ['At the counter', report.behaviour.physical],
                  ['New guests', report.behaviour.newCustomers],
                  ['Returning', report.behaviour.returning],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-neutral-50 px-3 py-3">
                    <dt className="text-neutral-500">{label}</dt>
                    <dd className="mt-1 text-lg font-semibold text-neutral-950">{Number(value).toLocaleString('en-IN')}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-neutral-600">Average group size: {report.behaviour.avgPartySize ?? 'not enough visits'}</p>
            </section>
            <section className="ui-card p-4 sm:p-5">
              <h2 className="text-base font-semibold text-neutral-950">How visits ended</h2>
              <OutcomeDonut slices={[
                { name: 'Served', value: report.performance.completed, color: '#059669' },
                { name: 'Cancelled', value: report.performance.cancelled, color: '#d97706' },
                { name: 'No-show', value: report.performance.noShow, color: '#dc2626' },
                { name: 'Skipped', value: report.performance.skipped, color: '#78716c' },
                { name: 'Still waiting', value: report.performance.inProgress, color: '#ea580c' },
              ]} />
              <p className="text-sm text-neutral-600">Busiest days: {report.performance.busiestDays.map((day) => `${day.name} (${day.joined})`).join(', ') || 'none yet'}</p>
              <p className="mt-1 text-sm text-neutral-600">Served per active day: {report.performance.avgPerActiveDay ?? '—'}</p>
              {report.performance.dayOverDay && (
                <p className="mt-1 text-sm text-neutral-600">{report.performance.dayOverDay.currentLabel} served {report.performance.dayOverDay.current.toLocaleString('en-IN')} · {report.performance.dayOverDay.previousLabel} served {report.performance.dayOverDay.previous.toLocaleString('en-IN')}</p>
              )}
            </section>
          </div>

          <details className="ui-card p-4 text-sm text-neutral-600">
            <summary className="cursor-pointer font-semibold text-neutral-950">How these numbers are counted</summary>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Joined, served, wait, and no-show come from queue visits.</li>
              <li>Closed-bill totals come from orders placed in the same dates that were later completed.</li>
              <li>A service filter applies to the queue. Bills stay for the whole restaurant, or the selected branch.</li>
              {Object.values(report.meta.definitions).map((line) => <li key={line}>{line}</li>)}
              {report.meta.excludedDurations > 0 && <li>{report.meta.excludedDurations.toLocaleString('en-IN')} visit times were left out because they were negative or longer than 12 hours.</li>}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
