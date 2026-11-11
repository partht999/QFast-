import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { reportToCsv } from './analytics.csv';
import { buildInsights } from './analytics.insights';
import {
  buildReport,
  emptyCounts,
  emptySeries,
  HeatCell,
  isFullMonth,
  OperatingDay,
  PeriodCounts,
  resolveGroupBy,
  resolveRange,
  safeTimeZone,
  SeriesRow,
} from './analytics.metrics';
import { reportToPdf } from './analytics.pdf';

const CACHE_MS = 60_000;
const waitValid = Prisma.sql`t."seatedAt" IS NOT NULL AND t."seatedAt" >= t."createdAt" AND EXTRACT(EPOCH FROM (t."seatedAt" - t."createdAt")) BETWEEN 0 AND 43200`;
const serviceValid = Prisma.sql`t."completedAt" IS NOT NULL AND t."seatedAt" IS NOT NULL AND t."completedAt" >= t."seatedAt" AND EXTRACT(EPOCH FROM (t."completedAt" - t."seatedAt")) BETWEEN 0 AND 43200`;

type QueryInput = {
  from?: string;
  to?: string;
  groupBy?: string;
  branchId?: string;
  serviceType?: string;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly cache = new Map<string, { at: number; value: ReturnType<typeof buildReport> & { insights: ReturnType<typeof buildInsights> } }>();

  constructor(private prisma: PrismaService) {}

  async report(userId: string, query: QueryInput) {
    const scope = await this.scopeForUser(userId);
    const range = this.rangeOrThrow(query, scope.timeZone);
    const groupBy = resolveGroupBy(query.groupBy, range.from, range.to);
    const branchId = query.branchId?.trim() || null;
    const serviceType = query.serviceType?.trim() || null;
    if (branchId) {
      const branch = await this.prisma.businessBranch.findFirst({ where: { id: branchId, businessId: scope.businessId } });
      if (!branch) throw new BadRequestException('That branch is not part of this restaurant.');
    }

    const cacheKey = JSON.stringify({ businessId: scope.businessId, from: range.from, to: range.to, groupBy, branchId, serviceType });
    const cached = this.cache.get(cacheKey);
    const closedPeriod = range.currentTo.getTime() <= Date.now();
    if (cached && Date.now() - cached.at < CACHE_MS && closedPeriod) return cached.value;

    const filters = this.filters(branchId, serviceType);
    const [counts, series, daily, heatmap, operating, branches, serviceTypes] = await Promise.all([
      this.countPeriods(scope.businessId, range, filters),
      this.series(scope.businessId, range, filters, groupBy),
      this.series(scope.businessId, range, filters, 'day'),
      this.heatmap(scope.businessId, range, filters),
      this.operating(scope.businessId, range, filters),
      this.prisma.businessBranch.findMany({ where: { businessId: scope.businessId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.queueToken.findMany({
        where: { queue: { businessId: scope.businessId }, NOT: { serviceName: null } },
        distinct: ['serviceName'],
        select: { serviceName: true },
        take: 40,
      }),
    ]);

    if (counts.current.excludedDurations > 0) {
      this.logger.warn(`Excluded ${counts.current.excludedDurations} queue durations for restaurant ${scope.businessId}`);
    }

    const built = buildReport({
      timeZone: range.timeZone,
      from: range.from,
      to: range.to,
      previousFromDate: range.previousFromDate,
      previousToDate: range.previousToDate,
      groupBy,
      branchId,
      serviceType,
      current: counts.current,
      previous: counts.previous,
      currentSeries: series.current,
      previousSeries: series.previous,
      dailyCurrent: daily.current,
      dailyPrevious: daily.previous,
      heatmap: heatmap.current,
      previousHeatmap: heatmap.previous,
      operatingDays: operating.current,
      previousOperatingDays: operating.previous,
      branches,
      serviceTypes: serviceTypes.map((row) => row.serviceName).filter((name): name is string => Boolean(name)),
      fullMonth: isFullMonth(range.from, range.to),
    });
    const value = { ...built, insights: buildInsights(built) };
    if (closedPeriod) {
      this.cache.set(cacheKey, { at: Date.now(), value });
      if (this.cache.size > 100) {
        const oldest = this.cache.keys().next().value;
        if (oldest) this.cache.delete(oldest);
      }
    }
    return value;
  }

  async csv(userId: string, query: QueryInput) {
    return reportToCsv(await this.report(userId, query));
  }

  async pdf(userId: string, query: QueryInput) {
    return reportToPdf(await this.report(userId, query));
  }

  private rangeOrThrow(query: QueryInput, timeZone: string) {
    try {
      return resolveRange({ from: query.from, to: query.to, timeZone: safeTimeZone(timeZone) });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid date range.');
    }
  }

  private async scopeForUser(userId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { userId, isActive: true, role: { in: [UserRole.OWNER, UserRole.MANAGER] } },
      orderBy: { createdAt: 'asc' },
      select: { businessId: true, business: { select: { timezone: true } } },
    });
    if (!staff) throw new ForbiddenException('Analytics is available to the restaurant owner or manager.');
    return { businessId: staff.businessId, timeZone: safeTimeZone(staff.business.timezone) };
  }

  private filters(branchId: string | null, serviceType: string | null) {
    return Prisma.sql`
      ${branchId ? Prisma.sql`AND q."branchId" = ${branchId}` : Prisma.empty}
      ${serviceType ? Prisma.sql`AND t."serviceName" = ${serviceType}` : Prisma.empty}
    `;
  }

  private async countPeriods(businessId: string, range: ReturnType<typeof resolveRange>, filters: Prisma.Sql) {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      WITH first_visit AS (
        SELECT t."customerPhone" AS phone, MIN(t."createdAt") AS first_at
        FROM "QueueToken" t
        JOIN "Queue" q ON q.id = t."queueId"
        WHERE q."businessId" = ${businessId}
        ${filters}
        GROUP BY t."customerPhone"
      )
      SELECT
        CASE WHEN t."createdAt" >= ${range.currentFrom} THEN 'current' ELSE 'previous' END AS period,
        COUNT(*)::int AS joined,
        COUNT(*) FILTER (WHERE t.status = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE t.status = 'CANCELLED')::int AS cancelled,
        COUNT(*) FILTER (WHERE t.status = 'NO_SHOW')::int AS no_show,
        COUNT(*) FILTER (WHERE t.status = 'SKIPPED')::int AS skipped,
        COUNT(*) FILTER (WHERE t.source = 'REMOTE')::int AS remote,
        COUNT(*) FILTER (WHERE t.source = 'WALK_IN')::int AS walk_in,
        COUNT(*) FILTER (WHERE fv.first_at = t."createdAt")::int AS new_customers,
        COUNT(*) FILTER (WHERE fv.first_at < t."createdAt")::int AS returning,
        COALESCE(SUM(t."partySize"), 0)::float AS party_sum,
        COUNT(t."partySize")::int AS party_count,
        COUNT(*) FILTER (WHERE ${waitValid})::int AS wait_samples,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t."seatedAt" - t."createdAt"))) FILTER (WHERE ${waitValid}), 0)::float AS wait_seconds,
        COUNT(*) FILTER (WHERE ${serviceValid})::int AS service_samples,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t."completedAt" - t."seatedAt"))) FILTER (WHERE ${serviceValid}), 0)::float AS service_seconds,
        COUNT(*) FILTER (WHERE
          (t."seatedAt" IS NOT NULL AND (t."seatedAt" < t."createdAt" OR EXTRACT(EPOCH FROM (t."seatedAt" - t."createdAt")) > 43200))
          OR (t."completedAt" IS NOT NULL AND t."seatedAt" IS NOT NULL AND (t."completedAt" < t."seatedAt" OR EXTRACT(EPOCH FROM (t."completedAt" - t."seatedAt")) > 43200))
        )::int AS excluded
      FROM "QueueToken" t
      JOIN "Queue" q ON q.id = t."queueId"
      LEFT JOIN first_visit fv ON fv.phone = t."customerPhone"
      WHERE q."businessId" = ${businessId}
        AND t."createdAt" >= ${range.previousFrom}
        AND t."createdAt" < ${range.currentTo}
        ${filters}
      GROUP BY 1
    `;
    return {
      current: countsFrom(rows.find((row) => row.period === 'current')),
      previous: countsFrom(rows.find((row) => row.period === 'previous')),
    };
  }

  private async series(businessId: string, range: ReturnType<typeof resolveRange>, filters: Prisma.Sql, groupBy: 'hour' | 'day' | 'week' | 'month') {
    const bucket = groupBy === 'hour'
      ? Prisma.sql`to_char(date_trunc('hour', t."createdAt" AT TIME ZONE ${range.timeZone}), 'YYYY-MM-DD"T"HH24')`
      : groupBy === 'week'
        ? Prisma.sql`to_char(date_trunc('week', t."createdAt" AT TIME ZONE ${range.timeZone}), 'YYYY-MM-DD')`
        : groupBy === 'month'
          ? Prisma.sql`to_char(date_trunc('month', t."createdAt" AT TIME ZONE ${range.timeZone}), 'YYYY-MM')`
          : Prisma.sql`to_char(date_trunc('day', t."createdAt" AT TIME ZONE ${range.timeZone}), 'YYYY-MM-DD')`;
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        ${bucket} AS bucket,
        CASE WHEN t."createdAt" >= ${range.currentFrom} THEN 'current' ELSE 'previous' END AS period,
        COUNT(*)::int AS joined,
        COUNT(*) FILTER (WHERE t.status = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE t.status = 'CANCELLED')::int AS cancelled,
        COUNT(*) FILTER (WHERE t.status = 'NO_SHOW')::int AS no_show,
        COUNT(*) FILTER (WHERE ${waitValid})::int AS wait_samples,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t."seatedAt" - t."createdAt"))) FILTER (WHERE ${waitValid}), 0)::float AS wait_seconds,
        COUNT(*) FILTER (WHERE ${serviceValid})::int AS service_samples,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t."completedAt" - t."seatedAt"))) FILTER (WHERE ${serviceValid}), 0)::float AS service_seconds
      FROM "QueueToken" t
      JOIN "Queue" q ON q.id = t."queueId"
      WHERE q."businessId" = ${businessId}
        AND t."createdAt" >= ${range.previousFrom}
        AND t."createdAt" < ${range.currentTo}
        ${filters}
      GROUP BY 1, 2
    `;
    return {
      current: rows.filter((row) => row.period === 'current').map(seriesFrom),
      previous: rows.filter((row) => row.period === 'previous').map(seriesFrom),
    };
  }

  private async heatmap(businessId: string, range: ReturnType<typeof resolveRange>, filters: Prisma.Sql) {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        CASE WHEN t."createdAt" >= ${range.currentFrom} THEN 'current' ELSE 'previous' END AS period,
        EXTRACT(DOW FROM t."createdAt" AT TIME ZONE ${range.timeZone})::int AS dow,
        EXTRACT(HOUR FROM t."createdAt" AT TIME ZONE ${range.timeZone})::int AS hour,
        COUNT(*)::int AS joined,
        COUNT(*) FILTER (WHERE t.status = 'CANCELLED')::int AS cancelled,
        COUNT(*) FILTER (WHERE t.status = 'NO_SHOW')::int AS no_show,
        COUNT(*) FILTER (WHERE ${waitValid})::int AS wait_samples,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t."seatedAt" - t."createdAt"))) FILTER (WHERE ${waitValid}), 0)::float AS wait_seconds,
        COUNT(*) FILTER (WHERE ${serviceValid})::int AS service_samples,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t."completedAt" - t."seatedAt"))) FILTER (WHERE ${serviceValid}), 0)::float AS service_seconds
      FROM "QueueToken" t
      JOIN "Queue" q ON q.id = t."queueId"
      WHERE q."businessId" = ${businessId}
        AND t."createdAt" >= ${range.previousFrom}
        AND t."createdAt" < ${range.currentTo}
        ${filters}
      GROUP BY 1, 2, 3
    `;
    const mapRow = (row: Record<string, unknown>): HeatCell => ({
      dow: num(row.dow),
      hour: num(row.hour),
      joined: num(row.joined),
      cancelled: num(row.cancelled),
      noShow: num(row.no_show),
      waitSamples: num(row.wait_samples),
      waitSeconds: num(row.wait_seconds),
      serviceSamples: num(row.service_samples),
      serviceSeconds: num(row.service_seconds),
    });
    return {
      current: rows.filter((row) => row.period === 'current').map(mapRow),
      previous: rows.filter((row) => row.period === 'previous').map(mapRow),
    };
  }

  private async operating(businessId: string, range: ReturnType<typeof resolveRange>, filters: Prisma.Sql) {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        CASE WHEN t."createdAt" >= ${range.currentFrom} THEN 'current' ELSE 'previous' END AS period,
        to_char(t."completedAt" AT TIME ZONE ${range.timeZone}, 'YYYY-MM-DD') AS day,
        EXTRACT(EPOCH FROM MIN(t."completedAt"))::float AS first_epoch,
        EXTRACT(EPOCH FROM MAX(t."completedAt"))::float AS last_epoch,
        COUNT(*)::int AS served
      FROM "QueueToken" t
      JOIN "Queue" q ON q.id = t."queueId"
      WHERE q."businessId" = ${businessId}
        AND t.status = 'COMPLETED'
        AND t."completedAt" IS NOT NULL
        AND t."createdAt" >= ${range.previousFrom}
        AND t."createdAt" < ${range.currentTo}
        ${filters}
      GROUP BY 1, 2
    `;
    const mapRow = (row: Record<string, unknown>): OperatingDay => ({
      day: String(row.day),
      firstEpoch: num(row.first_epoch),
      lastEpoch: num(row.last_epoch),
      served: num(row.served),
    });
    return {
      current: rows.filter((row) => row.period === 'current').map(mapRow),
      previous: rows.filter((row) => row.period === 'previous').map(mapRow),
    };
  }
}

function num(value: unknown) {
  const parsed = typeof value === 'bigint' ? Number(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countsFrom(row: Record<string, unknown> | undefined): PeriodCounts {
  if (!row) return emptyCounts();
  return {
    joined: num(row.joined),
    completed: num(row.completed),
    cancelled: num(row.cancelled),
    noShow: num(row.no_show),
    skipped: num(row.skipped),
    remote: num(row.remote),
    walkIn: num(row.walk_in),
    newCustomers: num(row.new_customers),
    returning: num(row.returning),
    partySizeSum: num(row.party_sum),
    partySizeCount: num(row.party_count),
    waitSamples: num(row.wait_samples),
    waitSeconds: num(row.wait_seconds),
    serviceSamples: num(row.service_samples),
    serviceSeconds: num(row.service_seconds),
    excludedDurations: num(row.excluded),
  };
}

function seriesFrom(row: Record<string, unknown>): SeriesRow {
  return {
    ...emptySeries(String(row.bucket)),
    joined: num(row.joined),
    completed: num(row.completed),
    cancelled: num(row.cancelled),
    noShow: num(row.no_show),
    waitSamples: num(row.wait_samples),
    waitSeconds: num(row.wait_seconds),
    serviceSamples: num(row.service_samples),
    serviceSeconds: num(row.service_seconds),
  };
}
