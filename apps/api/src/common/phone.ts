const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export class InvalidPhoneError extends Error {
  constructor() {
    super('Enter a valid phone number');
    this.name = 'InvalidPhoneError';
  }
}

/**
 * Canonical customer phone.
 * Indian mobiles (10 digits starting 6-9, with optional 0 or 91) become +91XXXXXXXXXX.
 * Other supported numbers become E.164 with a leading +.
 */
export function normalizePhone(input?: string | null) {
  const raw = (input || '').trim().replace(/[\s().-]/g, '');
  if (!raw) throw new InvalidPhoneError();
  const international = raw.startsWith('+') || raw.startsWith('00');
  const digits = (raw.startsWith('00') ? raw.slice(2) : raw).replace(/\D/g, '');
  if (!digits) throw new InvalidPhoneError();

  if (!international && digits.length === 10 && INDIAN_MOBILE.test(digits)) return `+91${digits}`;
  if (!international && digits.length === 11 && digits.startsWith('0') && INDIAN_MOBILE.test(digits.slice(1))) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && INDIAN_MOBILE.test(digits.slice(2))) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  throw new InvalidPhoneError();
}

export function isIndianMobile(phone: string) {
  return /^\+91[6-9]\d{9}$/.test(phone);
}

/** Formats that can already exist for one canonical number. Not a merge of different numbers. */
export function phoneLookupVariants(canonical: string) {
  const variants = new Set<string>([canonical]);
  const digits = canonical.replace(/\D/g, '');
  variants.add(digits);
  if (isIndianMobile(canonical)) {
    const local = digits.slice(-10);
    variants.add(local);
    variants.add(`0${local}`);
    variants.add(`91${local}`);
    variants.add(`+91${local}`);
  }
  return [...variants];
}

export type PhoneRow = { id: string; phone: string };

/** Groups stored phones that normalize to the same number. Reporting only — nothing is merged. */
export function duplicatePhoneGroups(customers: PhoneRow[]) {
  const groups = new Map<string, PhoneRow[]>();
  for (const customer of customers) {
    let canonical: string;
    try {
      canonical = normalizePhone(customer.phone);
    } catch {
      continue;
    }
    const rows = groups.get(canonical) || [];
    rows.push(customer);
    groups.set(canonical, rows);
  }
  return [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([phone, rows]) => ({ phone, rows }));
}
