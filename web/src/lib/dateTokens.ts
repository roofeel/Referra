export function replaceDateTokens(value: string, date: Date = new Date()) {
  const normalized = value.trim();
  if (!normalized) return '';

  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return normalized.replace(
    /\$\{([YyMmDd-]{2,10})\}|\{([YyMmDd-]{2,10})\}|\b([YyMmDd-]{2,10})\b/g,
    (match, a, b, c) => {
      const token = (a || b || c) as string | undefined;
      if (!token) return match;

      const normalizedToken = token
        .replace(/y/g, 'Y')
        .replace(/m/g, 'M')
        .replace(/d/g, 'D');

      switch (normalizedToken) {
        case 'YYYY-MM-DD':
          return `${yyyy}-${mm}-${dd}`;
        case 'YYYYMMDD':
          return `${yyyy}${mm}${dd}`;
        case 'YYYYMM':
          return `${yyyy}${mm}`;
        case 'YYYY':
          return yyyy;
        case 'MM':
          return mm;
        case 'DD':
          return dd;
        default:
          return match;
      }
    },
  );
}
