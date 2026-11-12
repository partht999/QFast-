'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { describePayments, type PaymentLike } from '@/lib/payment';
import { readApiError } from '@/lib/read-api-error';

type VisitOrder = {
  id: string;
  status: string;
  totalAmount?: number | string | null;
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
  const dueTotal = openOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const payment = describePayments(payments, openOrders.every((order) => order.totalAmount != null) ? dueTotal : undefined);
  const dueLabel = dueTotal > 0 ? `₹${dueTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
  const cooking = openOrders.some((order) => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status));
  const readyToClose = canClose && openOrders.length > 0 && payment.paid && !cooking;

  const askForBill = async () => {
    if (!openOrders.length) return;
    setBusy('bill');
    setMessage('');
    try {
      for (const order of openOrders) {
        const response = await fetch(`${apiUrl}/api/v1/orders/public/${order.id}/help`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'bill' }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(readApiError(data, 'Could not ask for the bill'));
      }
      setMessage('The counter has been asked to take payment.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not ask for the bill');
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
        <p className={`text-sm font-black ${payment.paid ? 'text-emerald-700' : 'text-amber-800'}`}>
          {payment.label}{dueLabel ? ` · ${dueLabel}` : ''}
        </p>
      </div>
      {!payment.paid && (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void askForBill()}
          className="ui-btn-primary w-full"
        >
          {busy === 'bill' ? 'Sending…' : 'Ask the counter to take payment'}
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        {onWaiter && (
          <button type="button" onClick={onWaiter} className="ui-btn-secondary">
            <Bell className="h-4 w-4 text-orange-600" />
            Call waiter
          </button>
        )}
        {canClose && (
          <button
            type="button"
            disabled={!readyToClose || !!busy}
            onClick={() => void closeBill()}
            className="ui-btn bg-neutral-950 text-white hover:bg-neutral-800"
          >
            {busy === 'close' ? 'Closing…' : 'Close bill'}
          </button>
        )}
      </div>
      <p className="text-xs leading-5 text-neutral-500">
        {payment.paid
          ? canClose
            ? cooking
              ? 'The kitchen is still working. Close the bill when the food is ready.'
              : 'The counter confirmed payment. You can close the bill.'
            : 'The counter confirmed payment. The restaurant closes the visit.'
          : 'The counter confirms payment. This page cannot mark the bill paid.'}
      </p>
      {message && <p className="text-sm font-semibold text-neutral-800">{message}</p>}
    </div>
  );
}
