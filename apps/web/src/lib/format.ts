/** "₹1,118" or "₹1,118.50": Indian digit grouping, paise only when present. */
export function rupees(value: unknown): string {
  const amount = Math.round((Number(value) || 0) * 100) / 100;
  const whole = Number.isInteger(amount);
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

/** "1 guest", "4 guests". */
export function guestsLabel(count: unknown): string {
  const n = Math.max(1, Number(count) || 1);
  return `${n} ${n === 1 ? 'guest' : 'guests'}`;
}

/** Splits a wait into a number and unit for display: 8 -> ["8", "min"], 176 -> ["2h 56m", ""], 120 -> ["2", "hr"]. */
export function waitParts(minutes: unknown): [string, string] {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total < 60) return [String(total), 'min'];
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? [`${hours}h ${rest}m`, ''] : [String(hours), hours === 1 ? 'hr' : 'hrs'];
}
