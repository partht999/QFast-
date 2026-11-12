export function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function csvLine(values: unknown[]) {
  return values.map(csvCell).join(',');
}

export function reportToCsv(report: {
  meta: {
    timeZone: string;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    groupBy: string;
    branchId: string | null;
    serviceType: string | null;
  };
  kpis: { label: string; value: number | null; text: string | null; previous: number | null; changePercent: number | null; unavailableReason: string | null }[];
  traffic: { label: string; joined: number; served: number; previousJoined: number | null; previousServed: number | null }[];
  queuePerformance: { byHour: { label: string; avgWaitSeconds: number | null; avgServiceSeconds: number | null; cancelled: number; noShow: number }[] };
  behaviour: { remote: number; physical: number; newCustomers: number; returning: number; cancelled: number; noShow: number; abandoned: null; avgPartySize: number | null };
  insights: { severity: string; message: string }[];
  orders?: {
    placed: number;
    completed: number;
    cancelled: number;
    revenue: number;
    averageBill: number | null;
    previousPlaced: number;
    previousRevenue: number;
    bySource: { label: string; placed: number; revenue: number }[];
    byDay: { bucket: string; placed: number; revenue: number }[];
  };
}) {
  const lines = [
    csvLine(['Qfast analytics']),
    csvLine(['Timezone', report.meta.timeZone]),
    csvLine(['From', report.meta.from]),
    csvLine(['To', report.meta.to]),
    csvLine(['Previous from', report.meta.previousFrom]),
    csvLine(['Previous to', report.meta.previousTo]),
    csvLine(['Grouping', report.meta.groupBy]),
    csvLine(['Branch', report.meta.branchId || 'All']),
    csvLine(['Service', report.meta.serviceType || 'All']),
    '',
    csvLine(['Metric', 'Value', 'Text', 'Previous', 'Change percent', 'Note']),
    ...report.kpis.map((item) => csvLine([item.label, item.value, item.text, item.previous, item.changePercent, item.unavailableReason])),
    '',
    csvLine(['Traffic', 'Joined', 'Served', 'Previous joined', 'Previous served']),
    ...report.traffic.map((point) => csvLine([point.label, point.joined, point.served, point.previousJoined, point.previousServed])),
    '',
    csvLine(['Hour', 'Avg wait seconds', 'Avg service seconds', 'Cancellations', 'No-shows']),
    ...report.queuePerformance.byHour.map((hour) => csvLine([hour.label, hour.avgWaitSeconds, hour.avgServiceSeconds, hour.cancelled, hour.noShow])),
    '',
    csvLine(['Remote joins', report.behaviour.remote]),
    csvLine(['Physical joins', report.behaviour.physical]),
    csvLine(['New guests', report.behaviour.newCustomers]),
    csvLine(['Returning guests', report.behaviour.returning]),
    csvLine(['Cancellations', report.behaviour.cancelled]),
    csvLine(['No-shows', report.behaviour.noShow]),
    csvLine(['Abandoned', 'Not available']),
    csvLine(['Average group size', report.behaviour.avgPartySize]),
    ...(report.orders ? [
      '',
      csvLine(['Orders placed', report.orders.placed]),
      csvLine(['Orders completed', report.orders.completed]),
      csvLine(['Orders cancelled or rejected', report.orders.cancelled]),
      csvLine(['Closed-bill total', report.orders.revenue]),
      csvLine(['Average closed bill', report.orders.averageBill]),
      csvLine(['Previous orders placed', report.orders.previousPlaced]),
      csvLine(['Previous closed-bill total', report.orders.previousRevenue]),
      '',
      csvLine(['Order source', 'Placed', 'Closed-bill total']),
      ...report.orders.bySource.map((source) => csvLine([source.label, source.placed, source.revenue])),
      '',
      csvLine(['Order day', 'Placed', 'Closed-bill total']),
      ...report.orders.byDay.map((day) => csvLine([day.bucket, day.placed, day.revenue])),
    ] : []),
    '',
    csvLine(['Insight severity', 'Insight']),
    ...report.insights.map((insight) => csvLine([insight.severity, insight.message])),
  ];
  return `\uFEFF${lines.join('\n')}\n`;
}
