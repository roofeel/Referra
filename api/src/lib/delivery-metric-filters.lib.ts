export type DeliveryMetricFilter = { id: number; showBid: boolean; label: string };

export function parseDeliveryMetricFilters(entries: unknown): DeliveryMetricFilter[] {
  if (!Array.isArray(entries)) throw new Error('Filters JSON must be an array');
  const ids = new Set<number>();
  return entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Filter ${index + 1} must be an object`);
    }
    const config = entry as Record<string, unknown>;
    const idValue = config.clickUrlId ?? config.id;
    const id = typeof idValue === 'number' ? idValue : typeof idValue === 'string' && /^\d+$/.test(idValue) ? Number(idValue) : NaN;
    if (!Number.isSafeInteger(id) || id < 0) throw new Error(`Filter ${index + 1} must have a non-negative integer clickUrlId`);
    if (ids.has(id)) throw new Error(`Duplicate clickUrlId: ${id}`);
    ids.add(id);
    if (typeof config.showBid !== 'boolean') throw new Error(`showBid for ${id} must be true or false`);
    const label = config.clickUrlLabel ?? config.label ?? config.name;
    if (label !== undefined && typeof label !== 'string') throw new Error(`Name for ${id} must be a string`);
    return { id, showBid: config.showBid, label: typeof label === 'string' && label.trim() ? label.trim() : `Click URL ${id}` };
  });
}
