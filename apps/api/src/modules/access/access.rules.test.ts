const assert = require('node:assert/strict');
import { UserRole } from '@prisma/client';
import { billDueReason } from '../orders/payment-state';
import {
  STAFF_ROLES,
  guestSecretMatches,
  hashGuestSecret,
  roleIsAllowed,
  sanitizeRealtimePayload,
} from './access.rules';

const hash = hashGuestSecret('desk-secret');
assert.equal(guestSecretMatches(hash, 'desk-secret'), true);
assert.equal(guestSecretMatches(hash, 'other-secret'), false);
assert.equal(guestSecretMatches(hash, ''), false);
assert.equal(guestSecretMatches(null, 'desk-secret'), false);

assert.equal(roleIsAllowed(UserRole.KITCHEN_STAFF, STAFF_ROLES.manager), false);
assert.equal(roleIsAllowed(UserRole.WAITER, STAFF_ROLES.kitchen), false);
assert.equal(roleIsAllowed(UserRole.OWNER, STAFF_ROLES.manager), true);
assert.equal(roleIsAllowed(UserRole.CASHIER, STAFF_ROLES.kitchen), true);
assert.equal(roleIsAllowed(UserRole.WAITER, STAFF_ROLES.floor), true);

const event = sanitizeRealtimePayload({
  type: 'TOKEN_JOINED',
  customerPhone: '+919876543210',
  guestSecret: 'raw',
  token: { id: 'tok', status: 'WAITING', tokenNumber: 4, customerPhone: '999', customerName: 'Asha' },
}) as { customerPhone?: string; guestSecret?: string; token: { id?: string; status?: string; customerPhone?: string } };
assert.equal(event.customerPhone, undefined);
assert.equal(event.guestSecret, undefined);
assert.equal(event.token.customerPhone, undefined);
assert.equal(event.token.id, 'tok');
assert.equal(event.token.status, 'WAITING');

assert.ok(billDueReason(120, [{ status: 'PENDING', amount: 120 }]));
assert.equal(billDueReason(120, [{ status: 'PAID', amount: 120 }]), null);

console.log('ok guest secret, staff roles, realtime payload, and unpaid bills');
