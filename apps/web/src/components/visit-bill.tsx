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
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileStamp(value: string) {
  return value.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'qfast-bill';
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
  address,
  phone,
  gstin,
  logoUrl,
  billNo,
  issuedAt,
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
  address?: string;
  phone?: string;
  gstin?: string;
  logoUrl?: string;
  billNo?: string;
  issuedAt?: string;
}) {
  const [people, setPeople] = useState(1);
  const share = people > 1 ? Math.ceil((total / people) * 100) / 100 : total;
  const payment = describePayments(payments);
  const amount = payment.amount > 0 ? payment.amount : total;
  const cgst = Math.round((tax / 2) * 100) / 100;
  const sgst = Math.round((tax - cgst) * 100) / 100;
  const when = issuedAt || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const receiptHtml = () => {
    const rows = lines.length
      ? lines
          .map(
            (line, index) => `<tr>
              <td class="num">${index + 1}</td>
              <td><strong>${escapeHtml(line.name)}</strong>${line.note ? `<div class="note">${escapeHtml(line.note)}</div>` : ''}</td>
              <td class="qty">${line.quantity}</td>
              <td class="amt">${money(line.amount)}</td>
            </tr>`,
          )
          .join('')
      : '<tr><td colspan="4" class="empty">No items yet.</td></tr>';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(businessName || 'Qfast')} bill ${escapeHtml(billNo || '')}</title>
  <style>
    @page { size: A5; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f1ec; color: #1c1917; font-family: "Segoe UI", Inter, Arial, sans-serif; }
    .toolbar { max-width: 420px; margin: 16px auto 0; display: flex; justify-content: flex-end; }
    .toolbar button { border: 0; background: #1c1917; color: white; border-radius: 10px; padding: 10px 14px; font-weight: 700; }
    .sheet { max-width: 420px; margin: 12px auto 28px; background: white; padding: 28px 24px 22px; border: 1px solid #e7e5e4; }
    .brand { display: flex; gap: 12px; align-items: center; }
    .brand img { width: 52px; height: 52px; object-fit: cover; border-radius: 10px; }
    h1 { margin: 0; font-size: 22px; letter-spacing: -0.03em; }
    .meta { margin: 4px 0 0; color: #57534e; font-size: 12px; line-height: 1.5; }
    .rule { height: 1px; background: #e7e5e4; margin: 16px 0; }
    .kicker { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .kicker p { margin: 0; }
    .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #c2410c; }
    .status { border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; }
    .paid { background: #ecfdf3; color: #047857; }
    .due { background: #fff7ed; color: #c2410c; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #78716c; padding: 0 0 8px; border-bottom: 1px solid #1c1917; }
    td { padding: 10px 0; border-bottom: 1px solid #f5f5f4; vertical-align: top; }
    th.num, td.num, th.qty, td.qty { width: 36px; text-align: center; }
    th.amt, td.amt { text-align: right; white-space: nowrap; }
    .note { margin-top: 2px; color: #78716c; font-size: 11px; font-weight: 500; }
    .empty { color: #78716c; text-align: center; padding: 16px 0; }
    .totals { margin-top: 8px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #44403c; }
    .grand { margin-top: 6px; padding-top: 8px; border-top: 2px solid #1c1917; font-size: 18px; font-weight: 800; color: #1c1917; }
    .foot { margin-top: 18px; text-align: center; color: #78716c; font-size: 11px; line-height: 1.5; }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .sheet { margin: 0; max-width: none; border: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="window.print()">Save as PDF</button></div>
  <article class="sheet">
    <div class="brand">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" />` : ''}
      <div>
        <h1>${escapeHtml(businessName || 'Qfast')}</h1>
        <p class="meta">${[address, phone, gstin ? `GSTIN ${gstin}` : ''].filter(Boolean).map((part) => escapeHtml(String(part))).join('<br>')}</p>
      </div>
    </div>
    <div class="rule"></div>
    <div class="kicker">
      <div>
        <p class="eyebrow">${escapeHtml(title)}</p>
        <p><strong>${escapeHtml(detail || 'Guest bill')}</strong></p>
        <p class="meta">${billNo ? `Bill ${escapeHtml(billNo)}<br>` : ''}${escapeHtml(when)}</p>
      </div>
      <span class="status ${payment.paid ? 'paid' : 'due'}">${payment.paid ? 'PAID' : 'DUE'}</span>
    </div>
    <div class="rule"></div>
    <table>
      <thead><tr><th class="num">#</th><th>Item</th><th class="qty">Qty</th><th class="amt">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <div><span>CGST 2.5%</span><span>${money(cgst)}</span></div>
      <div><span>SGST 2.5%</span><span>${money(sgst)}</span></div>
      <div class="grand"><span>Total</span><span>${money(total)}</span></div>
      <div><span>${escapeHtml(payment.methods)}</span><span>${money(amount)}</span></div>
      ${people > 1 ? `<div><span>Split ${people} ways</span><span>${money(share)} each</span></div>` : ''}
    </div>
    <p class="foot">Thank you for visiting.<br>This bill was issued by ${escapeHtml(businessName || 'the restaurant')} through Qfast.</p>
  </article>
</body>
</html>`;
  };

  const download = () => {
    const html = receiptHtml();
    const preview = window.open('', 'qfast-bill');
    if (preview) {
      preview.document.open();
      preview.document.write(html);
      preview.document.close();
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileStamp(downloadName)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 text-left shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {logoUrl && <img src={logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-orange-700">
              <Receipt className="h-3.5 w-3.5" />
              {title}
            </p>
            {businessName && <p className="mt-1 truncate text-base font-black text-stone-950">{businessName}</p>}
            {address && <p className="text-xs leading-5 text-stone-500">{address}</p>}
            {(phone || gstin) && (
              <p className="text-xs text-stone-500">{[phone, gstin ? `GSTIN ${gstin}` : ''].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={download}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-stone-950 px-3 text-xs font-bold text-white"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 border-y border-stone-100 py-3">
        <div>
          {detail && <p className="text-sm font-bold text-stone-950">{detail}</p>}
          <p className="text-xs text-stone-500">{[billNo && `Bill ${billNo}`, when].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide ${payment.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
          {payment.paid ? 'PAID' : 'DUE'}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <th className="pb-2 text-left font-bold">Item</th>
              <th className="pb-2 text-center font-bold">Qty</th>
              <th className="pb-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-stone-100">
                <td className="py-2.5 pr-3">
                  <p className="font-semibold text-stone-950">{line.name}</p>
                  {line.note && <p className="text-xs text-stone-500">{line.note}</p>}
                </td>
                <td className="py-2.5 text-center font-semibold text-stone-700">{line.quantity}</td>
                <td className="py-2.5 text-right font-bold text-stone-950">{money(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && <p className="py-3 text-sm text-stone-500">No items yet.</p>}
      </div>

      <div className="mt-2 space-y-1 border-t border-stone-200 pt-3 text-sm text-stone-600">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="flex justify-between"><span>CGST 2.5%</span><span>{money(cgst)}</span></div>
        <div className="flex justify-between"><span>SGST 2.5%</span><span>{money(sgst)}</span></div>
        <div className="flex justify-between border-t border-stone-900 pt-2 text-lg font-black text-stone-950">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
        <p className="pt-1 text-xs font-semibold text-stone-500">{payment.methods} · {money(amount)}</p>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-stone-50 px-3 py-2">
        <span className="text-xs font-bold text-stone-600">Split the bill</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPeople((count) => Math.max(1, count - 1))} className="rounded-lg border border-stone-200 bg-white p-1.5" aria-label="Fewer people">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-16 text-center text-xs font-black text-stone-900">{people === 1 ? 'Just me' : `${people} people`}</span>
          <button type="button" onClick={() => setPeople((count) => Math.min(12, count + 1))} className="rounded-lg border border-stone-200 bg-white p-1.5" aria-label="More people">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {people > 1 && <p className="mt-2 text-center text-sm font-black text-orange-700">{money(share)} each</p>}
    </div>
  );
}
