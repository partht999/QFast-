export const DEFAULT_PREP_MINUTES = 12;
/** Fire this many minutes earlier than the cooking time so the food is hot, not late. */
export const FIRE_BUFFER_MINUTES = 3;
/** For clinics, salons and service centres: warn the guest this long before travel grace runs out. */
export const TURN_SOON_BUFFER_MINUTES = 5;

export function prepLeadMinutes(prepTimes: Array<number | null | undefined>) {
  const known = prepTimes.filter((t): t is number => typeof t === 'number' && t > 0);
  return Math.max(DEFAULT_PREP_MINUTES, ...known);
}

/** True when the guest's wait is short enough that the kitchen must start now. */
export function shouldFire(etaMinutes: number, prepMinutes: number) {
  return etaMinutes <= prepMinutes + FIRE_BUFFER_MINUTES;
}
