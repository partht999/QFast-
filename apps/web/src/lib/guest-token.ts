import { storageGet, storageRemove, storageSet } from './safe-storage';

export function guestTokenIdKey(slug: string) {
  return `qfast_token_${slug}`;
}

export function guestTokenSecretKey(slug: string) {
  return `qfast_token_secret_${slug}`;
}

export function readGuestToken(slug: string) {
  return {
    id: storageGet(guestTokenIdKey(slug)) || '',
    secret: storageGet(guestTokenSecretKey(slug)) || '',
  };
}

export function saveGuestToken(slug: string, id: string, secret?: string) {
  storageSet(guestTokenIdKey(slug), id);
  if (secret) storageSet(guestTokenSecretKey(slug), secret);
}

export function clearGuestToken(slug: string) {
  storageRemove(guestTokenIdKey(slug));
  storageRemove(guestTokenSecretKey(slug));
}

export function guestTokenUrl(apiUrl: string, id: string, secret: string, action?: 'on-the-way' | 'cancel') {
  const suffix = action ? `/${action}` : '';
  return `${apiUrl}/api/v1/queue/public/token/${encodeURIComponent(id)}${suffix}?secret=${encodeURIComponent(secret)}`;
}
