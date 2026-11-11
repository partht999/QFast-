export function feedbackSummary(count: number, average: number | null) {
  if (!count || average == null || !Number.isFinite(average)) {
    return { averageRating: null as number | null, totalCount: 0 };
  }
  return { averageRating: Math.round(average * 10) / 10, totalCount: count };
}

export function assertFeedbackEligible(input: {
  order: { id: string; businessId: string; status: string; customerPhone: string | null } | null;
  businessId: string;
  phone?: string | null;
  orderPhone?: string | null;
}) {
  if (!input.order || input.order.businessId !== input.businessId) {
    throw new Error('That order is not from this business.');
  }
  if (input.order.status !== 'COMPLETED') {
    throw new Error('Feedback opens after the order is completed.');
  }
  if (input.phone && input.orderPhone && input.phone !== input.orderPhone) {
    throw new Error('This feedback does not match the order.');
  }
  return `order:${input.order.id}`;
}
