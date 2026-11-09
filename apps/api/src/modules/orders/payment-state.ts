import { PaymentMethod } from '@prisma/client';

const COUNTER_METHODS = new Set<PaymentMethod>([
  PaymentMethod.CASH,
  PaymentMethod.CARD_AT_COUNTER,
  PaymentMethod.UPI_AT_COUNTER,
]);

export function isCounterPayment(method?: string | null) {
  return !!method && COUNTER_METHODS.has(method as PaymentMethod);
}

export function unpaidReason(payments: { status: string; method: string }[]) {
  const pending = payments.filter((payment) => payment.status === 'PENDING');
  if (!pending.length && payments.length > 0) return null;
  if (!payments.length || pending.some((payment) => isCounterPayment(payment.method) || !payment.method)) {
    return 'Mark the counter bill paid before closing it.';
  }
  if (pending.some((payment) => payment.method === 'RAZORPAY_ONLINE')) {
    return 'Online payment has not been captured yet.';
  }
  return 'This payment has not been collected yet.';
}
