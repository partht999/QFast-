import { BuiltReport, changePercent, rate } from './analytics.metrics';

export type Insight = {
  id: string;
  severity: 'positive' | 'neutral' | 'warning';
  importance: number;
  message: string;
};

export function buildInsights(report: BuiltReport): Insight[] {
  const joined = report.counts.current.joined;
  if (joined < 10) {
    return [{ id: 'insufficient', severity: 'neutral', importance: 0, message: 'Not enough data yet.' }];
  }

  const insights: Insight[] = [];
  const topHour = report.peakHours.topHours[0];
  if (topHour && topHour.joined >= 5) {
    insights.push({
      id: 'busiest-hour',
      severity: 'neutral',
      importance: 70,
      message: `${topHour.label} is the busiest hour, with ${topHour.joined.toLocaleString('en-IN')} guests joining.`,
    });
  }

  const rangeDays = report.daily.length;
  const quiet = [...report.peakHours.lowDays].sort((a, b) => a.joined - b.joined)[0];
  if (rangeDays >= 7 && quiet) {
    insights.push({
      id: 'quiet-day',
      severity: 'neutral',
      importance: 40,
      message: `${quiet.name} has the least traffic in this period, with ${quiet.joined.toLocaleString('en-IN')} guests joining.`,
    });
  }

  const trafficChange = changePercent(report.counts.current.joined, report.counts.previous.joined);
  if (report.counts.previous.joined >= 10 && trafficChange != null && Math.abs(trafficChange) >= 15) {
    insights.push({
      id: 'traffic-change',
      severity: trafficChange < 0 ? 'warning' : 'positive',
      importance: Math.abs(trafficChange) >= 25 ? 90 : 72,
      message: `Joins are ${Math.abs(trafficChange).toLocaleString('en-IN')}% ${trafficChange < 0 ? 'lower' : 'higher'} than the previous period (${report.counts.previous.joined.toLocaleString('en-IN')} then, ${report.counts.current.joined.toLocaleString('en-IN')} now).`,
    });
  }

  const wait = report.kpis.find((item) => item.key === 'wait');
  const waitChange = wait?.changePercent ?? null;
  if (
    report.counts.current.waitSamples >= 10 &&
    report.counts.previous.waitSamples >= 10 &&
    wait?.value != null &&
    wait.previous != null &&
    waitChange != null &&
    (Math.abs(waitChange) >= 15 || Math.abs(wait.value - wait.previous) >= 180)
  ) {
    const minutes = Math.round(wait.value / 60);
    insights.push({
      id: 'wait-change',
      severity: waitChange > 0 ? 'warning' : 'positive',
      importance: 85,
      message: `Average waiting time is ${minutes} min, ${Math.abs(waitChange).toLocaleString('en-IN')}% ${waitChange > 0 ? 'longer' : 'shorter'} than the previous period.`,
    });
  }

  const worst = report.peakHours.cells
    .filter((cell) => cell.joined >= 5 && cell.avgWaitSeconds != null && cell.avgWaitSeconds >= 15 * 60)
    .sort((a, b) => (b.avgWaitSeconds || 0) - (a.avgWaitSeconds || 0))[0];
  if (worst?.avgWaitSeconds) {
    const minutes = Math.round(worst.avgWaitSeconds / 60);
    insights.push({
      id: 'worst-wait',
      severity: 'warning',
      importance: 80,
      message: `Waiting time averages ${minutes} min on ${worst.label}.`,
    });
    insights.push({
      id: 'staff-window',
      severity: 'warning',
      importance: 78,
      message: `Waiting time is ${minutes} min on ${worst.label}, above 15 min, so consider adding staff in that window.`,
    });
  }

  const cancellationRate = rate(report.counts.current.cancelled, joined);
  if (cancellationRate != null && cancellationRate >= 10 && joined >= 20) {
    insights.push({
      id: 'cancellations',
      severity: 'warning',
      importance: 76,
      message: `${cancellationRate.toLocaleString('en-IN')}% of guests who joined cancelled. No-shows are counted separately, and abandoned visits are not recorded.`,
    });
  }

  const noShowRate = rate(report.counts.current.noShow, joined);
  const previousNoShow = rate(report.counts.previous.noShow, report.counts.previous.joined);
  if (noShowRate != null && previousNoShow != null && report.counts.previous.joined >= 10 && Math.abs(noShowRate - previousNoShow) >= 5) {
    insights.push({
      id: 'noshow-trend',
      severity: noShowRate > previousNoShow ? 'warning' : 'positive',
      importance: 74,
      message: `The no-show rate is ${noShowRate.toLocaleString('en-IN')}%, compared with ${previousNoShow.toLocaleString('en-IN')}% in the previous period.`,
    });
  }
  if (noShowRate != null && noShowRate >= 15 && joined >= 20) {
    insights.push({
      id: 'noshow-action',
      severity: 'warning',
      importance: 68,
      message: `${noShowRate.toLocaleString('en-IN')}% of joined guests were no-shows. Review the arrival window if guests need more time to reach you.`,
    });
  }

  const ranked = insights.sort((a, b) => b.importance - a.importance).slice(0, 5);
  return ranked.map(({ importance, ...insight }) => ({ ...insight, importance }));
}
