export type BillPayment = {
  status: string;
  method?: string | null;
  amount?: unknown;
};

export function counterMethod(method?: string | null): 'CASH' | 'CARD_AT_COUNTER' | 'UPI_AT_COUNTER' {
  if (method === 'CASH' || method === 'CARD_AT_COUNTER' || method === 'UPI_AT_COUNTER') return method;
  return 'UPI_AT_COUNTER';
}

export function paidTotal(payments: BillPayment[]) {
  return Math.round(
    payments
      .filter((payment) => payment.status === 'PAID')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0) * 100,
  ) / 100;
}

export function billDueReason(totalAmount: number, payments: BillPayment[]) {
  const total = Math.round(Number(totalAmount || 0) * 100) / 100;
  const open = payments.filter((payment) => payment.status === 'PENDING' || payment.status === 'FAILED');
  if (open.length || paidTotal(payments) + 0.009 < total) {
    return 'Collect the bill at the counter before closing it.';
  }
  return null;
}
