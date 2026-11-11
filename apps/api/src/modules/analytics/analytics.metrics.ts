/**
 * Queue analytics definitions. Every number is computed from QueueToken rows.
 *
 * Joined: tokens created in the period. There is no test, invalid, or duplicate flag, so every token counts.
 * Served / completed: status COMPLETED.
 * Waiting time: seatedAt − createdAt. There is no serviceStartedAt column; seating is when service starts.
 *   Rows missing seatedAt, or with a negative or over-12-hour gap, are excluded.
 * Service time: completedAt − seatedAt, with the same exclusion rule.
 * Cancelled: status CANCELLED. This is separate from no-shows.
 * Abandoned: not stored. Qfast has no abandoned status. SKIPPED is a staff skip, not an abandonment.
 *   Abandonment rate is therefore not available. Cancellation rate is returned separately.
 * No-show: status NO_SHOW (marked when the guest misses the queue's arrivalGraceMinutes window).
 * Completion rate: completed ÷ joined.
 * Avg served per hour: completed ÷ operating hours. Operating hours are the span from the first to the
 *   last completedAt on each local day in the cohort, with a minimum of 1 hour on a day that had a completion.
 * Avg daily customers: completed ÷ local days in the range that had at least one join.
 * Peak hours: hour-of-day with the most joins, in the restaurant timezone.
 */

export const MAX_DURATION_SECONDS = 12 * 60 * 60;
export const MAX_RANGE_DAYS = 366;

export type GroupBy = 'hour' | 'day' | 'week' | 'month';

export type PeriodCounts = {
  joined: number;
  completed: number;
  cancelled: number;
  noShow: number;
  skipped: number;
  remote: number;
  walkIn: number;
  newCustomers: number;
  returning: number;
  partySizeSum: number;
  partySizeCount: number;
  waitSamples: number;
  waitSeconds: number;
  serviceSamples: number;
  serviceSeconds: number;
  excludedDurations: number;
};

export type SeriesRow = {
  bucket: string;
  joined: number;
  completed: number;
  cancelled: number;
  noShow: number;
  waitSamples: number;
  waitSeconds: number;
  serviceSamples: number;
  serviceSeconds: number;
};

export type HeatCell = {
  dow: number;
  hour: number;
  joined: number;
  cancelled: number;
  noShow: number;
  waitSamples: number;
  waitSeconds: number;
  serviceSamples: number;
  serviceSeconds: number;
};

export type OperatingDay = {
  day: string;
  firstEpoch: number;
  lastEpoch: number;
  served: number;
};

export function emptyCounts(): PeriodCounts {
  return {
    joined: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    skipped: 0,
    remote: 0,
    walkIn: 0,
    newCustomers: 0,
    returning: 0,
    partySizeSum: 0,
    partySizeCount: 0,
    waitSamples: 0,
    waitSeconds: 0,
    serviceSamples: 0,
    serviceSeconds: 0,
    excludedDurations: 0,
  };
}

export function changePercent(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  const value = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

export function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  const value = (part / whole) * 100;
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

export function average(sum: number, samples: number): number | null {
  if (samples <= 0) return null;
  const value = sum / samples;
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function addCalendarDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function inclusiveDays(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function localDate(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

export function timeZoneOffsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const hour = read('hour') === 24 ? 0 : read('hour');
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), hour, read('minute'), read('second'));
  return asUtc - instant.getTime();
}

/** UTC instant of local midnight on isoDate. DST-safe for the tested zones. */
export function zonedStartUtc(isoDate: string, timeZone: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  let offset = timeZoneOffsetMs(utcMidnight, timeZone);
  let result = new Date(utcMidnight.getTime() - offset);
  offset = timeZoneOffsetMs(result, timeZone);
  result = new Date(utcMidnight.getTime() - offset);
  return result;
}

export function safeTimeZone(value: string | null | undefined) {
  const candidate = value?.trim() || 'Asia/Kolkata';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return 'Asia/Kolkata';
  }
}

export function resolveRange(input: { from?: string; to?: string; timeZone: string; now?: Date }) {
  const timeZone = safeTimeZone(input.timeZone);
  const today = localDate(input.now ?? new Date(), timeZone);
  const from = input.from || addCalendarDays(today, -6);
  const to = input.to || today;
  if (!isIsoDate(from) || !isIsoDate(to)) {
    throw new Error('Use dates as YYYY-MM-DD.');
  }
  if (from > to) throw new Error('The start date must be on or before the end date.');
  const days = inclusiveDays(from, to);
  if (days > MAX_RANGE_DAYS) throw new Error(`Choose a range of ${MAX_RANGE_DAYS} days or fewer.`);
  const currentFrom = zonedStartUtc(from, timeZone);
  const currentTo = zonedStartUtc(addCalendarDays(to, 1), timeZone);
  const previousFromDate = addCalendarDays(from, -days);
  const previousToDate = addCalendarDays(from, -1);
  return {
    timeZone,
    from,
    to,
    days,
    currentFrom,
    currentTo,
    previousFrom: zonedStartUtc(previousFromDate, timeZone),
    previousTo: currentFrom,
    previousFromDate,
    previousToDate,
  };
}

export function defaultGroupBy(from: string, to: string): GroupBy {
  const days = inclusiveDays(from, to);
  if (days <= 2) return 'hour';
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

export function resolveGroupBy(requested: string | undefined, from: string, to: string): GroupBy {
  const fallback = defaultGroupBy(from, to);
  if (requested !== 'hour' && requested !== 'day' && requested !== 'week' && requested !== 'month') return fallback;
  if (requested === 'hour' && inclusiveDays(from, to) > 7) return 'day';
  return requested;
}

export function mondayOf(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function bucketKeys(from: string, to: string, groupBy: GroupBy) {
  if (groupBy === 'hour') {
    const keys: string[] = [];
    let cursor = from;
    while (cursor <= to) {
      for (let hour = 0; hour < 24; hour += 1) keys.push(`${cursor}T${String(hour).padStart(2, '0')}`);
      cursor = addCalendarDays(cursor, 1);
    }
    return keys;
  }
  if (groupBy === 'day') {
    const keys: string[] = [];
    let cursor = from;
    while (cursor <= to) {
      keys.push(cursor);
      cursor = addCalendarDays(cursor, 1);
    }
    return keys;
  }
  if (groupBy === 'week') {
    const keys: string[] = [];
    let cursor = mondayOf(from);
    const last = mondayOf(to);
    while (cursor <= last) {
      keys.push(cursor);
      cursor = addCalendarDays(cursor, 7);
    }
    return keys;
  }
  const keys: string[] = [];
  let cursor = from.slice(0, 7);
  const last = to.slice(0, 7);
  while (cursor <= last) {
    keys.push(cursor);
    const [year, month] = cursor.split('-').map(Number);
    const next = new Date(Date.UTC(year, month, 1));
    cursor = next.toISOString().slice(0, 7);
  }
  return keys;
}

export function zeroFill(rows: SeriesRow[], from: string, to: string, groupBy: GroupBy): SeriesRow[] {
  const byKey = new Map(rows.map((row) => [row.bucket, row]));
  return bucketKeys(from, to, groupBy).map((bucket) => byKey.get(bucket) || emptySeries(bucket));
}

export function emptySeries(bucket: string): SeriesRow {
  return {
    bucket,
    joined: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    waitSamples: 0,
    waitSeconds: 0,
    serviceSamples: 0,
    serviceSeconds: 0,
  };
}

export function operatingHours(days: OperatingDay[]) {
  if (!days.length) return null;
  return days.reduce((sum, day) => {
    const span = Math.max(0, (day.lastEpoch - day.firstEpoch) / 3600);
    return sum + Math.max(1, span);
  }, 0);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function hourLabel(hour: number) {
  const clock = (value: number) => ({ hour: value % 12 || 12, suffix: value < 12 ? 'AM' : 'PM' });
  const start = clock(hour);
  const end = clock((hour + 1) % 24);
  if (start.suffix === end.suffix) return `${start.hour}–${end.hour} ${start.suffix}`;
  return `${start.hour} ${start.suffix}–${end.hour} ${end.suffix}`;
}

export function formatBucket(bucket: string, groupBy: GroupBy) {
  if (groupBy === 'month') {
    const [year, month] = bucket.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  if (groupBy === 'hour') {
    const [date, hourText] = bucket.split('T');
    const hour = Number(hourText);
    return `${formatBucket(date, 'day')}, ${hourLabel(hour)}`;
  }
  const [year, month, day] = bucket.split('-').map(Number);
  const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return groupBy === 'week' ? `Week of ${label}` : label;
}

export function weekdayOf(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export type BuiltReport = ReturnType<typeof buildReport>;

export function buildReport(input: {
  timeZone: string;
  from: string;
  to: string;
  previousFromDate: string;
  previousToDate: string;
  groupBy: GroupBy;
  branchId: string | null;
  serviceType: string | null;
  current: PeriodCounts;
  previous: PeriodCounts;
  currentSeries: SeriesRow[];
  previousSeries: SeriesRow[];
  dailyCurrent: SeriesRow[];
  dailyPrevious?: SeriesRow[];
  heatmap: HeatCell[];
  previousHeatmap?: HeatCell[];
  operatingDays: OperatingDay[];
  previousOperatingDays?: OperatingDay[];
  branches: { id: string; name: string }[];
  serviceTypes: string[];
  fullMonth: boolean;
}) {
  const currentSeries = zeroFill(input.currentSeries, input.from, input.to, input.groupBy);
  const previousSeries = zeroFill(input.previousSeries, input.previousFromDate, input.previousToDate, input.groupBy);
  const daily = zeroFill(input.dailyCurrent, input.from, input.to, 'day');
  const hours = operatingHours(input.operatingDays);
  const activeDays = daily.filter((day) => day.joined > 0).length;
  const wait = average(input.current.waitSeconds, input.current.waitSamples);
  const previousWait = average(input.previous.waitSeconds, input.previous.waitSamples);
  const service = average(input.current.serviceSeconds, input.current.serviceSamples);
  const previousService = average(input.previous.serviceSeconds, input.previous.serviceSamples);
  const servedPerHour = hours && hours > 0 ? Math.round((input.current.completed / hours) * 10) / 10 : null;
  const previousHourSpan = operatingHours(input.previousOperatingDays || []);
  const previousServedPerHour = previousHourSpan && previousHourSpan > 0 ? Math.round((input.previous.completed / previousHourSpan) * 10) / 10 : null;
  const avgDaily = activeDays > 0 ? Math.round((input.current.completed / activeDays) * 10) / 10 : null;
  const previousActiveDays = (input.dailyPrevious || []).filter((day) => day.joined > 0).length;
  const previousAvgDaily = previousActiveDays > 0 ? Math.round((input.previous.completed / previousActiveDays) * 10) / 10 : null;

  const hourTotals = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    joined: 0,
    cancelled: 0,
    noShow: 0,
    waitSamples: 0,
    waitSeconds: 0,
    serviceSamples: 0,
    serviceSeconds: 0,
  }));
  const cells = Array.from({ length: 7 }, (_, dow) =>
    Array.from({ length: 24 }, (_, hour) => ({
      dow,
      hour,
      label: `${WEEKDAYS[dow]} ${hourLabel(hour)}`,
      joined: 0,
      cancelled: 0,
      noShow: 0,
      avgWaitSeconds: null as number | null,
      cancellationRate: null as number | null,
    })),
  );
  for (const cell of input.heatmap) {
    if (cell.dow < 0 || cell.dow > 6 || cell.hour < 0 || cell.hour > 23) continue;
    const target = cells[cell.dow][cell.hour];
    target.joined += cell.joined;
    target.cancelled += cell.cancelled;
    target.noShow += cell.noShow;
    target.avgWaitSeconds = average(cell.waitSeconds, cell.waitSamples);
    target.cancellationRate = rate(cell.cancelled, cell.joined);
    const hour = hourTotals[cell.hour];
    hour.joined += cell.joined;
    hour.cancelled += cell.cancelled;
    hour.noShow += cell.noShow;
    hour.waitSamples += cell.waitSamples;
    hour.waitSeconds += cell.waitSeconds;
    hour.serviceSamples += cell.serviceSamples || 0;
    hour.serviceSeconds += cell.serviceSeconds || 0;
  }
  const previousHourJoined = Array.from({ length: 24 }, () => 0);
  for (const cell of input.previousHeatmap || []) {
    if (cell.hour >= 0 && cell.hour < 24) previousHourJoined[cell.hour] += cell.joined;
  }
  const previousPeakJoined = Math.max(...previousHourJoined, 0);

  const weekdayJoined = WEEKDAYS.map((name, dow) => ({
    dow,
    name,
    joined: cells[dow].reduce((sum, cell) => sum + cell.joined, 0),
  }));
  const rankedHours = [...hourTotals].filter((hour) => hour.joined > 0).sort((a, b) => b.joined - a.joined || a.hour - b.hour);
  const peak = rankedHours[0] || null;
  const sparkJoined = daily.map((day) => ({ label: formatBucket(day.bucket, 'day'), value: day.joined }));
  const sparkServed = daily.map((day) => ({ label: formatBucket(day.bucket, 'day'), value: day.completed }));
  const sparkWait = daily.map((day) => ({ label: formatBucket(day.bucket, 'day'), value: average(day.waitSeconds, day.waitSamples) || 0 }));
  const sparkService = daily.map((day) => ({ label: formatBucket(day.bucket, 'day'), value: average(day.serviceSeconds, day.serviceSamples) || 0 }));

  const kpis = [
    kpi('served', 'Customers served', input.current.completed, input.previous.completed, 'count', 'up', sparkServed),
    kpi('joined', 'Joined', input.current.joined, input.previous.joined, 'count', 'up', sparkJoined),
    kpi('wait', 'Avg waiting time', wait, previousWait, 'duration', 'down', sparkWait),
    kpi('service', 'Avg service time', service, previousService, 'duration', 'down', sparkService),
    kpi('abandonment', 'Abandonment rate', null, null, 'percent', 'down', [], 'Abandoned visits are not recorded separately from cancellations.'),
    kpi(
      'servedPerHour',
      'Avg served per hour',
      servedPerHour,
      previousServedPerHour,
      'rate',
      'up',
      sparkServed,
      hours == null ? 'No completed visits with a finish time in this period.' : undefined,
    ),
    kpi(
      'peak',
      'Peak hours',
      peak ? peak.joined : null,
      previousPeakJoined > 0 ? previousPeakJoined : null,
      'text',
      'up',
      hourTotals.map((hour) => ({ label: hourLabel(hour.hour), value: hour.joined })),
      peak ? undefined : 'No guests joined in this period.',
      peak ? hourLabel(peak.hour) : null,
    ),
    kpi(
      'daily',
      'Avg daily customers',
      avgDaily,
      previousAvgDaily,
      'rate',
      'up',
      sparkServed,
      activeDays === 0 ? 'No guests joined in this period.' : undefined,
    ),
  ];

  const traffic = currentSeries.map((row, index) => ({
    bucket: row.bucket,
    label: formatBucket(row.bucket, input.groupBy),
    joined: row.joined,
    served: row.completed,
    previousJoined: previousSeries[index]?.joined ?? null,
    previousServed: previousSeries[index]?.completed ?? null,
  }));

  const lastDay = daily[daily.length - 1];
  const dayBefore = daily.length > 1 ? daily[daily.length - 2] : null;

  return {
    meta: {
      timeZone: input.timeZone,
      from: input.from,
      to: input.to,
      previousFrom: input.previousFromDate,
      previousTo: input.previousToDate,
      groupBy: input.groupBy,
      branchId: input.branchId,
      serviceType: input.serviceType,
      branches: input.branches,
      serviceTypes: input.serviceTypes,
      excludedDurations: input.current.excludedDurations,
      definitions: {
        waitingTime: 'Seating time minus join time. Visits that were never seated are excluded.',
        serviceTime: 'Completion time minus seating time. Visits with either time missing are excluded.',
        abandoned: 'Not available. Cancellations and staff skips are stored separately and are not treated as abandons.',
        noShow: 'Guests marked no-show after the queue arrival window.',
        operatingHours: 'On each day with a completed visit, hours from the first completion to the last, with at least one hour.',
        avgDaily: 'Completed visits divided by days in the range that had at least one join.',
        peakHours: 'The clock hour, in the restaurant timezone, with the most joins.',
      },
    },
    kpis,
    traffic,
    queuePerformance: {
      byHour: hourTotals.map((hour) => ({
        hour: hour.hour,
        label: hourLabel(hour.hour),
        joined: hour.joined,
        avgWaitSeconds: average(hour.waitSeconds, hour.waitSamples),
        avgServiceSeconds: average(hour.serviceSeconds, hour.serviceSamples),
        cancelled: hour.cancelled,
        noShow: hour.noShow,
      })),
      abandonmentTrend: null as null,
      abandonmentReason: 'Abandoned visits are not recorded, so this trend is not available. Cancellations are shown separately.',
      outcomes: traffic.map((point) => ({
        label: point.label,
        bucket: point.bucket,
        cancelled: currentSeries.find((row) => row.bucket === point.bucket)?.cancelled || 0,
        noShow: currentSeries.find((row) => row.bucket === point.bucket)?.noShow || 0,
      })),
    },
    peakHours: {
      cells: cells.flat(),
      topHours: rankedHours.slice(0, 3).map((hour) => ({ label: hourLabel(hour.hour), joined: hour.joined })),
      topDays: [...weekdayJoined].sort((a, b) => b.joined - a.joined).slice(0, 3),
      lowDays: [...weekdayJoined].sort((a, b) => a.joined - b.joined).slice(0, 3),
    },
    behaviour: {
      remote: input.current.remote,
      physical: input.current.walkIn,
      newCustomers: input.current.newCustomers,
      returning: input.current.returning,
      cancelled: input.current.cancelled,
      noShow: input.current.noShow,
      abandoned: null,
      avgPartySize: input.current.partySizeCount > 0 ? Math.round((input.current.partySizeSum / input.current.partySizeCount) * 10) / 10 : null,
    },
    performance: {
      completed: input.current.completed,
      cancelled: input.current.cancelled,
      abandoned: null,
      noShow: input.current.noShow,
      skipped: input.current.skipped,
      inProgress: Math.max(0, input.current.joined - input.current.completed - input.current.cancelled - input.current.noShow - input.current.skipped),
      avgPerActiveDay: avgDaily,
      activeDays,
      busiestDays: [...weekdayJoined].filter((day) => day.joined > 0).sort((a, b) => b.joined - a.joined).slice(0, 3),
      dayOverDay: dayBefore
        ? {
            current: lastDay.completed,
            previous: dayBefore.completed,
            changePercent: changePercent(lastDay.completed, dayBefore.completed),
            currentLabel: formatBucket(lastDay.bucket, 'day'),
            previousLabel: formatBucket(dayBefore.bucket, 'day'),
          }
        : null,
      monthOverMonth: input.fullMonth
        ? {
            current: input.current.completed,
            previous: input.previous.completed,
            changePercent: changePercent(input.current.completed, input.previous.completed),
          }
        : null,
    },
    counts: { current: input.current, previous: input.previous },
    daily,
    hours,
  };
}

function kpi(
  key: string,
  label: string,
  value: number | null,
  previous: number | null,
  unit: 'count' | 'duration' | 'percent' | 'rate' | 'text',
  goodWhen: 'up' | 'down',
  sparkline: { label: string; value: number }[],
  unavailableReason?: string,
  text?: string | null,
) {
  return {
    key,
    label,
    value,
    text: text ?? null,
    previous,
    changePercent: changePercent(value, previous),
    unit,
    goodWhen,
    sparkline,
    unavailableReason: value == null ? unavailableReason || null : null,
  };
}

export function isFullMonth(from: string, to: string) {
  if (!from.endsWith('-01')) return false;
  return addCalendarDays(to, 1).endsWith('-01') && from.slice(0, 7) === to.slice(0, 7);
}
