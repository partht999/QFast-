export function guestTokenIdKey(slug: string) {
  return `qfast_token_${slug}`;
}

export function guestTokenSecretKey(slug: string) {
  return `qfast_token_secret_${slug}`;
}

export function readGuestToken(slug: string) {
  if (typeof window === 'undefined') return { id: '', secret: '' };
  return {
    id: localStorage.getItem(guestTokenIdKey(slug)) || '',
    secret: localStorage.getItem(guestTokenSecretKey(slug)) || '',
  };
}

export function saveGuestToken(slug: string, id: string, secret?: string) {
  localStorage.setItem(guestTokenIdKey(slug), id);
  if (secret) localStorage.setItem(guestTokenSecretKey(slug), secret);
}

export function clearGuestToken(slug: string) {
  localStorage.removeItem(guestTokenIdKey(slug));
  localStorage.removeItem(guestTokenSecretKey(slug));
}

export function guestTokenUrl(apiUrl: string, id: string, secret: string, action?: 'on-the-way' | 'cancel') {
  const suffix = action ? `/${action}` : '';
  return `${apiUrl}/api/v1/queue/public/token/${encodeURIComponent(id)}${suffix}?secret=${encodeURIComponent(secret)}`;
}
