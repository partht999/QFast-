/**
 * Which browser origins may call the API with credentials.
 *
 * Production: the Qfast site, its Netlify deploy previews, FRONTEND_URL, and any
 * extra origins in CORS_ORIGINS (comma separated, e.g. a custom domain).
 * Development: localhost and private-network addresses (testing on a phone over Wi-Fi).
 * Requests without an Origin header (curl, webhooks, server-to-server) are not
 * browser cross-site requests and are always allowed.
 */
const DEFAULT_ORIGINS = ['https://qfastin.netlify.app'];
const NETLIFY_PREVIEW = /^https:\/\/[a-z0-9-]+--qfastin\.netlify\.app$/i;
const LOCAL_DEV =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/i;

function normalize(origin: string) {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

function configuredOrigins() {
  return new Set(
    [...DEFAULT_ORIGINS, process.env.FRONTEND_URL || '', ...(process.env.CORS_ORIGINS || '').split(',')]
      .map(normalize)
      .filter(Boolean),
  );
}

export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return true;
  const value = normalize(origin);
  if (configuredOrigins().has(value)) return true;
  if (NETLIFY_PREVIEW.test(value)) return true;
  if (process.env.NODE_ENV !== 'production' && LOCAL_DEV.test(value)) return true;
  return false;
}

/** For Express/Nest and socket.io `cors.origin`. */
export function corsOriginCallback(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  callback(null, isAllowedOrigin(origin));
}
