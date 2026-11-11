const assert = require('node:assert/strict');
import { AnalyticsService } from './analytics.service';
import { csvCell } from './analytics.csv';
import { buildInsights } from './analytics.insights';
import {
  buildReport,
  changePercent,
  defaultGroupBy,
  emptyCounts,
  emptySeries,
  inclusiveDays,
  operatingHours,
  rate,
  resolveGroupBy,
  resolveRange,
  zeroFill,
  zonedStartUtc,
  PeriodCounts,
} from './analytics.metrics';

const tests: [string, () => void | Promise<void>][] = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push([name, fn]);
}

test('change percent hides missing and zero baselines', () => {
  assert.equal(changePercent(10, 0), null);
  assert.equal(changePercent(10, null), null);
  assert.equal(changePercent(null, 5), null);
  assert.equal(changePercent(15, 10), 50);
  assert.equal(changePercent(5, 10), -50);
});

test('rates are unavailable when nobody joined', () => {
  assert.equal(rate(0, 0), null);
  assert.equal(rate(1, 4), 25);
});

test('restaurant-local midnight converts to UTC, including a DST boundary', () => {
  assert.equal(zonedStartUtc('2026-11-11', 'Asia/Kolkata').toISOString(), '2026-11-10T18:30:00.000Z');
  assert.equal(zonedStartUtc('2026-03-08', 'America/New_York').toISOString(), '2026-03-08T05:00:00.000Z');
  assert.equal(zonedStartUtc('2026-03-09', 'America/New_York').toISOString(), '2026-03-09T04:00:00.000Z');
});

test('previous period is the same number of calendar days', () => {
  const range = resolveRange({ from: '2026-11-05', to: '2026-11-11', timeZone: 'Asia/Kolkata', now: new Date('2026-11-11T12:00:00Z') });
  assert.equal(range.days, 7);
  assert.equal(range.previousFromDate, '2026-10-29');
  assert.equal(range.previousToDate, '2026-11-04');
  assert.equal(inclusiveDays(range.previousFromDate, range.previousToDate), 7);
  assert.throws(() => resolveRange({ from: '2026-11-11', to: '2026-11-01', timeZone: 'Asia/Kolkata' }), /start date/);
  assert.throws(() => resolveRange({ from: '2024-01-01', to: '2026-01-01', timeZone: 'Asia/Kolkata' }), /366/);
});

test('hourly grouping is replaced when the range is longer than a week', () => {
  assert.equal(defaultGroupBy('2026-11-11', '2026-11-11'), 'hour');
  assert.equal(resolveGroupBy('hour', '2026-10-01', '2026-11-11'), 'day');
  assert.equal(resolveGroupBy('week', '2026-11-01', '2026-11-11'), 'week');
});

test('empty time buckets are filled', () => {
  const rows = zeroFill([{ ...emptySeries('2026-11-11'), joined: 2 }], '2026-11-10', '2026-11-12', 'day');
  assert.deepEqual(rows.map((row) => row.joined), [0, 2, 0]);
});

test('operating hours use at least one hour on a day with one completion', () => {
  assert.equal(operatingHours([]), null);
  assert.equal(operatingHours([{ day: '2026-11-11', firstEpoch: 100, lastEpoch: 100, served: 1 }]), 1);
  assert.equal(operatingHours([{ day: '2026-11-11', firstEpoch: 0, lastEpoch: 7200, served: 4 }]), 2);
});

test('completed, cancelled, and no-show stay separate, and abandonment is unavailable', () => {
  const current: PeriodCounts = { ...emptyCounts(), joined: 10, completed: 6, cancelled: 2, noShow: 1, skipped: 1, waitSamples: 4, waitSeconds: 2400, partySizeCount: 10, partySizeSum: 25 };
  const report = buildReport(base({ current, operatingDays: [{ day: '2026-11-10', firstEpoch: 0, lastEpoch: 3600, served: 6 }] }));
  const byKey = Object.fromEntries(report.kpis.map((item) => [item.key, item]));
  assert.equal(byKey.served.value, 6);
  assert.equal(byKey.abandonment.value, null);
  assert.match(byKey.abandonment.unavailableReason || '', /not recorded/);
  assert.equal(report.performance.completed, 6);
  assert.equal(report.performance.cancelled, 2);
  assert.equal(report.performance.noShow, 1);
  assert.equal(report.performance.abandoned, null);
  assert.equal(report.performance.inProgress, 0);
  assert.equal(byKey.wait.value, 600);
  assert.equal(report.behaviour.avgPartySize, 2.5);
  assert.equal(byKey.servedPerHour.value, 6);
});

test('waiting time excludes visits that were never seated', () => {
  const current = { ...emptyCounts(), joined: 3, completed: 3, waitSamples: 0, waitSeconds: 0, serviceSamples: 0 };
  const report = buildReport(base({ current }));
  assert.equal(report.kpis.find((item) => item.key === 'wait')?.value, null);
  assert.equal(report.kpis.find((item) => item.key === 'service')?.value, null);
});

test('insights stay quiet until there is a real sample', () => {
  const small = buildReport(base({ current: { ...emptyCounts(), joined: 4, completed: 1 } }));
  assert.equal(buildInsights(small)[0].message, 'Not enough data yet.');

  const heatmap = [{ dow: 6, hour: 19, joined: 12, cancelled: 0, noShow: 0, waitSamples: 12, waitSeconds: 12 * 20 * 60, serviceSamples: 0, serviceSeconds: 0 }];
  const busy = buildReport(base({
    from: '2026-11-05',
    to: '2026-11-11',
    previousFromDate: '2026-10-29',
    previousToDate: '2026-11-04',
    current: { ...emptyCounts(), joined: 30, completed: 20, cancelled: 6, noShow: 5, waitSamples: 20, waitSeconds: 20 * 18 * 60 },
    previous: { ...emptyCounts(), joined: 20, completed: 18, noShow: 1, waitSamples: 15, waitSeconds: 15 * 10 * 60 },
    heatmap,
    dailyCurrent: Array.from({ length: 7 }, (_, index) => ({ ...emptySeries(`2026-11-${String(5 + index).padStart(2, '0')}`), joined: index === 6 ? 12 : 3, completed: 2 })),
  }));
  const insights = buildInsights(busy);
  assert.ok(insights.length > 0 && insights.length <= 5);
  assert.ok(insights.some((item) => item.message.includes('7–8 PM')));
  assert.ok(insights.every((item) => item.message !== 'Not enough data yet.'));
  assert.ok(!insights.some((item) => /abandonment rate is 0/i.test(item.message)));
});

test('csv cells cannot start a spreadsheet formula', () => {
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell('+91'), "'+91");
  assert.equal(csvCell('hello, "there"'), '"hello, ""there"""');
  assert.equal(csvCell(null), '');
});

test('a restaurant cannot read another restaurant', async () => {
  const seen: unknown[] = [];
  const prisma: any = {
    staff: {
      findFirst: async ({ where }: any) => (where.userId === 'owner-a' ? { businessId: 'biz-a', business: { timezone: 'Asia/Kolkata' } } : null),
    },
    businessBranch: { findFirst: async () => null, findMany: async () => [] },
    queueToken: { findMany: async () => [] },
    $queryRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
      seen.push(values);
      return [];
    },
  };
  const service = new AnalyticsService(prisma);
  await assert.rejects(() => service.report('owner-b', { from: '2026-11-01', to: '2026-11-02' }), /owner or manager/);
  assert.equal(seen.length, 0);
  await service.report('owner-a', { from: '2026-11-01', to: '2026-11-02', businessId: 'biz-b' } as any);
  const flat = JSON.stringify(seen);
  assert.equal(flat.includes('biz-a'), true);
  assert.equal(flat.includes('biz-b'), false);
});

function base(overrides: Record<string, unknown>) {
  return {
    timeZone: 'Asia/Kolkata',
    from: '2026-11-10',
    to: '2026-11-10',
    previousFromDate: '2026-11-09',
    previousToDate: '2026-11-09',
    groupBy: 'day' as const,
    branchId: null,
    serviceType: null,
    current: emptyCounts(),
    previous: emptyCounts(),
    currentSeries: [],
    previousSeries: [],
    dailyCurrent: [],
    heatmap: [],
    operatingDays: [],
    branches: [],
    serviceTypes: [],
    fullMonth: false,
    ...overrides,
  };
}

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`ok ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }
  if (failed) process.exit(1);
})();
