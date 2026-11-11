const BLOCKED = new Set([
  'default-jwt-secret',
  'default-refresh-secret',
  'qfast-jwt-secret-change-in-production-min-32-chars',
  'qfast-refresh-secret-change-in-production-min-32-chars',
]);

export function readJwtSecret(
  config: { get: (key: string) => string | undefined },
  key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET',
) {
  const value = config.get(key)?.trim() || '';
  if (value.length < 32 || BLOCKED.has(value)) {
    throw new Error(`${key} must be a unique secret of at least 32 characters`);
  }
  return value;
}
