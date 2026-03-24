export type AttributionMode = 'registration' | 'pageload';

export type CanonicalAttributionField = 'source_url' | 'source_time' | 'event_url' | 'event_time';

export type AttributionLogicMapping = Record<CanonicalAttributionField, string>;

export const ATTRIBUTION_ALIAS_CONFIG: Record<
  AttributionMode,
  Array<{ alias: string; canonical: CanonicalAttributionField }>
> = {
  registration: [
    { alias: 'impression_url', canonical: 'source_url' },
    { alias: 'registration_url', canonical: 'event_url' },
    { alias: 'impression_time', canonical: 'source_time' },
    { alias: 'registration_time', canonical: 'event_time' },
  ],
  pageload: [
    { alias: 'impression_url', canonical: 'source_url' },
    { alias: 'page_load_url', canonical: 'event_url' },
    { alias: 'impression_time', canonical: 'source_time' },
    { alias: 'page_load_time', canonical: 'event_time' },
  ],
};

export const REQUIRED_CANONICAL_FIELDS: CanonicalAttributionField[] = [
  'source_url',
  'event_url',
  'source_time',
  'event_time',
];

export const CANONICAL_FIELD_ALIASES: Record<CanonicalAttributionField, string[]> = {
  source_url: ['source_url', 'impression_url', 'imp_url'],
  event_url: ['event_url', 'registration_url', 'page_load_url', 'reg_url', 'pageload_url'],
  source_time: ['source_time', 'impression_time', 'impression_timestamp', 'impression_ts'],
  event_time: ['event_time', 'registration_time', 'page_load_time', 'registration_ts', 'page_load_ts'],
};
