import { referrerRaws, reports, urlRules } from '../../../packages/db/index.js';
import {
  isAttributionMode,
  normalizeAttributionLogicMapping,
  type ReportType,
} from '../config/attribution.config.js';
import { getSearchParamIgnoreCase, parseTimestampToMs, parseUrl } from '../lib/reports-url.lib.js';

type ReportRecord = Awaited<ReturnType<typeof reports.findById>>;
type UrlRuleRecord = Awaited<ReturnType<typeof urlRules.findById>>;
type ReferrerRawRecord = Awaited<ReturnType<typeof referrerRaws.listByReport>>[number];

type ReportDetailMetric = {
  title: string;
  value: string;
  note: string;
  tone: 'positive' | 'negative' | 'neutral';
  icon: string;
};

type ReportDetailDistributionItem = {
  label: string;
  height: string;
  color: string;
};

type ReportDetailTableRow = {
  eventId: string;
  uid: string;
  eventName: string;
  ts: string;
  sourceTs: string;
  category: string;
  type: string;
  status: string;
  duration: string;
};

type ReportDetailEventDetail = {
  url: string;
  ruleName: string;
  confidenceScore: string;
  aiResult: string;
  extractedParameters: Array<[string, string]>;
  attributionPath: Array<[string, string, string]>;
  journey?: {
    sourceWindow: string;
    eventWindow: string;
    eventUrlParam: string;
    athenaUrlParam: string;
    athenaUrlField: string;
    athenaTimeField: string;
    rows: Array<{
      ts: string;
      url: string;
      idValue: string;
    }>;
  };
};

export type ReportDetailPayload = {
  clientName: string;
  reportType: ReportType;
  referrerTypeStats: Array<{
    referrerType: string;
    count: number;
    percentage: number;
  }>;
  metrics: ReportDetailMetric[];
  distribution: ReportDetailDistributionItem[];
  insights: {
    parsingSuccess: number;
    missedRules: number;
    aiParameterCoverage: number;
    unmatchedTokens: number;
    aiConfidenceAvg: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
  };
  rows: ReportDetailTableRow[];
  eventDetails: Record<string, ReportDetailEventDetail>;
};

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function asJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getJsonValue(record: Record<string, unknown>, candidates: string[]): string {
  if (!record || candidates.length === 0) return '';

  for (const key of candidates) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }

  const normalizedMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    normalizedMap.set(normalizeKey(key), value);
  }

  for (const key of candidates) {
    const value = normalizedMap.get(normalizeKey(key));
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }

  return '';
}

function isMatchedRow(row: Pick<ReferrerRawRecord, 'referrerType' | 'referrerDesc'>) {
  const type = row.referrerType.trim().toLowerCase();
  const desc = row.referrerDesc.trim().toLowerCase();
  if (!type || type === 'unknown' || type === 'unmatched') return false;
  if (desc.includes('error')) return false;
  return true;
}

function formatDurationLabel(durationSecondsRaw: number) {
  if (!Number.isFinite(durationSecondsRaw)) return '--';
  const durationSeconds = Math.max(0, Math.round(durationSecondsRaw));
  if (durationSeconds < 60) return `${durationSeconds}s`;
  if (durationSeconds < 3600) return `${(durationSeconds / 60).toFixed(1)}m`;
  if (durationSeconds < 86400) return `${(durationSeconds / 3600).toFixed(1)}h`;
  return `${(durationSeconds / 86400).toFixed(1)}d`;
}

function formatTableTimestamp(rawValue: string) {
  const ms = parseTimestampToMs(rawValue);
  if (ms === null) return rawValue || '--';
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatTimestampFromMs(ms: number | null) {
  if (ms === null || !Number.isFinite(ms)) return '--';
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseQueryParams(urlValue: string): Array<[string, string]> {
  const parsed = parseUrl(urlValue);
  if (!parsed) return [];
  const values: Array<[string, string]> = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    values.push([key, value]);
    if (values.length >= 8) break;
  }
  return values;
}

function extractUidFromEventUrl(urlValue: string) {
  const parsed = parseUrl(urlValue);
  if (!parsed) return '--';

  const preferredKeys = new Set(['uid']);
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!value || !value.trim()) continue;
    if (preferredKeys.has(key.trim().toLowerCase())) return value.trim();
  }
  return '--';
}

function extractEventNameFromEventUrl(urlValue: string) {
  const parsed = parseUrl(urlValue);
  if (!parsed) return '';
  const urlCandidates = new Set(['action', 'ev', 'eventname', 'event-name', 'evt_name']);
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!value || !value.trim()) continue;
    if (urlCandidates.has(key.trim().toLowerCase())) return value.trim();
  }
  return '';
}

function isMatchedReferrerType(type: string) {
  const normalized = (type || '').trim().toLowerCase();
  return Boolean(normalized) && normalized !== 'unknown' && normalized !== 'unmatched';
}

function toReferrerTypeStatsFromRows(rows: ReferrerRawRecord[]) {
  const counter = new Map<string, number>();
  rows.forEach((item) => {
    const key = item.referrerType?.trim() || 'unknown';
    counter.set(key, (counter.get(key) || 0) + 1);
  });
  return Array.from(counter.entries())
    .map(([referrerType, count]) => ({ referrerType, count }))
    .sort((a, b) => b.count - a.count);
}

function withPrimaryCandidate(primary: string | null, fallback: string[]) {
  const first = typeof primary === 'string' ? primary.trim() : '';
  const combined = first ? [first, ...fallback] : [...fallback];
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const key of combined) {
    const normalized = normalizeKey(key);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(key);
  }
  return deduped;
}

function parseTimeMsByCandidates(item: ReferrerRawRecord, candidates: string[]) {
  const json = asJsonRecord(item.json);
  const rawValue = getJsonValue(json, candidates);
  return parseTimestampToMs(rawValue);
}

function startOfDayMs(dateInput: string) {
  const value = dateInput.trim();
  if (!value) return null;
  const ms = Date.parse(`${value}T00:00:00`);
  return Number.isNaN(ms) ? null : ms;
}

function endOfDayMs(dateInput: string) {
  const value = dateInput.trim();
  if (!value) return null;
  const ms = Date.parse(`${value}T23:59:59.999`);
  return Number.isNaN(ms) ? null : ms;
}

function inDurationWindow(durationSeconds: number, windowHours: number | null) {
  if (windowHours === null) return true;
  if (!Number.isFinite(durationSeconds)) return false;
  const duration = Math.round(durationSeconds);
  return duration >= 0 && duration <= windowHours * 60 * 60;
}

type JourneyConfig = {
  athenaTableId: string;
  athenaTableName: string;
  eventUrlParam: string;
  athenaUrlParam: string;
  athenaUrlField: string;
  athenaTimeField: string;
};

function normalizeJourneyConfigFromFieldMappings(fieldMappings: unknown): JourneyConfig | null {
  if (!fieldMappings || typeof fieldMappings !== 'object' || Array.isArray(fieldMappings)) return null;
  const record = fieldMappings as Record<string, unknown>;
  const raw = record.__journeyConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;

  const athenaTableId = typeof item.athenaTableId === 'string' ? item.athenaTableId.trim() : '';
  const athenaTableName = typeof item.athenaTableName === 'string' ? item.athenaTableName.trim() : '';
  const eventUrlParam = typeof item.eventUrlParam === 'string' ? item.eventUrlParam.trim() : '';
  const athenaUrlParam = typeof item.athenaUrlParam === 'string' ? item.athenaUrlParam.trim() : '';
  const athenaUrlField = typeof item.athenaUrlField === 'string' ? item.athenaUrlField.trim() : '';
  const athenaTimeField = typeof item.athenaTimeField === 'string' ? item.athenaTimeField.trim() : '';
  if (!athenaTableId || !eventUrlParam || !athenaUrlParam || !athenaUrlField || !athenaTimeField) return null;

  return {
    athenaTableId,
    athenaTableName,
    eventUrlParam,
    athenaUrlParam,
    athenaUrlField,
    athenaTimeField,
  };
}

type JourneySourceItem = {
  idValue: string;
  tsMs: number;
  tsLabel: string;
  url: string;
};

type StoredJourneyLogs = {
  eventUrlParam: string;
  athenaUrlParam: string;
  athenaUrlField: string;
  athenaTimeField: string;
  sourceTime: string;
  eventTime: string;
  rows: Array<{
    ts: string;
    url: string;
    idValue: string;
  }>;
};

function normalizeStoredJourneyLogs(value: unknown): StoredJourneyLogs | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const rawRows = Array.isArray(record.rows) ? record.rows : [];
  const rows = rawRows
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const ts = typeof row.ts === 'string' ? row.ts.trim() : '';
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      const idValue = typeof row.idValue === 'string' ? row.idValue.trim() : '';
      return ts || url || idValue ? { ts: ts || '--', url: url || '--', idValue } : null;
    })
    .filter((item): item is { ts: string; url: string; idValue: string } => Boolean(item));

  const eventUrlParamRaw = typeof record.event_url_param === 'string' ? record.event_url_param.trim() : '';
  const athenaUrlParamRaw = typeof record.athena_url_param === 'string' ? record.athena_url_param.trim() : '';
  const athenaUrlFieldRaw = typeof record.athena_url_field === 'string' ? record.athena_url_field.trim() : '';
  const athenaTimeFieldRaw = typeof record.athena_time_field === 'string' ? record.athena_time_field.trim() : '';
  const sourceTime = typeof record.source_time === 'string' ? record.source_time.trim() : '';
  const eventTime = typeof record.event_time === 'string' ? record.event_time.trim() : '';

  if (!eventUrlParamRaw || !athenaUrlParamRaw || !athenaUrlFieldRaw || !athenaTimeFieldRaw) return null;

  return {
    eventUrlParam: eventUrlParamRaw,
    athenaUrlParam: athenaUrlParamRaw,
    athenaUrlField: athenaUrlFieldRaw,
    athenaTimeField: athenaTimeFieldRaw,
    sourceTime,
    eventTime,
    rows,
  };
}

function buildJourneySourceItems(rows: ReferrerRawRecord[], journeyConfig: JourneyConfig): Map<string, JourneySourceItem[]> {
  const grouped = new Map<string, JourneySourceItem[]>();
  for (const row of rows) {
    const json = asJsonRecord(row.json);
    const urlValue =
      getJsonValue(json, [journeyConfig.athenaUrlField, 'url', 'event_url', 'registration_url']) || '';
    const parsedUrl = parseUrl(urlValue);
    if (!parsedUrl) continue;
    const idValue = getSearchParamIgnoreCase(parsedUrl, journeyConfig.athenaUrlParam).trim();
    if (!idValue) continue;

    const tsRaw = getJsonValue(json, [journeyConfig.athenaTimeField, 'event_time', 'registration_time', 'page_load_time', 'ts']);
    const tsMs = parseTimestampToMs(tsRaw);
    if (tsMs === null) continue;
    const current = grouped.get(idValue) || [];
    current.push({
      idValue,
      tsMs,
      tsLabel: formatTimestampFromMs(tsMs),
      url: parsedUrl.toString(),
    });
    grouped.set(idValue, current);
  }

  grouped.forEach((items, key) => {
    items.sort((a, b) => a.tsMs - b.tsMs);
    grouped.set(key, items);
  });

  return grouped;
}

function buildDetailPayload(
  report: NonNullable<ReportRecord>,
  rule: UrlRuleRecord,
  rawRows: ReferrerRawRecord[],
  options: {
    page: number;
    pageSize: number;
    totalRows: number;
    referrerTypeCounts: Array<{ referrerType: string; count: number }>;
    journeyConfig?: JourneyConfig | null;
    journeySourceRows?: ReferrerRawRecord[];
  },
): ReportDetailPayload {
  const totalRows = options.totalRows;
  const referrerTypeStats = options.referrerTypeCounts
    .map((item) => ({
      referrerType: item.referrerType || 'unknown',
      count: item.count,
      percentage: totalRows > 0 ? Number(((item.count / totalRows) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);
  const matchedRows = referrerTypeStats
    .filter((item) => isMatchedReferrerType(item.referrerType))
    .reduce((sum, item) => sum + item.count, 0);
  const unmatchedRows = totalRows - matchedRows;
  const parsingSuccess = totalRows === 0 ? 0 : (matchedRows / totalRows) * 100;
  const aiCoverage = totalRows === 0 ? 0 : ((totalRows - unmatchedRows) / totalRows) * 100;
  const aiConfidenceAvg = totalRows === 0 ? 0 : (matchedRows * 95 + unmatchedRows * 60) / totalRows;
  const avgDuration =
    totalRows === 0 ? 0 : rawRows.reduce((sum, row) => sum + (Number.isFinite(row.duration) ? row.duration : 0), 0) / totalRows;

  const rows: ReportDetailTableRow[] = rawRows.map((item) => {
    const json = asJsonRecord(item.json);
    const eventUrl = getJsonValue(json, ['event_url', 'registration_url', 'url', 'ourl']) || '';
    const eventTime = getJsonValue(json, ['event_time', 'registration_time', 'timestamp', 'ts']);
    const sourceTime = getJsonValue(json, ['source_time', 'impression_time']);
    const eventMs = parseTimestampToMs(eventTime);
    const sourceMsFromRaw = parseTimestampToMs(sourceTime);
    const sourceMsDerived =
      sourceMsFromRaw !== null
        ? sourceMsFromRaw
        : eventMs !== null && Number.isFinite(item.duration)
          ? eventMs - Math.max(0, Math.round(item.duration)) * 1000
          : null;
    const eventName =
      (extractEventNameFromEventUrl(eventUrl) ||
        getJsonValue(json, ['action', 'event_name', 'event', 'event_type', 'ev', 'eventName', 'event-name', 'evt_name']))
        .toUpperCase() || 'EVENT';

    return {
      eventId: item.id,
      uid: extractUidFromEventUrl(eventUrl),
      eventName,
      ts: formatTableTimestamp(eventTime),
      sourceTs: sourceMsFromRaw !== null ? formatTableTimestamp(sourceTime) : formatTimestampFromMs(sourceMsDerived),
      category: item.referrerType || 'unknown',
      type: item.referrerDesc || '--',
      status: isMatchedRow(item) ? 'SUCCESS' : 'UNMATCHED',
      duration: formatDurationLabel(item.duration),
    };
  });

  const journeySourceMap =
    options.journeyConfig && (options.journeySourceRows || []).length > 0
      ? buildJourneySourceItems(options.journeySourceRows || [], options.journeyConfig)
      : null;
  const eventDetails: Record<string, ReportDetailEventDetail> = {};
  rawRows.forEach((item) => {
    const json = asJsonRecord(item.json);
    const urlValue = getJsonValue(json, ['event_url', 'registration_url', 'url', 'ourl']) || 'N/A';
    const sourceUrl = getJsonValue(json, ['source_url', 'impression_url', 'source']);
    const sourceTime = getJsonValue(json, ['source_time', 'impression_time']);
    const eventTime = getJsonValue(json, ['event_time', 'registration_time', 'timestamp', 'ts']);
    const params = parseQueryParams(urlValue);
    const detailItem: ReportDetailEventDetail = {
      url: urlValue,
      ruleName: rule?.name?.trim() || 'N/A',
      confidenceScore: `${(isMatchedRow(item) ? 95 : 60).toFixed(1)}%`,
      aiResult: item.referrerDesc || 'No description',
      extractedParameters: params.length > 0 ? params : [['referrer_type', item.referrerType || 'unknown']],
      attributionPath: [
        ['Source', `${sourceTime || '--'} • ${sourceUrl || '--'}`, 'bg-emerald-500'],
        ['Event URL', `${eventTime || '--'} • ${urlValue}`, 'bg-blue-500'],
        ['Classification', `${item.referrerType || 'unknown'} • ${isMatchedRow(item) ? 'Matched' : 'Unmatched'}`, 'bg-blue-700'],
      ],
    };

    const storedJourneyLogs = normalizeStoredJourneyLogs((item as Record<string, unknown>).journeyLogs);
    if (storedJourneyLogs) {
      detailItem.journey = {
        sourceWindow: storedJourneyLogs.sourceTime || '--',
        eventWindow: storedJourneyLogs.eventTime || '--',
        eventUrlParam: storedJourneyLogs.eventUrlParam,
        athenaUrlParam: storedJourneyLogs.athenaUrlParam,
        athenaUrlField: storedJourneyLogs.athenaUrlField,
        athenaTimeField: storedJourneyLogs.athenaTimeField,
        rows: storedJourneyLogs.rows.slice(0, 200),
      };
    } else if (options.journeyConfig && journeySourceMap) {
      const parsedEventUrl = parseUrl(urlValue);
      const eventIdValue = parsedEventUrl ? getSearchParamIgnoreCase(parsedEventUrl, options.journeyConfig.eventUrlParam).trim() : '';
      const sourceMs = parseTimestampToMs(sourceTime);
      const eventMs = parseTimestampToMs(eventTime);
      if (eventIdValue) {
        const candidates = (journeySourceMap.get(eventIdValue) || []).filter((journeyItem) => {
          if (sourceMs !== null && journeyItem.tsMs < sourceMs) return false;
          if (eventMs !== null && journeyItem.tsMs > eventMs) return false;
          return true;
        });
        detailItem.journey = {
          sourceWindow: sourceTime || '--',
          eventWindow: eventTime || '--',
          eventUrlParam: options.journeyConfig.eventUrlParam,
          athenaUrlParam: options.journeyConfig.athenaUrlParam,
          athenaUrlField: options.journeyConfig.athenaUrlField,
          athenaTimeField: options.journeyConfig.athenaTimeField,
          rows: candidates.slice(0, 200).map((journeyItem) => ({
            ts: journeyItem.tsLabel,
            url: journeyItem.url,
            idValue: journeyItem.idValue,
          })),
        };
      }
    }
    eventDetails[item.id] = detailItem;
  });

  const topTypes = referrerTypeStats.slice(0, 4);
  const maxTypeCount = topTypes[0]?.count || 1;
  const distributionColors = ['bg-blue-700', 'bg-blue-500/70', 'bg-blue-300', 'bg-slate-300'];
  const distribution: ReportDetailDistributionItem[] = topTypes.map((item, index) => ({
    label: item.referrerType,
    height: `${Math.max(10, Math.round((item.count / maxTypeCount) * 100))}%`,
    color: distributionColors[index] || 'bg-slate-300',
  }));

  return {
    clientName: report.client?.name || 'Unknown Client',
    reportType: isAttributionMode(report.reportType) ? report.reportType : 'registration',
    referrerTypeStats,
    metrics: [
      {
        title: 'Total Events',
        value: new Intl.NumberFormat('en-US').format(totalRows),
        note: `${parsingSuccess.toFixed(1)}% parsing success`,
        tone: parsingSuccess >= 90 ? 'positive' : 'neutral',
        icon: 'data_object',
      },
      {
        title: 'Avg Duration',
        value: formatDurationLabel(avgDuration),
        note: 'event_time - source_time',
        tone: 'neutral',
        icon: 'timer',
      },
    ],
    distribution,
    insights: {
      parsingSuccess: Number(parsingSuccess.toFixed(1)),
      missedRules: unmatchedRows,
      aiParameterCoverage: Number(aiCoverage.toFixed(1)),
      unmatchedTokens: unmatchedRows,
      aiConfidenceAvg: Number(aiConfidenceAvg.toFixed(1)),
    },
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      totalRows,
      totalPages: Math.max(1, Math.ceil(totalRows / options.pageSize)),
    },
    rows,
    eventDetails,
  };
}

export async function getReportDetailPayload(
  report: NonNullable<ReportRecord>,
  options: {
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
    cohortMode?: 'non-cohort' | 'cohort';
    windowHours?: number;
  },
) {
  const journeyConfig = normalizeJourneyConfigFromFieldMappings(report.fieldMappings);
  const attributionLogic = normalizeAttributionLogicMapping(report.fieldMappings);
  const eventTimeCandidates = withPrimaryCandidate(attributionLogic?.event_time || null, [
    'event_time',
    'registration_time',
    'page_load_time',
    'timestamp',
    'ts',
  ]);
  const sourceTimeCandidates = withPrimaryCandidate(attributionLogic?.source_time || null, [
    'source_time',
    'impression_time',
  ]);
  const startMs = options.startDate ? startOfDayMs(options.startDate) : null;
  const endMs = options.endDate ? endOfDayMs(options.endDate) : null;
  const windowHours = [12, 24, 48, 72].includes(options.windowHours || 0) ? (options.windowHours as number) : null;
  const cohortMode = options.cohortMode === 'cohort' ? 'cohort' : 'non-cohort';
  const rule = await urlRules.findById(report.ruleId);
  const shouldFilter = startMs !== null || endMs !== null || windowHours !== null;

  if (shouldFilter) {
    const allRows = (await referrerRaws.listByReport(report.id)) as ReferrerRawRecord[];
    const filteredRows = allRows.filter((item) => {
      const filterTimeMs =
        cohortMode === 'cohort'
          ? parseTimeMsByCandidates(item, sourceTimeCandidates)
          : parseTimeMsByCandidates(item, eventTimeCandidates);
      if (filterTimeMs === null) {
        if (startMs !== null || endMs !== null) return false;
      } else {
        if (startMs !== null && filterTimeMs < startMs) return false;
        if (endMs !== null && filterTimeMs > endMs) return false;
      }
      if (!inDurationWindow(item.duration, windowHours)) return false;
      return true;
    });

    const totalRows = filteredRows.length;
    const skip = (options.page - 1) * options.pageSize;
    const pagedRows = filteredRows.slice(skip, skip + options.pageSize);
    const referrerTypeCounts = toReferrerTypeStatsFromRows(filteredRows);
    return buildDetailPayload(report, rule, pagedRows, {
      page: options.page,
      pageSize: options.pageSize,
      totalRows,
      referrerTypeCounts,
      journeyConfig,
      journeySourceRows: filteredRows,
    });
  }

  const skip = (options.page - 1) * options.pageSize;
  const [totalRows, rawRows, groupedByTypeRaw, journeyRowsRaw] = await Promise.all([
    referrerRaws.countByReport(report.id),
    referrerRaws.listByReport(report.id, { skip, take: options.pageSize }),
    referrerRaws.countByReportGroupedType(report.id),
    journeyConfig ? referrerRaws.listByReport(report.id) : Promise.resolve([]),
  ]);
  const groupedByType = (groupedByTypeRaw as Array<{ referrerType: string; _count?: { _all?: number } }>).map(
    (item) => ({
      referrerType: item.referrerType || 'unknown',
      count: Number(item._count?._all) || 0,
    }),
  );

  return buildDetailPayload(report, rule, rawRows as ReferrerRawRecord[], {
    page: options.page,
    pageSize: options.pageSize,
    totalRows: Number(totalRows) || 0,
    referrerTypeCounts: groupedByType,
    journeyConfig,
    journeySourceRows: journeyRowsRaw as ReferrerRawRecord[],
  });
}
