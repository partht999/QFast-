export type PaymentLike = {
  status?: string | null;
  method?: string | null;
  amount?: number | string | null;
};

const COUNTER = new Set(['CASH', 'CARD_AT_COUNTER', 'UPI_AT_COUNTER']);

export function isCounterPayment(method?: string | null) {
  return !!method && COUNTER.has(method);
}

export function paymentMethodLabel(method?: string | null) {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'CARD_AT_COUNTER':
      return 'Card at the counter';
    case 'UPI_AT_COUNTER':
      return 'UPI at the counter';
    case 'RAZORPAY_ONLINE':
      return 'Online';
    case 'LOYALTY_POINTS':
      return 'Loyalty points';
    default:
      return 'Counter';
  }
}

export function describePayments(payments?: PaymentLike[] | null) {
  const list = payments || [];
  const pending = list.filter((payment) => payment.status === 'PENDING' || payment.status === 'FAILED');
  const counterDue = pending.filter((payment) => !payment.method || isCounterPayment(payment.method));
  const onlineDue = pending.filter((payment) => payment.method && !isCounterPayment(payment.method));
  const amount = list.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const methods = [...new Set(list.map((payment) => paymentMethodLabel(payment.method)))].join(', ');
  const paid = list.length > 0 && pending.length === 0 && list.every((payment) => payment.status === 'PAID');

  let label = 'Pay at the counter';
  if (paid) label = 'Paid';
  else if (onlineDue.length && !counterDue.length) label = 'Pay online — not captured';
  else if (onlineDue.length && counterDue.length) label = 'Pay at the counter · online not captured';

  return {
    label,
    methods: methods || 'Counter',
    amount,
    paid,
    counterDue: counterDue.length > 0,
    onlineDue: onlineDue.length > 0,
  };
}
