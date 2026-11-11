import { createHash, timingSafeEqual } from 'crypto';
import { UserRole } from '@prisma/client';

export const STAFF_ROLES = {
  manager: [UserRole.OWNER, UserRole.MANAGER],
  floor: [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER],
  kitchen: [UserRole.OWNER, UserRole.MANAGER, UserRole.KITCHEN_STAFF, UserRole.CASHIER],
} as const;

export function roleIsAllowed(role: UserRole, allowed: readonly UserRole[]) {
  return allowed.includes(role);
}

export function hashGuestSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

export function guestSecretMatches(storedHash: string | null | undefined, secret: string | undefined) {
  if (!storedHash || !secret) return false;
  const actual = Buffer.from(hashGuestSecret(secret));
  const expected = Buffer.from(storedHash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function sanitizeRealtimePayload(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { type: 'update' };
  const source = data as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === 'customerPhone' || key === 'customerName' || key === 'notes' || key === 'guestSecret' || key === 'guestSecretHash') {
      continue;
    }
    if (key === 'token' || key === 'order') {
      next[key] = briefRecord(value);
      continue;
    }
    next[key] = value;
  }
  return next;
}

function briefRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
    tokenNumber: typeof row.tokenNumber === 'number' ? row.tokenNumber : undefined,
  };
}
