import { roundMoney } from './pricing';

export type LedgerPayment = {
  id: string;
  status: string;
  amount?: unknown;
};

const CONFIRMED = new Set(['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED']);

export function paidTotal(payments: Array<{ status: string; amount?: unknown }>) {
  return roundMoney(
    payments
      .filter((payment) => payment.status === 'PAID')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
  );
}

export function outstandingAmount(totalAmount: number, payments: Array<{ status: string; amount?: unknown }>) {
  return roundMoney(roundMoney(totalAmount) - paidTotal(payments));
}

export type PaymentReconciliation =
  | { action: 'noop' }
  | { action: 'clear-pending'; pendingIds: string[] }
  | {
      action: 'set-obligation';
      pendingId: string | null;
      retirePendingIds: string[];
      amount: number;
      markPaid: boolean;
    };

/**
 * Confirmed payments are never included in the rows that can change.
 * A new or existing pending row covers only the amount still outstanding.
 */
export function reconcilePayments(input: {
  totalAmount: number;
  payments: LedgerPayment[];
  markPaid: boolean;
}): PaymentReconciliation {
  const outstanding = outstandingAmount(input.totalAmount, input.payments);
  if (outstanding < -0.009) {
    throw new Error('Confirmed payments already exceed the bill. They were left unchanged.');
  }
  const pending = input.payments.filter((payment) => payment.status === 'PENDING' || payment.status === 'FAILED');
  const confirmedIds = new Set(input.payments.filter((payment) => CONFIRMED.has(payment.status)).map((payment) => payment.id));
  for (const row of pending) {
    if (confirmedIds.has(row.id)) throw new Error('Confirmed payment was selected for update.');
  }
  if (outstanding <= 0.009) {
    if (!pending.length) return { action: 'noop' };
    return { action: 'clear-pending', pendingIds: pending.map((payment) => payment.id) };
  }
  return {
    action: 'set-obligation',
    pendingId: pending[0]?.id || null,
    retirePendingIds: pending.slice(1).map((payment) => payment.id),
    amount: outstanding,
    markPaid: input.markPaid,
  };
}
