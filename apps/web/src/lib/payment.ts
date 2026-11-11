export type PaymentLike = {
  status?: string | null;
  method?: string | null;
  amount?: number | string | null;
};

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

export function describePayments(payments?: PaymentLike[] | null, totalAmount?: number) {
  const list = (payments || []).filter(
    (payment) => payment.status !== 'REFUNDED' && payment.status !== 'PARTIALLY_REFUNDED',
  );
  const pending = list.filter((payment) => payment.status !== 'PAID');
  const paidAmount = Math.round(
    list
      .filter((payment) => payment.status === 'PAID')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0) * 100,
  ) / 100;
  const total = totalAmount == null ? undefined : Math.round(Number(totalAmount) * 100) / 100;
  const covered = total == null ? list.length > 0 && pending.length === 0 : paidAmount + 0.009 >= total;
  const paid = covered && pending.length === 0 && (total == null || total >= 0);
  const methods = [...new Set(list.map((payment) => paymentMethodLabel(payment.method)))].join(', ');

  return {
    label: paid ? 'Paid' : 'Due at the counter',
    methods: methods || 'Counter',
    amount: total ?? paidAmount,
    paid,
    counterDue: !paid,
    onlineDue: false,
  };
}
