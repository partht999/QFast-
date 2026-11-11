type PdfReport = {
  meta: {
    timeZone: string;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    groupBy: string;
    branchId: string | null;
    serviceType: string | null;
    definitions: Record<string, string>;
  };
  kpis: { label: string; value: number | null; text: string | null; previous: number | null; changePercent: number | null; unit: string; unavailableReason: string | null }[];
  traffic: { label: string; joined: number; served: number; previousJoined: number | null; previousServed: number | null }[];
  queuePerformance: { byHour: { label: string; avgWaitSeconds: number | null; avgServiceSeconds: number | null; cancelled: number; noShow: number; joined: number }[]; abandonmentReason: string };
  behaviour: { remote: number; physical: number; newCustomers: number; returning: number; cancelled: number; noShow: number; abandoned: null; avgPartySize: number | null };
  performance: { completed: number; cancelled: number; noShow: number; skipped: number; inProgress: number; abandoned: null };
  peakHours: { topHours: { label: string; joined: number }[]; topDays: { name: string; joined: number }[] };
  insights: { severity: string; message: string }[];
};

export function reportToPdf(report: PdfReport) {
  // pdfkit is a server-side dependency. Charts are drawn as full tables so rows are not clipped.
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const ensureSpace = (height: number) => {
    if (doc.y + height > doc.page.height - 56) doc.addPage();
  };

  doc.fontSize(18).fillColor('#111827').text('Qfast analytics');
  doc.moveDown(0.25);
  doc.fontSize(10).fillColor('#4b5563').text(`${report.meta.from} to ${report.meta.to}`);
  doc.text(`Compared with ${report.meta.previousFrom} to ${report.meta.previousTo}`);
  doc.text(`Timezone ${report.meta.timeZone} · Grouped by ${report.meta.groupBy}`);
  doc.text(`Branch ${report.meta.branchId || 'All'} · Service ${report.meta.serviceType || 'All'}`);
  doc.moveDown();

  doc.fontSize(13).fillColor('#111827').text('Summary');
  doc.moveDown(0.3);
  for (const item of report.kpis) {
    ensureSpace(28);
    const value = item.text || (item.value == null ? 'Not available' : String(item.value));
    const change = item.changePercent == null ? '—' : `${item.changePercent > 0 ? '+' : ''}${item.changePercent}%`;
    doc.fontSize(10).fillColor('#111827').text(`${item.label}: ${value}   previous ${item.previous ?? '—'}   change ${change}`);
    if (item.unavailableReason) doc.fontSize(8).fillColor('#6b7280').text(item.unavailableReason);
  }

  doc.moveDown();
  doc.fontSize(13).fillColor('#111827').text('Customer traffic');
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#4b5563').text('Period, Joined, Served, Previous joined, Previous served');
  for (const point of report.traffic) {
    ensureSpace(14);
    doc.fontSize(9).fillColor('#111827').text(`${point.label}, ${point.joined}, ${point.served}, ${point.previousJoined ?? '—'}, ${point.previousServed ?? '—'}`);
  }

  doc.moveDown();
  doc.fontSize(13).text('Queue performance by hour');
  doc.moveDown(0.2);
  doc.fontSize(8).fillColor('#6b7280').text(report.queuePerformance.abandonmentReason);
  doc.moveDown(0.3);
  for (const hour of report.queuePerformance.byHour) {
    ensureSpace(14);
    doc.fontSize(9).fillColor('#111827').text(
      `${hour.label}: joined ${hour.joined}, wait ${hour.avgWaitSeconds ?? 'n/a'}s, service ${hour.avgServiceSeconds ?? 'n/a'}s, cancelled ${hour.cancelled}, no-show ${hour.noShow}`,
    );
  }

  doc.moveDown();
  doc.fontSize(13).text('Outcomes');
  doc.fontSize(10).text(`Completed ${report.performance.completed}`);
  doc.text(`Cancelled ${report.performance.cancelled}`);
  doc.text('Abandoned: Not available');
  doc.text(`No-show ${report.performance.noShow}`);
  doc.text(`Skipped by staff ${report.performance.skipped}`);
  doc.text(`Still in queue ${report.performance.inProgress}`);
  doc.moveDown(0.4);
  doc.text(`Remote ${report.behaviour.remote} · At the restaurant ${report.behaviour.physical}`);
  doc.text(`New ${report.behaviour.newCustomers} · Returning ${report.behaviour.returning}`);
  doc.text(`Average group size ${report.behaviour.avgPartySize ?? 'Not available'}`);
  doc.moveDown();
  doc.fontSize(13).text('Busiest hours and days');
  doc.fontSize(10);
  for (const hour of report.peakHours.topHours) doc.text(`${hour.label}: ${hour.joined} joins`);
  for (const day of report.peakHours.topDays) doc.text(`${day.name}: ${day.joined} joins`);
  doc.moveDown();
  doc.fontSize(13).text('Insights');
  doc.fontSize(10);
  if (!report.insights.length) doc.text('No unusual patterns in this period.');
  for (const insight of report.insights) {
    ensureSpace(32);
    doc.text(`${insight.severity}: ${insight.message}`);
  }
  doc.moveDown();
  doc.fontSize(8).fillColor('#6b7280');
  for (const note of Object.values(report.meta.definitions)) {
    ensureSpace(20);
    doc.text(note);
  }

  doc.end();
  return done;
}
