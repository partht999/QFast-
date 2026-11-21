import { storageGet, storageSet } from './safe-storage';

const keyName = (orderId: string) => `qfast_order_key_${orderId}`;

export function saveOrderKey(orderId?: string | null, key?: string | null) {
  if (orderId && key) storageSet(keyName(orderId), key);
}

/** The guest key for an order: from the link (?k=), a known value, or this phone's storage. */
export function orderKey(orderId: string, known?: string | null) {
  if (known) {
    saveOrderKey(orderId, known);
    return known;
  }
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('k');
    if (fromUrl && window.location.pathname.includes(`/order/${orderId}`)) {
      saveOrderKey(orderId, fromUrl);
      return fromUrl;
    }
  }
  return storageGet(keyName(orderId)) || '';
}

/** Adds ?key= to a public order API URL. */
export function withOrderKey(url: string, orderId: string, known?: string | null) {
  const key = orderKey(orderId, known);
  if (!key) return url;
  return `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
}

/** Guest-facing link to an order page that keeps working on this phone. */
export function orderPagePath(slug: string, orderId: string, known?: string | null) {
  const key = orderKey(orderId, known);
  return `/r/${slug}/order/${orderId}${key ? `?k=${encodeURIComponent(key)}` : ''}`;
}
