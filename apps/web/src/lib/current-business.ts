import { storageGet, storageSet } from './safe-storage';

const KEY = 'qfast_business_id';

/** The business the dashboard is working on: the one picked in the switcher, else the first. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pickBusiness<T = any>(list: T[] | null | undefined): T | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const chosen = storageGet(KEY);
  return list.find((business) => (business as { id?: string }).id === chosen) || list[0];
}

export function chooseBusiness(id: string) {
  storageSet(KEY, id);
}

export function currentBusinessId() {
  return storageGet(KEY) || '';
}
