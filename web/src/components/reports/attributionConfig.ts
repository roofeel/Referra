export type AttributionMode = 'registration';
export type ReportType = AttributionMode | 'custom';

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
};

export const REQUIRED_CANONICAL_FIELDS: CanonicalAttributionField[] = [
  'source_url',
  'event_url',
  'source_time',
  'event_time',
];

export const CANONICAL_FIELD_ALIASES: Record<CanonicalAttributionField, string[]> = {
  source_url: ['source_url', 'impression_url', 'imp_url'],
  event_url: ['event_url', 'registration_url', 'reg_url'],
  source_time: ['source_time', 'impression_time', 'impression_timestamp', 'impression_ts'],
  event_time: ['event_time', 'registration_time', 'registration_ts'],
};

export const ATTRIBUTION_MODE_META: Record<AttributionMode, { label: string; description: string }> = {
  registration: {
    label: 'Impression -> Registration',
    description: 'Maps first touch to user creation event',
  },
};

export const ATTRIBUTION_MODE_OPTIONS: Array<{ mode: AttributionMode; label: string; description: string }> = [
  {
    mode: 'registration',
    label: ATTRIBUTION_MODE_META.registration.label,
    description: ATTRIBUTION_MODE_META.registration.description,
  },
];

export function getReportTypeLabel(reportType: ReportType) {
  if (reportType === 'registration') {
    return ATTRIBUTION_MODE_META[reportType].label;
  }
  return 'Custom Attribution';
}

export function getTimeHeaderByReportType(
  reportType: ReportType,
  field: 'event_time' | 'source_time',
) {
  if (reportType === 'registration') {
    return ATTRIBUTION_ALIAS_CONFIG[reportType].find((item) => item.canonical === field)?.alias || field;
  }
  return field;
}
