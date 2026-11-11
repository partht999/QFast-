export type LoyaltyConfig = {
  type: 'VISIT_STAMPS' | 'POINTS_PER_RUPEE' | string;
  stampsPerVisit?: number | null;
  pointsPerRupee?: number | null;
};

export type LoyaltyAward =
  | { kind: 'stamps'; amount: number }
  | { kind: 'points'; amount: number };

/**
 * Reads the saved program. Does not change its type.
 * Stamps use stampsPerVisit. Points use pointsPerRupee on the order subtotal, rounded to the nearest point.
 * Tip and tax are not part of the points base.
 */
export function loyaltyAward(program: LoyaltyConfig, subtotal: number): LoyaltyAward | null {
  if (program.type === 'VISIT_STAMPS') {
    const stamps = program.stampsPerVisit ?? 1;
    if (!Number.isInteger(stamps) || stamps <= 0) return null;
    return { kind: 'stamps', amount: stamps };
  }
  if (program.type === 'POINTS_PER_RUPEE') {
    const rate = Number(program.pointsPerRupee || 0);
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(subtotal) || subtotal <= 0) return null;
    const points = Math.round(subtotal * rate);
    if (points <= 0) return null;
    return { kind: 'points', amount: points };
  }
  return null;
}

export function loyaltySourceKey(programType: string, visitKey: string, orderId?: string | null) {
  if (programType === 'POINTS_PER_RUPEE' && orderId) return `points:${orderId}`;
  return visitKey;
}
