export function readApiError(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) {
    const text = message.map((item) => String(item)).filter(Boolean).join(' ');
    return text || fallback;
  }
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

/** Parse a response body without throwing on HTML error pages (502/504 from cold starts). */
export async function readJsonSafe<T = any>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
