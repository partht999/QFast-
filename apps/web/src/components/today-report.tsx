type Hour = { hour: number; label: string; joined: number; served: number };

export type TodayReportData = {
  dateLabel: string;
  queue: {
    joined: number;
    served: number;
    noShow: number;
    cancelled: number;
    stillWaiting: number;
    calledNow: number;
    averageWaitMinutes: number | null;
    averageServiceMinutes: number | null;
    busiestHour: string | null;
    hourly: Hour[];
    servedList: Array<{ tokenNumber: number; customerName: string; waitMinutes: number | null }>;
  };
  orders: {
    placed: number;
    completed: number;
    open: number;
    cancelled: number;
    revenue: number;
    averageBill: number;
  };
};

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export function TodayReport({ report, foodBusiness }: { report: TodayReportData; foodBusiness: boolean }) {
  const hours = report.queue.hourly.filter((hour) => (hour.hour >= 8 && hour.hour <= 22) || hour.joined > 0 || hour.served > 0);
  const peak = Math.max(1, ...hours.map((hour) => hour.joined));
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-600">Today</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{report.dateLabel}</h3>
          <p className="mt-1 text-sm text-slate-600">One queue, from the first join to the last person served.</p>
        </div>
        {report.queue.busiestHour && (
          <p className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
            Busiest hour {report.queue.busiestHour}
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Joined" value={report.queue.joined} detail="New tokens today" />
        <Stat label="Served" value={report.queue.served} detail="Completed today" />
        <Stat label="No-show" value={report.queue.noShow} detail={`${report.queue.cancelled} cancelled`} />
        <Stat
          label="Avg wait"
          value={report.queue.averageWaitMinutes == null ? '—' : `${report.queue.averageWaitMinutes}m`}
          detail={
            report.queue.averageServiceMinutes == null
              ? `${report.queue.stillWaiting} still waiting`
              : `${report.queue.averageServiceMinutes}m at the counter`
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-slate-900">Joins by hour</p>
          <p className="text-xs text-slate-500">{report.queue.calledNow} called right now</p>
        </div>
        <div className="mt-4 flex h-28 items-end gap-1">
          {hours.map((hour) => (
            <div key={hour.hour} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-orange-500"
                  style={{ height: `${Math.max(hour.joined ? 8 : 0, (hour.joined / peak) * 100)}%` }}
                  title={`${hour.label}: ${hour.joined} joined, ${hour.served} served`}
                />
              </div>
              <span className="text-[9px] font-semibold text-slate-400">{hour.hour % 2 === 0 ? hour.label : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {foodBusiness && (
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Orders" value={report.orders.placed} detail={`${report.orders.open} still open`} />
          <Stat label="Served bills" value={report.orders.completed} detail={`${report.orders.cancelled} cancelled`} />
          <Stat label="Revenue" value={money.format(report.orders.revenue)} detail="Completed orders" />
          <Stat label="Average bill" value={money.format(report.orders.averageBill)} />
        </div>
      )}

      {report.queue.servedList.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-black text-slate-900">Served today</p>
          <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {report.queue.servedList.map((person) => (
              <li key={`${person.tokenNumber}-${person.customerName}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-semibold text-slate-800">
                  #{person.tokenNumber} {person.customerName}
                </span>
                <span className="text-xs text-slate-500">
                  {person.waitMinutes == null ? 'Served' : `${person.waitMinutes}m wait`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
