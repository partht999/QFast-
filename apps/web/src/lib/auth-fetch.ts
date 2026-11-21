import { getApiUrl } from './api';

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  const response = await originalFetch(`${getApiUrl()}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
  return data.accessToken || null;
}

/** One refresh at a time, shared by every request that got a 401. */
export function refreshSessionOnce() {
  if (!refreshing) refreshing = refreshAccessToken().catch(() => null).finally(() => (refreshing = null));
  return refreshing;
}

let originalFetch: typeof fetch;

/**
 * Access tokens last 15 minutes. Dashboard pages call fetch directly, so a 401 on an
 * authorised API call is refreshed once and retried here instead of logging staff out.
 */
export function installAuthRefresh() {
  if (typeof window === 'undefined' || (window as any).__qfastAuthFetch) return;
  (window as any).__qfastAuthFetch = true;
  originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    if (response.status !== 401) return response;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.get('Authorization') || url.includes('/auth/')) return response;
    const token = await refreshSessionOnce();
    if (!token) return response;
    headers.set('Authorization', `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  };
}
