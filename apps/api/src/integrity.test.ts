const assert = require('node:assert/strict');
import { ConflictException } from '@nestjs/common';
import { businessDayRange, localDate, zonedStartUtc } from './common/time';
import { duplicatePhoneGroups, normalizePhone, phoneLookupVariants } from './common/phone';
import { resolveCustomer } from './common/customer-identity';
import { loyaltyAward, loyaltySourceKey } from './modules/loyalty/award';
import { orderTotals, priceCatalogLine } from './modules/orders/pricing';
import { reconcilePayments } from './modules/orders/payment-ledger';
import { containsSecretKey, parsePartnerOrder, partnerPayloadForStorage, secretsEqual } from './modules/orders/partner-webhook';
import { createTableSessionLock, tableSessionDecision } from './modules/orders/table-session';
import { assertFeedbackEligible, feedbackSummary } from './modules/reviews/feedback-rules';
import { CURRENT_SIGNUP_PLAN_TIER, CURRENT_TRIAL_DAYS } from './modules/business/subscription-policy';
import {
  allocateDailyToken,
  assertQueueJoinable,
  createLockedAllocator,
  createRacyAllocator,
  resolvePartySize,
} from './modules/queue/token-sequence';

const tests: [string, () => void | Promise<void>][] = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push([name, fn]);
}

test('concurrent locked joins get unique daily tokens', async () => {
  const allocator = createLockedAllocator();
  const numbers = await Promise.all(
    Array.from({ length: 25 }, (_, index) => allocator.join('2026-11-11', `+9198000000${String(index).padStart(2, '0')}`)),
  );
  assert.equal(new Set(numbers).size, 25);
  assert.deepEqual([...numbers].sort((a, b) => a - b), Array.from({ length: 25 }, (_, index) => index + 1));
});

test('a racy read-modify-write allocator collides, so uniqueness is not assumed from sequential calls', async () => {
  const allocator = createRacyAllocator();
  const numbers = await Promise.all(
    Array.from({ length: 20 }, (_, index) => allocator.join('2026-11-11', `phone-${index}`)),
  );
  assert.ok(new Set(numbers).size < numbers.length);
});

test('the same phone cannot hold two active tokens, and the daily sequence resets on the business date', async () => {
  const allocator = createLockedAllocator();
  await allocator.join('2026-11-10', '+919876543210');
  await assert.rejects(() => allocator.join('2026-11-10', '+919876543210'), /ACTIVE_DUPLICATE/);
  await allocator.release('+919876543210');
  const nextDay = await allocator.join('2026-11-11', '+919876543210');
  assert.equal(nextDay, 1);
});

test('Indian midnight and DST boundaries use the business timezone', () => {
  assert.equal(localDate(new Date('2026-11-10T18:29:59.000Z'), 'Asia/Kolkata'), '2026-11-10');
  assert.equal(localDate(new Date('2026-11-10T18:30:00.000Z'), 'Asia/Kolkata'), '2026-11-11');
  const kolkata = businessDayRange('Asia/Kolkata', new Date('2026-11-10T18:30:00.000Z'));
  assert.equal(kolkata.date, '2026-11-11');
  assert.equal(kolkata.start.toISOString(), '2026-11-10T18:30:00.000Z');
  assert.equal(kolkata.end.toISOString(), '2026-11-11T18:30:00.000Z');
  assert.equal(zonedStartUtc('2026-11-01', 'America/New_York').toISOString(), '2026-11-01T04:00:00.000Z');
  assert.equal(zonedStartUtc('2026-11-02', 'America/New_York').toISOString(), '2026-11-02T05:00:00.000Z');
  const state = { lastSequenceDate: '2026-11-10', dailySequence: 8 };
  assert.equal(allocateDailyToken(state, localDate(new Date('2026-11-10T18:30:00.000Z'), 'Asia/Kolkata')), 1);
});

test('public queue rules reject staff impersonation, a closed queue, and an unreasonable party', () => {
  assert.throws(() => assertQueueJoinable({ isOpen: true, isPaused: false, remoteJoinEnabled: false }, 'REMOTE'), /disabled/);
  assert.throws(() => assertQueueJoinable({ isOpen: false, isPaused: false, remoteJoinEnabled: true }, 'WALK_IN'), /closed/);
  assert.equal(resolvePartySize('CLINIC', 6), 1);
  assert.throws(() => resolvePartySize('RESTAURANT', 21), /20/);
});

test('equivalent Indian phone formats share one canonical value', () => {
  const canonical = '+919876543210';
  for (const value of ['9876543210', '09876543210', '+91 98765 43210', '919876543210']) {
    assert.equal(normalizePhone(value), canonical);
  }
  assert.equal(normalizePhone('+1 415 555 2671'), '+14155552671');
  assert.ok(phoneLookupVariants(canonical).includes('9876543210'));
  const groups = duplicatePhoneGroups([
    { id: 'a', phone: '9876543210' },
    { id: 'b', phone: '+91 98765-43210' },
    { id: 'c', phone: '+14155552671' },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].rows.length, 2);
});

test('customer lookup does not merge ambiguous duplicates', async () => {
  const rows = [
    { id: 'legacy-1', phone: '9876543210', name: 'A' },
    { id: 'legacy-2', phone: '09876543210', name: 'B' },
  ];
  const db = {
    customer: {
      findMany: async () => rows,
      update: async () => rows[0],
      create: async () => {
        throw new Error('should not create');
      },
    },
  };
  await assert.rejects(() => resolveCustomer(db, '9876543210', 'C'), ConflictException);
});

test('a single legacy phone is reused and not rewritten', async () => {
  const updates: unknown[] = [];
  const row = { id: 'legacy', phone: '9876543210', name: 'Aarav' };
  const db = {
    customer: {
      findMany: async () => [row],
      update: async (args: unknown) => {
        updates.push(args);
        return row;
      },
      create: async () => {
        throw new Error('should not create');
      },
    },
  };
  const found = await resolveCustomer(db, '+919876543210', 'Aarav');
  assert.equal(found.id, 'legacy');
  assert.equal(updates.length, 0);
});

test('order completion keeps the saved loyalty type and does not mix stamps with points', () => {
  const stamps = { type: 'VISIT_STAMPS', stampsPerVisit: 2, pointsPerRupee: 1 };
  assert.deepEqual(loyaltyAward(stamps, 500), { kind: 'stamps', amount: 2 });
  assert.equal(stamps.type, 'VISIT_STAMPS');
  const points = { type: 'POINTS_PER_RUPEE', stampsPerVisit: 1, pointsPerRupee: 0.1 };
  assert.deepEqual(loyaltyAward(points, 250), { kind: 'points', amount: 25 });
  assert.equal(points.type, 'POINTS_PER_RUPEE');
  assert.equal(loyaltySourceKey('VISIT_STAMPS', 'token:1', 'order-1'), 'token:1');
  assert.equal(loyaltySourceKey('POINTS_PER_RUPEE', 'token:1', 'order-1'), 'points:order-1');
  assert.equal(loyaltyAward({ type: 'POINTS_PER_RUPEE', pointsPerRupee: 1 }, 0), null);
});

test('confirmed payments stay put and a later item only adds the outstanding amount', () => {
  const paid = { id: 'paid-1', status: 'PAID', amount: 100 };
  const pending = { id: 'pending-1', status: 'PENDING', amount: 100 };
  const plan = reconcilePayments({ totalAmount: 150, payments: [paid, pending], markPaid: false });
  assert.equal(plan.action, 'set-obligation');
  if (plan.action !== 'set-obligation') return;
  assert.equal(plan.pendingId, 'pending-1');
  assert.equal(plan.amount, 50);
  assert.equal(JSON.stringify(plan).includes('paid-1'), false);
  const settled = reconcilePayments({ totalAmount: 100, payments: [paid], markPaid: true });
  assert.equal(settled.action, 'noop');
});

test('prices come from the menu, including a variant, add-ons, quantity, and the item tax rate', () => {
  const catalog = {
    id: 'dish',
    price: 100,
    taxRate: 5,
    variants: [{ id: 'large', name: 'Large', price: 150 }],
    addons: [{ id: 'cheese', name: 'Cheese', price: 20, maxSelect: 1 }],
  };
  const line = priceCatalogLine(catalog, { quantity: 2, variantId: 'large', addonIds: ['cheese'] });
  assert.equal(line.unitPrice, 150);
  assert.equal(line.totalPrice, 340);
  assert.equal(line.taxAmount, 17);
  const totals = orderTotals([line], 0);
  assert.equal(totals.taxAmount, 17);
  assert.equal(totals.totalAmount, 357);
  assert.throws(() => priceCatalogLine(catalog, { quantity: 1, variantId: 'other-dish' }), /not available/);
  assert.throws(() => priceCatalogLine({ ...catalog, price: -1 }, { quantity: 1 }), /invalid/i);
});

test('one open table bill is shared, and a closed bill rejects new items under concurrency', async () => {
  assert.equal(tableSessionDecision(null), 'create');
  assert.equal(tableSessionDecision({ status: 'PREPARING' }), 'append');
  assert.equal(tableSessionDecision({ status: ' open ' }), 'append');
  assert.equal(tableSessionDecision({ status: 'COMPLETED' }), 'closed');
  assert.equal(tableSessionDecision({ status: ' completed ' }), 'closed');
  const sessions = createTableSessionLock();
  const arrivals = await Promise.all([sessions.place(), sessions.place(), sessions.place()]);
  assert.equal(arrivals.filter((row) => row.action === 'create').length, 1);
  assert.equal(arrivals.filter((row) => row.action === 'append').length, 2);
  assert.equal(new Set(arrivals.map((row) => row.orderId)).size, 1);
  await sessions.complete();
  await assert.rejects(() => sessions.place(), /CLOSED/);
});

test('partner webhooks validate the payload, compare secrets without storing them, and reject unknown dishes by schema', () => {
  assert.equal(secretsEqual('kitchen-secret', 'kitchen-secret'), true);
  assert.equal(secretsEqual('kitchen-secret', 'other-secret'), false);
  const order = parsePartnerOrder({
    provider: 'SWIGGY',
    secret: 'kitchen-secret',
    externalId: 'ext-1',
    items: [{ name: 'Dosa', quantity: 2, price: 80 }],
  });
  const stored = partnerPayloadForStorage(order);
  assert.equal(containsSecretKey(stored), false);
  assert.equal(stored.externalId, 'ext-1');
  assert.throws(() => parsePartnerOrder({ provider: 'UNKNOWN', externalId: 'x', items: [] }), /provider/);
  assert.throws(() => parsePartnerOrder({ provider: 'ZOMATO', externalId: 'x', items: [{ name: 'Dosa', quantity: 0, price: 10 }] }), /Quantity/);
});

test('feedback is empty until a completed order for that business exists', () => {
  assert.deepEqual(feedbackSummary(0, null), { averageRating: null, totalCount: 0 });
  assert.throws(
    () => assertFeedbackEligible({ order: null, businessId: 'biz', phone: null, orderPhone: null }),
    /not from this business/,
  );
  assert.throws(
    () => assertFeedbackEligible({
      order: { id: 'o1', businessId: 'biz', status: 'PREPARING', customerPhone: '+919876543210' },
      businessId: 'biz',
      phone: '+919876543210',
      orderPhone: '+919876543210',
    }),
    /completed/,
  );
  assert.equal(
    assertFeedbackEligible({
      order: { id: 'o1', businessId: 'biz', status: 'COMPLETED', customerPhone: '+919876543210' },
      businessId: 'biz',
      phone: '+919876543210',
      orderPhone: '+919876543210',
    }),
    'order:o1',
  );
});

test('signup still starts the existing 30-day Advanced trial', () => {
  assert.equal(CURRENT_SIGNUP_PLAN_TIER, 'ADVANCED');
  assert.equal(CURRENT_TRIAL_DAYS, 30);
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`ok ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }
  if (failed) process.exit(1);
})();
