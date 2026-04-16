export function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function asJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function getJsonValue(record: Record<string, unknown>, candidates: string[]): string {
  if (!record || candidates.length === 0) return '';

  for (const key of candidates) {
    const normalizedKey = key.trim();
    if (!normalizedKey) continue;
    const value = record[normalizedKey];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }

  const normalizedMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    normalizedMap.set(normalizeKey(key), value);
  }

  for (const key of candidates) {
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) continue;
    const value = normalizedMap.get(normalizedKey);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }

  return '';
}
