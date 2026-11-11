/**
 * Commercial policy currently shipped.
 * Signup always starts a 30-day Advanced trial. Plan marketing names are not applied here.
 * Change this only after an explicit product decision.
 */
export const CURRENT_SIGNUP_PLAN_TIER = 'ADVANCED' as const;
export const CURRENT_TRIAL_DAYS = 30;

export function trialEndsAt(from = new Date()) {
  return new Date(from.getTime() + CURRENT_TRIAL_DAYS * 24 * 60 * 60 * 1000);
}
