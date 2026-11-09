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
