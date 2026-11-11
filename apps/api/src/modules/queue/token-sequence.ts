export const ACTIVE_QUEUE_STATUSES = ['WAITING', 'CALLED', 'SEATED'] as const;

export type SequenceState = {
  lastSequenceDate: string | null;
  dailySequence: number;
};

/** Mirrors the locked queue-row update. Callers must hold the row lock first. */
export function allocateDailyToken(state: SequenceState, businessDate: string) {
  const next = state.lastSequenceDate !== businessDate ? 1 : state.dailySequence + 1;
  state.lastSequenceDate = businessDate;
  state.dailySequence = next;
  return next;
}

export function queuePhoneKey(queueId: string, phone: string, status: string) {
  if (!ACTIVE_QUEUE_STATUSES.includes(status as (typeof ACTIVE_QUEUE_STATUSES)[number])) return null;
  return `${queueId}:${phone}`;
}

export function assertQueueJoinable(queue: { isOpen: boolean; isPaused: boolean; remoteJoinEnabled: boolean }, source: 'REMOTE' | 'WALK_IN') {
  if (!queue.isOpen) throw new Error('This queue is currently closed');
  if (queue.isPaused) throw new Error('This queue is temporarily paused');
  if (source === 'REMOTE' && !queue.remoteJoinEnabled) {
    throw new Error('Remote queue joining is currently disabled for this queue');
  }
}

export function resolvePartySize(businessType: string, requested: number) {
  if (businessType !== 'RESTAURANT' && businessType !== 'CAFE') return 1;
  if (!Number.isInteger(requested) || requested < 1 || requested > 20) {
    throw new Error('Party size must be between 1 and 20.');
  }
  return requested;
}

type AllocatorState = SequenceState & { activePhones: Set<string>; issued: Set<string> };

/**
 * In-memory stand-in for SELECT ... FOR UPDATE on the queue row.
 * The critical section cannot overlap. A racy allocator is provided so tests can show duplicates.
 */
export function createLockedAllocator(initial?: Partial<SequenceState>) {
  const state: AllocatorState = {
    lastSequenceDate: initial?.lastSequenceDate ?? null,
    dailySequence: initial?.dailySequence ?? 0,
    activePhones: new Set<string>(),
    issued: new Set<string>(),
  };
  let chain = Promise.resolve();
  return {
    state,
    join(businessDate: string, phone: string) {
      return exclusive(chain, (replace) => {
        chain = replace;
        return () => issue(state, businessDate, phone);
      });
    },
    release(phone: string) {
      return exclusive(chain, (replace) => {
        chain = replace;
        return () => {
          state.activePhones.delete(phone);
        };
      });
    },
  };
}

export function createRacyAllocator(initial?: Partial<SequenceState>) {
  const state: AllocatorState = {
    lastSequenceDate: initial?.lastSequenceDate ?? null,
    dailySequence: initial?.dailySequence ?? 0,
    activePhones: new Set<string>(),
    issued: new Set<string>(),
  };
  return {
    async join(businessDate: string, phone: string) {
      const isNewDay = state.lastSequenceDate !== businessDate;
      const next = isNewDay ? 1 : state.dailySequence + 1;
      await Promise.resolve();
      state.lastSequenceDate = businessDate;
      state.dailySequence = next;
      const id = `${businessDate}:${next}`;
      state.issued.add(id);
      state.activePhones.add(phone);
      return next;
    },
  };
}

function issue(state: AllocatorState, businessDate: string, phone: string) {
  if (state.activePhones.has(phone)) {
    const error = new Error('ACTIVE_DUPLICATE');
    throw error;
  }
  const tokenNumber = allocateDailyToken(state, businessDate);
  const id = `${businessDate}:${tokenNumber}`;
  if (state.issued.has(id)) throw new Error('DUPLICATE_NUMBER');
  state.issued.add(id);
  state.activePhones.add(phone);
  return tokenNumber;
}

function exclusive<T>(chain: Promise<void>, schedule: (replace: Promise<void>) => () => T) {
  let release: () => void = () => undefined;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const run = schedule(next);
  const result = chain.then(run);
  return result.finally(release);
}
