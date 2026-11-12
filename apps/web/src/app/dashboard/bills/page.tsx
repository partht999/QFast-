'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { describePayments } from '@/lib/payment';
import { lineName } from '@/lib/order-line';
import { readApiError } from '@/lib/read-api-error';
import { useToast } from '@/components/ui/toast';

function whereLabel(order: any) {
  if (order.table?.name) return order.table.name;
  if (order.queueToken?.tokenNumber) return `Queue #${order.queueToken.tokenNumber}`;
  if (order.source === 'TAKEAWAY') return 'Takeaway';
  return 'Order';
}

function kitchenLabel(order: any) {
  if (order.servedAt) return 'Served';
  if (order.status === 'READY') return 'Ready';
  return 'In the kitchen';
}

export default function BillsPage() {
  const router = useRouter();
  const toast = useToast();
  const apiUrl = getApiUrl();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    const businessResponse = await fetch(`${apiUrl}/api/v1/business`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (businessResponse.status === 401) {
      router.replace('/auth/login');
      return;
    }
    const businesses = await businessResponse.json();
    const business = Array.isArray(businesses) ? businesses[0] : null;
    if (!business) {
      setOrders([]);
      return;
    }
    const response = await fetch(`${apiUrl}/api/v1/orders/bills/${business.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(readApiError(body, 'Could not load bills'));
    }
    setOrders(await response.json());
  }, [apiUrl, router]);

  useEffect(() => {
    load()
      .catch((error) => toast.error('Bills', error instanceof Error ? error.message : 'Could not load bills'))
      .finally(() => setLoading(false));
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [load, toast]);

  const act = async (orderId: string, path: 'pay' | 'close') => {
    const token = localStorage.getItem('accessToken');
    setWorkingId(orderId);
    try {
      const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}/${path}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(body, path === 'pay' ? 'Could not mark this paid' : 'Could not close this bill'));
      toast.success(path === 'pay' ? 'Marked paid' : 'Bill closed');
      await load();
    } catch (error) {
      toast.error('Bill', error instanceof Error ? error.message : 'Try again');
    } finally {
      setWorkingId('');
    }
  };

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading bills…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="ui-title">Bills</h1>
        <p className="ui-copy">
          The kitchen marks food served. This screen is where the counter takes payment and closes the bill.
        </p>
      </div>
      {orders.length === 0 ? (
        <div className="ui-card px-5 py-10 text-center text-sm text-neutral-500">No open bills.</div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const payment = describePayments(order.payments, Number(order.totalAmount || 0));
            const served = Boolean(order.servedAt);
            const ready = order.status === 'READY' || served;
            return (
              <li key={order.id} className="ui-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-neutral-950">{whereLabel(order)}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {order.customerName || 'Guest'} · {kitchenLabel(order)} · {payment.paid ? 'Paid' : 'Due'}
                    </p>
                    <p className="mt-2 text-sm text-neutral-700">
                      {(order.items || []).map((item: any) => `${item.quantity}× ${lineName(item.menuItem?.name, item.addons)}`).join(', ')}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-neutral-950">₹{Number(order.totalAmount || 0).toFixed(0)}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!payment.paid && ready && (
                    <button type="button" disabled={workingId === order.id} onClick={() => void act(order.id, 'pay')} className="ui-btn-primary">
                      Mark paid
                    </button>
                  )}
                  {payment.paid && served && (
                    <button type="button" disabled={workingId === order.id} onClick={() => void act(order.id, 'close')} className="ui-btn-primary">
                      Close bill
                    </button>
                  )}
                  {!ready && <p className="text-sm text-neutral-500">Waiting for the kitchen to finish cooking.</p>}
                  {payment.paid && !served && <p className="text-sm text-neutral-500">Paid. Close the bill after the kitchen marks it served.</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
