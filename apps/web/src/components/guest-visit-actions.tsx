'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { describePayments, type PaymentLike } from '@/lib/payment';
import { readApiError } from '@/lib/read-api-error';

type VisitOrder = {
  id: string;
  status: string;
  payments?: PaymentLike[];
};

export function GuestVisitActions({
  apiUrl,
  orders,
  onChanged,
  canClose = false,
  onWaiter,
}: {
  apiUrl: string;
  orders: VisitOrder[];
  onChanged: () => void;
  canClose?: boolean;
  onWaiter?: () => void;
}) {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const openOrders = orders.filter((order) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status));
  const payments = openOrders.flatMap((order) => order.payments || []);
  const payment = describePayments(payments);
  const cooking = openOrders.some((order) => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status));
  const readyToClose = canClose && openOrders.length > 0 && payment.paid && !cooking;

  const pay = async (method: 'CASH' | 'UPI_AT_COUNTER') => {
    const due = openOrders.filter((order) => !describePayments(order.payments).paid);
    if (!due.length) return;
    setBusy(method);
    setMessage('');
    try {
      for (const order of due) {
        const response = await fetch(`${apiUrl}/api/v1/orders/public/${order.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(readApiError(data, 'Could not record this payment'));
      }
      setMessage(method === 'CASH' ? 'Cash payment recorded.' : 'UPI payment recorded.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not record this payment');
    } finally {
      setBusy('');
    }
  };

  const closeBill = async () => {
    setBusy('close');
    setMessage('');
    try {
      for (const order of openOrders) {
        const response = await fetch(`${apiUrl}/api/v1/orders/public/${order.id}/close`, { method: 'POST' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(readApiError(data, 'Could not close the bill'));
      }
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not close the bill');
    } finally {
      setBusy('');
    }
  };

  if (!openOrders.length) return null;

  return (
    <div className="space-y-3 rounded-3xl border border-neutral-200 bg-white p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Payment</p>
        <p className={`text-sm font-black ${payment.paid ? 'text-emerald-700' : 'text-amber-800'}`}>{payment.label}</p>
      </div>
      {!payment.paid && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void pay('UPI_AT_COUNTER')}
            className="min-h-11 rounded-xl bg-orange-500 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy === 'UPI_AT_COUNTER' ? 'Saving…' : 'Pay by UPI'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void pay('CASH')}
            className="min-h-11 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-800 disabled:opacity-60"
          >
            {busy === 'CASH' ? 'Saving…' : 'Pay by cash'}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {onWaiter && (
          <button type="button" onClick={onWaiter} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-bold text-neutral-800">
            <Bell className="h-4 w-4 text-orange-600" />
            Call waiter
          </button>
        )}
        {canClose && (
          <button
            type="button"
            disabled={!readyToClose || !!busy}
            onClick={() => void closeBill()}
            className="inline-flex min-h-11 items-center rounded-xl bg-neutral-950 px-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy === 'close' ? 'Closing…' : 'Close bill'}
          </button>
        )}
      </div>
      {canClose && !readyToClose && (
        <p className="text-xs leading-5 text-neutral-500">
          {cooking ? 'The kitchen is still working. You can pay now and close the bill when the food is ready.' : 'Pay the bill, then close it.'}
        </p>
      )}
      {!canClose && (
        <p className="text-xs leading-5 text-neutral-500">You can pay here. The restaurant closes the bill when the visit is finished.</p>
      )}
      {message && <p className="text-sm font-semibold text-neutral-800">{message}</p>}
    </div>
  );
}
