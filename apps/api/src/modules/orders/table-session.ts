const CLOSED = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
const OPEN_LIKE = new Set(['OPEN', 'PENDING', 'ACTIVE', 'IN_PROGRESS', 'CONFIRMED']);

function normalizeStatus(value?: string | null) {
  return String(value ?? '').trim().toUpperCase();
}

/**
 * Current table policy: one open bill per table.
 * A second guest at that table is added to the open bill.
 * A closed bill cannot take new items. Whether a second phone should start
 * a separate bill is not decided here.
 */
export function tableSessionDecision(open: { status?: string | null } | null): 'create' | 'append' | 'closed' {
  if (!open) return 'create';

  const status = normalizeStatus(open.status);
  if (!status || OPEN_LIKE.has(status)) return 'append';
  if (CLOSED.has(status)) return 'closed';

  return 'append';
}

export function createTableSessionLock() {
  let open: { id: string; status: string } | null = null;
  let chain = Promise.resolve();
  const run = <T>(fn: () => T) => {
    let release: () => void = () => undefined;
    const gate = chain;
    chain = new Promise<void>((resolve) => {
      release = resolve;
    });
    return gate.then(fn).finally(release);
  };
  return {
    place() {
      return run(() => {
        const decision = tableSessionDecision(open);
        if (decision === 'closed') throw new Error('CLOSED');
        if (!open) {
          open = { id: 'order-1', status: 'PENDING' };
          return { action: 'create' as const, orderId: open.id };
        }
        return { action: 'append' as const, orderId: open.id };
      });
    },
    complete() {
      return run(() => {
        if (open) open = { id: open.id, status: 'COMPLETED' };
      });
    },
  };
}
