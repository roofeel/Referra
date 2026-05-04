export function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseUrl(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    try {
      const decoded = safeDecode(value);
      return new URL(decoded);
    } catch {
      return null;
    }
  }
}

export function getSearchParamIgnoreCase(url: URL, key: string) {
  const target = key.trim().toLowerCase();
  for (const [currentKey, value] of url.searchParams.entries()) {
    if (currentKey.trim().toLowerCase() === target) {
      return value;
    }
  }
  return '';
}

export function parseTimestampToMs(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) {
    if (Math.abs(asNumber) >= 1e11) {
      return asNumber;
    }
    return asNumber * 1000;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export function computeDurationSeconds(eventTimeRaw: string, sourceTimeRaw: string) {
  const eventMs = parseTimestampToMs(eventTimeRaw);
  const sourceMs = parseTimestampToMs(sourceTimeRaw);
  if (eventMs === null || sourceMs === null) {
    return 0;
  }

  return Math.round((eventMs - sourceMs) / 1000);
}
