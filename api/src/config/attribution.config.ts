export type AttributionMode = 'registration' | 'pageload';
export type CanonicalAttributionField = 'source_url' | 'source_time' | 'event_url' | 'event_time';
export type AttributionLogicMapping = Record<CanonicalAttributionField, string>;

export const ATTRIBUTION_ALIAS_CONFIG: Record<
  AttributionMode,
  Record<CanonicalAttributionField, string>
> = {
  registration: {
    source_url: 'impression_url',
    event_url: 'registration_url',
    source_time: 'impression_time',
    event_time: 'registration_time',
  },
  pageload: {
    source_url: 'impression_url',
    event_url: 'page_load_url',
    source_time: 'impression_time',
    event_time: 'page_load_time',
  },
};

export const REQUIRED_CANONICAL_FIELDS: CanonicalAttributionField[] = [
  'source_url',
  'event_url',
  'source_time',
  'event_time',
];

export function isAttributionMode(value: unknown): value is AttributionMode {
  return value === 'registration' || value === 'pageload';
}

export function normalizeAttributionLogicMapping(input: unknown): AttributionLogicMapping | null {
  if (!input || typeof input !== 'object') return null;

  const item = input as Record<string, unknown>;
  const sourceUrl = typeof item.source_url === 'string' ? item.source_url.trim() : '';
  const eventUrl = typeof item.event_url === 'string' ? item.event_url.trim() : '';
  const sourceTime = typeof item.source_time === 'string' ? item.source_time.trim() : '';
  const eventTime = typeof item.event_time === 'string' ? item.event_time.trim() : '';

  if (!sourceUrl || !eventUrl || !sourceTime || !eventTime) {
    return null;
  }

  return {
    source_url: sourceUrl,
    event_url: eventUrl,
    source_time: sourceTime,
    event_time: eventTime,
  };
}
