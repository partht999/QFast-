'use client';

import { useState } from 'react';
import { Download, Minus, Plus, Receipt } from 'lucide-react';
import { describePayments, type PaymentLike } from '@/lib/payment';

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
  payments,
  downloadName = 'qfast-bill',
}: {
  title?: string;
  businessName?: string;
  detail?: string;
  lines: BillLine[];
  subtotal: number;
  tax: number;
  total: number;
  payments?: PaymentLike[];
  downloadName?: string;
}) {
  const [people, setPeople] = useState(1);
  const share = people > 1 ? Math.ceil((total / people) * 100) / 100 : total;
  const payment = describePayments(payments);
  const amount = payment.amount > 0 ? payment.amount : total;

  const receiptHtml = () => {
    const rows = lines
      .map(
        (line) =>
          `<tr><td>${line.quantity} × ${line.name}${line.note ? `<br><small>${line.note}</small>` : ''}</td><td style="text-align:right">${money(line.amount)}</td></tr>`,
      )
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family:Georgia,serif;max-width:360px;margin:24px auto;color:#111}h1{font-size:22px;margin-bottom:0}p{margin:6px 0}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 0;border-bottom:1px dashed #ccc;vertical-align:top}.total{font-size:20px;font-weight:700;border-top:2px solid #111;padding-top:8px}</style>
      </head><body>
      <h1>${businessName || 'Qfast'}</h1>
      <p>${detail || title}</p>
      <table>${rows}</table>
      <p>Subtotal ${money(subtotal)}<br>GST ${money(tax)}</p>
      <p class="total">Total ${money(total)}</p>
      <p>${payment.paid ? 'PAID' : payment.label}<br>${payment.methods} · ${money(amount)}</p>
      ${people > 1 ? `<p>Split ${people} ways · ${money(share)} each</p>` : ''}
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`;
  };

  const download = () => {
    const blob = new Blob([receiptHtml().replace('<script>window.onload=function(){window.print()}<' + '/script>', '')], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${downloadName}.html`;
    link.click();
    URL.revokeObjectURL(url);
    const popup = window.open('', 'qfast-bill', 'width=420,height=720');
    if (popup) {
      popup.document.write(receiptHtml());
      popup.document.close();
    }
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
        <div className={`mt-2 rounded-xl px-3 py-2 text-sm font-black ${payment.paid ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          <p>{payment.label}</p>
          <p className="text-xs font-semibold opacity-80">{payment.methods} · {money(amount)}</p>
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
