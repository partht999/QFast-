type Kind = 'local' | 'session';

function getStore(kind: Kind): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    // Private mode / blocked cookies / some in-app browsers throw on access
    return null;
  }
}

export function storageGet(key: string, kind: Kind = 'local'): string | null {
  try {
    return getStore(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string, kind: Kind = 'local'): boolean {
  try {
    const store = getStore(kind);
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function storageRemove(key: string, kind: Kind = 'local') {
  try {
    getStore(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}
