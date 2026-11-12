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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
type Point = { label: string; bucket?: string; joined?: number; served?: number; previousJoined?: number | null; previousServed?: number | null; cancelled?: number; noShow?: number; revenue?: number };

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
  return (
    <ChartBoundary title="Customer traffic">
      <section className="ui-card p-4 sm:p-5" aria-label="Customer traffic, joined and served">
        <h2 className="text-base font-semibold text-neutral-950">Who joined and who was served</h2>
        <p className="mt-1 text-sm text-neutral-500">Click a day to open that day by hour.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <AreaChart
              data={points}
              onClick={(state: any) => {
                const bucket = state?.activePayload?.[0]?.payload?.bucket || '';
                if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) onDrillDay(bucket);
              }}
            >
              <CartesianGrid stroke="#f5f5f4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} width={36} />
              <Tooltip content={<Tip timeZone={timeZone} />} />
              <Legend />
              <Area dataKey="joined" name="Joined" stroke={COLORS.joined} fill="#ffedd5" isAnimationActive={motion} />
              <Area dataKey="served" name="Served" stroke={COLORS.served} fill="#d1fae5" isAnimationActive={motion} />
              {compare && <Line dataKey="previousJoined" name="Joined last period" stroke={COLORS.previous} strokeDasharray="4 4" dot={false} isAnimationActive={motion} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </ChartBoundary>
  );
}

export function SalesChart({ points }: { points: { label: string; revenue: number; placed: number }[] }) {
  const motion = useMotion();
  if (!points.length) return null;
  return (
    <ChartBoundary title="Closed bills">
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={points}>
            <CartesianGrid stroke="#f5f5f4" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#78716c' }} width={48} />
            <Tooltip />
            <Bar dataKey="revenue" name="Closed bills, ₹" fill={COLORS.joined} radius={[6, 6, 0, 0]} isAnimationActive={motion} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartBoundary>
  );
}

export function QueueCharts({ byHour, outcomes, abandonmentReason, timeZone }: { byHour: { label: string; avgWaitSeconds: number | null; avgServiceSeconds: number | null; cancelled: number; noShow: number; joined: number }[]; outcomes: Point[]; abandonmentReason: string; timeZone: string }) {
  const motion = useMotion();
  const hours = byHour.map((hour) => ({ ...hour, waitMin: hour.avgWaitSeconds == null ? null : Math.round(hour.avgWaitSeconds / 60), serviceMin: hour.avgServiceSeconds == null ? null : Math.round(hour.avgServiceSeconds / 60) }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartBoundary title="Queue performance">
        <section className="ui-card p-4 sm:p-5" aria-label="Average waiting and service time by hour">
          <h2 className="text-base font-semibold text-neutral-950">Wait and service by hour</h2>
          <p className="mt-1 text-sm text-neutral-500">Average minutes, only for visits that were seated.</p>
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
        <section className="ui-card p-4 sm:p-5" aria-label="Cancellations and no-shows over time">
          <h2 className="text-base font-semibold text-neutral-950">Cancellations and no-shows</h2>
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
    <section className="ui-card p-4 sm:p-5" aria-label="Peak hours heatmap">
      <h2 className="text-base font-semibold text-neutral-950">When people join</h2>
      <p className="mt-1 text-sm text-neutral-500">Darker squares are busier hours. Select one to see the wait.</p>
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
        <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800">
          <p className="font-semibold text-neutral-950">{selected.label}</p>
          <p>{selected.joined.toLocaleString('en-IN')} joined</p>
          <p>Average wait: {selected.avgWaitSeconds == null ? 'No seated visits' : `${Math.round(selected.avgWaitSeconds / 60)} min`}</p>
          <p>Cancellations: {selected.cancellationRate == null ? 'None' : `${selected.cancellationRate}%`}</p>
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
          <Pie data={shown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} isAnimationActive={motion}>
            {shown.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
