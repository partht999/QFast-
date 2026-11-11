'use client';

import { Component, ReactNode, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';

type Point = { label: string; bucket?: string; joined?: number; served?: number; previousJoined?: number | null; previousServed?: number | null; cancelled?: number; noShow?: number };

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const body = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${body}\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function useMotion() {
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setAllowed(!media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return allowed;
}

class ChartBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{this.props.title} could not be drawn.</p>
          <button type="button" className="mt-2 font-bold underline" onClick={() => this.setState({ failed: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Tip({ active, payload, label, timeZone }: { active?: boolean; payload?: { name: string; value: number; color: string; payload?: Point }[]; label?: string; timeZone: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-xs rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-bold text-gray-950">{label}</p>
      <p className="text-gray-500">{timeZone}</p>
      {payload.map((item) => (
        <p key={item.name} className="mt-1 text-gray-800">
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.name}: {Number(item.value).toLocaleString('en-IN')}
        </p>
      ))}
      {row?.previousJoined != null && row.joined != null && row.previousJoined > 0 && (
        <p className="mt-1 text-gray-500">
          Joins vs previous: {Math.round(((row.joined - row.previousJoined) / row.previousJoined) * 1000) / 10}%
        </p>
      )}
    </div>
  );
}

const COLORS = { joined: '#f97316', served: '#059669', previous: '#9ca3af', cancelled: '#d97706', noShow: '#dc2626', wait: '#ea580c', service: '#0284c7' };

export function TrafficChart({ points, compare, timeZone, onDrillDay }: { points: Point[]; compare: boolean; timeZone: string; onDrillDay: (day: string) => void }) {
  const motion = useMotion();
  const [kind, setKind] = useState<'line' | 'bar' | 'area'>('line');
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const toggle = (entry: { dataKey?: string }) => {
    if (!entry.dataKey) return;
    setHidden((current) => ({ ...current, [entry.dataKey as string]: !current[entry.dataKey as string] }));
  };
  const common = {
    data: points,
    onClick: (state: any) => {
      const bucket = state?.activePayload?.[0]?.payload?.bucket || '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) onDrillDay(bucket);
    },
  };
  const series = (
    <>
      <CartesianGrid stroke="#f3f4f6" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
      <Tooltip content={<Tip timeZone={timeZone} />} />
      <Legend onClick={toggle as never} />
      {kind === 'bar' ? (
        <>
          <Bar dataKey="joined" name="Joined" fill={COLORS.joined} hide={hidden.joined} isAnimationActive={motion} />
          <Bar dataKey="served" name="Served" fill={COLORS.served} hide={hidden.served} isAnimationActive={motion} />
        </>
      ) : kind === 'area' ? (
        <>
          <Area dataKey="joined" name="Joined" stroke={COLORS.joined} fill="#ffedd5" hide={hidden.joined} isAnimationActive={motion} />
          <Area dataKey="served" name="Served" stroke={COLORS.served} fill="#d1fae5" hide={hidden.served} isAnimationActive={motion} />
        </>
      ) : (
        <>
          <Line dataKey="joined" name="Joined" stroke={COLORS.joined} strokeWidth={2} dot={false} hide={hidden.joined} isAnimationActive={motion} />
          <Line dataKey="served" name="Served" stroke={COLORS.served} strokeWidth={2} dot={false} hide={hidden.served} isAnimationActive={motion} />
        </>
      )}
      {compare && <Line dataKey="previousJoined" name="Joined, previous period" stroke={COLORS.previous} strokeDasharray="4 4" dot={false} hide={hidden.previousJoined} isAnimationActive={motion} />}
    </>
  );
  const Frame = kind === 'bar' ? BarChart : kind === 'area' ? AreaChart : LineChart;
  return (
    <ChartBoundary title="Customer traffic">
      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-label="Customer traffic, joined and served">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-gray-950">Customer traffic</h2>
          <div className="flex gap-2">
            {(['line', 'bar', 'area'] as const).map((option) => (
              <button key={option} type="button" onClick={() => setKind(option)} className={`min-h-11 rounded-lg px-3 text-xs font-bold capitalize ${kind === option ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>{option}</button>
            ))}
            <button type="button" className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-bold" onClick={() => downloadCsv('traffic.csv', ['Period', 'Joined', 'Served', 'Previous joined', 'Previous served'], points.map((point) => [point.label, point.joined, point.served, point.previousJoined, point.previousServed]))}>
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <Frame {...common}>{series}</Frame>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-gray-500">Click a day to see that day by hour.</p>
      </section>
    </ChartBoundary>
  );
}

export function QueueCharts({ byHour, outcomes, abandonmentReason, timeZone }: { byHour: { label: string; avgWaitSeconds: number | null; avgServiceSeconds: number | null; cancelled: number; noShow: number; joined: number }[]; outcomes: Point[]; abandonmentReason: string; timeZone: string }) {
  const motion = useMotion();
  const hours = byHour.map((hour) => ({ ...hour, waitMin: hour.avgWaitSeconds == null ? null : Math.round(hour.avgWaitSeconds / 60), serviceMin: hour.avgServiceSeconds == null ? null : Math.round(hour.avgServiceSeconds / 60) }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartBoundary title="Queue performance">
        <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-label="Average waiting and service time by hour">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-gray-950">Waiting and service by hour</h2>
            <button type="button" className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-bold" onClick={() => downloadCsv('queue-hours.csv', ['Hour', 'Joined', 'Avg wait seconds', 'Avg service seconds'], byHour.map((hour) => [hour.label, hour.joined, hour.avgWaitSeconds, hour.avgServiceSeconds]))}>
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={hours}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} width={32} />
                <Tooltip content={<Tip timeZone={timeZone} />} />
                <Legend />
                <Bar dataKey="waitMin" name="Avg wait, minutes" fill={COLORS.wait} isAnimationActive={motion} />
                <Line dataKey="serviceMin" name="Avg service, minutes" stroke={COLORS.service} strokeWidth={2} dot={false} isAnimationActive={motion} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </ChartBoundary>
      <ChartBoundary title="Cancellations and no-shows">
        <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-label="Cancellations and no-shows over time">
          <h2 className="text-sm font-black text-gray-950">Cancellations and no-shows</h2>
          <p className="mt-1 text-xs text-gray-500">{abandonmentReason}</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <BarChart data={outcomes}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip content={<Tip timeZone={timeZone} />} />
                <Legend />
                <Bar dataKey="cancelled" name="Cancelled" fill={COLORS.cancelled} isAnimationActive={motion} />
                <Bar dataKey="noShow" name="No-show" fill={COLORS.noShow} isAnimationActive={motion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </ChartBoundary>
    </div>
  );
}

export function Heatmap({ cells, onSelect }: { cells: { dow: number; hour: number; label: string; joined: number; cancelled: number; avgWaitSeconds: number | null; cancellationRate: number | null }[]; onSelect: (cell: { label: string; joined: number; avgWaitSeconds: number | null; cancellationRate: number | null }) => void }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const max = Math.max(...cells.map((cell) => cell.joined), 1);
  const [selected, setSelected] = useState<(typeof cells)[number] | null>(null);
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-label="Peak hours heatmap">
      <h2 className="text-sm font-black text-gray-950">Peak hours</h2>
      <p className="mt-1 text-xs text-gray-500">Each square is guests who joined. Darker orange is busier. Empty squares had no joins.</p>
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-1 text-[10px] text-gray-500">
            <span />
            {Array.from({ length: 24 }, (_, hour) => <span key={hour} className="text-center">{hour}</span>)}
            {days.map((day, dow) => (
              <div key={day} className="contents">
                <span className="self-center font-bold text-gray-700">{day}</span>
                {cells.filter((cell) => cell.dow === dow).sort((a, b) => a.hour - b.hour).map((cell) => {
                  const strength = cell.joined / max;
                  return (
                    <button
                      key={`${cell.dow}-${cell.hour}`}
                      type="button"
                      aria-label={`${cell.label}, ${cell.joined} joined`}
                      onClick={() => {
                        setSelected(cell);
                        onSelect(cell);
                      }}
                      className="aspect-square rounded"
                      style={{ background: strength === 0 ? '#f3f4f6' : `rgba(234, 88, 12, ${0.18 + strength * 0.82})` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected && (
        <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-800">
          <p className="font-bold">{selected.label}</p>
          <p>{selected.joined.toLocaleString('en-IN')} joined</p>
          <p>Average wait: {selected.avgWaitSeconds == null ? 'Not available' : `${Math.round(selected.avgWaitSeconds / 60)} min`}</p>
          <p>Cancellations: {selected.cancellationRate == null ? 'Not available' : `${selected.cancellationRate}%`}</p>
          <p>Abandonment: Not available</p>
        </div>
      )}
    </section>
  );
}

export function OutcomeDonut({ slices }: { slices: { name: string; value: number; color: string }[] }) {
  const motion = useMotion();
  const shown = slices.filter((slice) => slice.value > 0);
  if (!shown.length) return <p className="text-sm text-gray-500">No completed, cancelled, or no-show visits in this period.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={shown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} isAnimationActive={motion} label={({ name, value }) => `${name} ${value}`}>
            {shown.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
