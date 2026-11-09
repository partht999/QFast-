'use client';

import { useState } from 'react';
import { Download, Minus, Plus, Receipt } from 'lucide-react';

export type BillLine = {
  id: string;
  name: string;
  quantity: number;
  amount: number;
  note?: string;
};

function money(value: number) {
  return `₹${value.toFixed(2)}`;
}

export function VisitBill({
  title = 'Your bill',
  businessName,
  detail,
  lines,
  subtotal,
  tax,
  total,
  downloadName = 'qfast-bill',
}: {
  title?: string;
  businessName?: string;
  detail?: string;
  lines: BillLine[];
  subtotal: number;
  tax: number;
  total: number;
  downloadName?: string;
}) {
  const [people, setPeople] = useState(1);
  const share = people > 1 ? Math.ceil((total / people) * 100) / 100 : total;

  const download = () => {
    const rows = lines
      .map(
        (line) =>
          `<tr><td>${line.quantity} × ${line.name}${line.note ? `<br><small>${line.note}</small>` : ''}</td><td style="text-align:right">${money(line.amount)}</td></tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family:sans-serif;max-width:420px;margin:32px auto;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #eee;vertical-align:top} .total{font-size:18px;font-weight:800}</style>
      </head><body>
      <h1>${businessName || 'Qfast'}</h1>
      <p>${detail || title}</p>
      <table>${rows}</table>
      <p>Subtotal ${money(subtotal)}<br>GST ${money(tax)}</p>
      <p class="total">Total ${money(total)}</p>
      ${people > 1 ? `<p>Split ${people} ways · ${money(share)} each</p>` : ''}
      </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${downloadName}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-500">
            <Receipt className="h-3.5 w-3.5" />
            {title}
          </p>
          {detail && <p className="mt-1 text-sm font-bold text-neutral-900">{detail}</p>}
        </div>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-1 rounded-xl bg-neutral-950 px-3 py-2 text-xs font-bold text-white"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <div key={line.id} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold text-neutral-900">
                {line.quantity} × {line.name}
              </p>
              {line.note && <p className="text-xs text-neutral-500">{line.note}</p>}
            </div>
            <span className="font-bold text-neutral-900">{money(line.amount)}</span>
          </div>
        ))}
        {lines.length === 0 && <p className="text-sm text-neutral-500">No items yet.</p>}
      </div>

      <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="flex justify-between"><span>GST</span><span>{money(tax)}</span></div>
        <div className="flex justify-between pt-1 text-base font-black text-neutral-950">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
        <span className="text-xs font-bold text-neutral-600">Split the bill</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPeople((count) => Math.max(1, count - 1))} className="rounded-lg border border-neutral-200 bg-white p-1" aria-label="Fewer people">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-16 text-center text-xs font-black text-neutral-900">{people === 1 ? 'Just me' : `${people} people`}</span>
          <button type="button" onClick={() => setPeople((count) => Math.min(12, count + 1))} className="rounded-lg border border-neutral-200 bg-white p-1" aria-label="More people">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {people > 1 && (
        <p className="mt-2 text-center text-sm font-black text-orange-700">{money(share)} each</p>
      )}
    </div>
  );
}
