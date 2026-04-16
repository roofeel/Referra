import { parseUrl, getSearchParamIgnoreCase } from '../../lib/reports-url.lib.js';
import {
  computeSuccessRateAvg,
  formatCreatedAt,
  normalizeReportTaskStatus,
  type ReportTaskStatus,
} from '../../lib/reports-presentation.lib.js';
import {
  ATTRIBUTION_ALIAS_CONFIG,
  isAttributionMode,
  normalizeAttributionLogicMapping,
  type AttributionLogicMapping,
  type ReportType,
} from '../../config/attribution.config.js';
import type { JourneyConfig } from '../../services/reports-journey.service.js';
import { asJsonRecord, getJsonValue } from '../shared/json.helpers.js';
import type { NormalizedJourneyConfig, ReportLogItem, ReportRecord, ReportsPayload, ReportTask, UrlRuleRecord } from './types.js';

export function toReportTask(item: NonNullable<ReportRecord>): ReportTask {
  return {
    id: item.id,
    taskName: item.taskName,
    client: item.client?.name || 'Unknown Client',
    source: item.source,
    sourceIcon: item.sourceIcon,
    status: (normalizeReportTaskStatus(item.status) || 'Running') as ReportTaskStatus,
    progress: item.progress,
    progressLabel: item.progressLabel,
    attribution: item.attribution,
    createdAt: formatCreatedAt(item.createdAt),
  };
}

export function buildPayload(
  filteredTasks: ReportTask[],
  clientNames: string[],
  rules: Array<{ id: string; name: string }>,
  athenaTableItems: Array<{ id: string; tableType: string; tableNamePattern: string; columns: string[] }>,
  urlParsingVersions: string[],
  dataPoints24h: string,
): ReportsPayload {
  return {
    metrics: {
      totalTasks: filteredTasks.length,
      activeAnalyses: filteredTasks.filter((task) => task.status === 'Running').length,
      successRateAvg: computeSuccessRateAvg(filteredTasks),
      dataPoints24h,
    },
    clients: clientNames,
    rules,
    athenaTables: athenaTableItems,
    urlParsingVersions,
    tasks: filteredTasks,
  };
}

function splitColumnDefinitions(definition: string): string[] {
  const items: string[] = [];
  let current = '';
  let parenDepth = 0;
  let angleDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let index = 0; index < definition.length; index += 1) {
    const char = definition[index];
    const prev = index > 0 ? definition[index - 1] : '';

    if (char === "'" && !inDoubleQuote && !inBacktick && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }
    if (char === '"' && !inSingleQuote && !inBacktick && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }
    if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      current += char;
      continue;
    }

    if (inSingleQuote || inDoubleQuote || inBacktick) {
      current += char;
      continue;
    }

    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === '<') angleDepth += 1;
    if (char === '>') angleDepth = Math.max(0, angleDepth - 1);

    if (char === ',' && parenDepth === 0 && angleDepth === 0) {
      const token = current.trim();
      if (token) items.push(token);
      current = '';
      continue;
    }

    current += char;
  }

  const lastToken = current.trim();
  if (lastToken) {
    items.push(lastToken);
  }
  return items;
}

function pickColumnName(definition: string): string {
  const trimmed = definition.trim();
  if (!trimmed) return '';
  if (/^(primary|unique|foreign|constraint|index|key)\b/i.test(trimmed)) return '';

  const backtick = trimmed.match(/^`([^`]+)`/);
  if (backtick?.[1]) return backtick[1].trim();
  const doubleQuoted = trimmed.match(/^"([^"]+)"/);
  if (doubleQuoted?.[1]) return doubleQuoted[1].trim();
  const bare = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
  return bare?.[1] ? bare[1].trim() : '';
}

export function extractAthenaColumnsFromDdl(ddl: string | null | undefined): string[] {
  const source = typeof ddl === 'string' ? ddl.trim() : '';
  if (!source) return [];

  const seen = new Set<string>();
  const columns: string[] = [];
  const addColumn = (name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    columns.push(normalized);
  };

  const mainMatch = source.match(
    /\(([\s\S]*?)\)\s*(?:PARTITIONED\s+BY|COMMENT|ROW\s+FORMAT|STORED\s+AS|LOCATION|TBLPROPERTIES|WITH|$)/i,
  );
  if (mainMatch?.[1]) {
    splitColumnDefinitions(mainMatch[1]).forEach((definition) => {
      addColumn(pickColumnName(definition));
    });
  }

  const partitionMatch = source.match(
    /PARTITIONED\s+BY\s*\(([\s\S]*?)\)\s*(?:COMMENT|ROW\s+FORMAT|STORED\s+AS|LOCATION|TBLPROPERTIES|WITH|$)/i,
  );
  if (partitionMatch?.[1]) {
    splitColumnDefinitions(partitionMatch[1]).forEach((definition) => {
      addColumn(pickColumnName(definition));
    });
  }

  return columns;
}

export function normalizeJourneyConfig(input: unknown): NormalizedJourneyConfig | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }
  const item = input as Record<string, unknown>;
  const athenaTableId = typeof item.athenaTableId === 'string' ? item.athenaTableId.trim() : '';
  const eventUrlParam = typeof item.eventUrlParam === 'string' ? item.eventUrlParam.trim() : '';
  const athenaUrlParam = typeof item.athenaUrlParam === 'string' ? item.athenaUrlParam.trim() : '';
  const athenaUrlField = typeof item.athenaUrlField === 'string' ? item.athenaUrlField.trim() : '';
  const athenaTimeField = typeof item.athenaTimeField === 'string' ? item.athenaTimeField.trim() : '';
  if (!athenaTableId || !eventUrlParam || !athenaUrlParam || !athenaUrlField || !athenaTimeField) {
    return null;
  }
  return {
    athenaTableId,
    eventUrlParam,
    athenaUrlParam,
    athenaUrlField,
    athenaTimeField,
  };
}

export function normalizeJourneyConfigFromFieldMappings(fieldMappings: unknown): JourneyConfig | null {
  if (!fieldMappings || typeof fieldMappings !== 'object' || Array.isArray(fieldMappings)) {
    return null;
  }
  const record = fieldMappings as Record<string, unknown>;
  const raw = record.__journeyConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const normalized = normalizeJourneyConfig(raw);
  if (!normalized) return null;
  const item = raw as Record<string, unknown>;
  const athenaTableName = typeof item.athenaTableName === 'string' ? item.athenaTableName.trim() : '';
  if (!athenaTableName) return null;
  return {
    ...normalized,
    athenaTableName,
  };
}

export function resolveAttributionLogicFromBody(body: {
  attributionLogic?: unknown;
  fieldMappings?: Record<string, string>;
}) {
  const mapped = normalizeAttributionLogicMapping(body.attributionLogic);
  if (mapped) return mapped;

  if (!isAttributionMode(body.attributionLogic) || !body.fieldMappings) {
    return null;
  }

  const aliasConfig = ATTRIBUTION_ALIAS_CONFIG[body.attributionLogic];
  const sourceUrl = body.fieldMappings[aliasConfig.source_url] || body.fieldMappings.source_url || '';
  const eventUrl = body.fieldMappings[aliasConfig.event_url] || body.fieldMappings.event_url || '';
  const sourceTime = body.fieldMappings[aliasConfig.source_time] || body.fieldMappings.source_time || '';
  const eventTime = body.fieldMappings[aliasConfig.event_time] || body.fieldMappings.event_time || '';

  return normalizeAttributionLogicMapping({
    source_url: sourceUrl,
    event_url: eventUrl,
    source_time: sourceTime,
    event_time: eventTime,
  });
}

export function resolveReportTypeFromBody(body: { reportType?: unknown; attributionLogic?: unknown }): ReportType {
  if (isAttributionMode(body.reportType)) return body.reportType;
  if (isAttributionMode(body.attributionLogic)) return body.attributionLogic;
  return 'registration';
}

export function toReportLog(item: { id: string; level: string; message: string; createdAt: Date | string }): ReportLogItem {
  return {
    id: item.id,
    level: item.level,
    message: item.message,
    createdAt: new Date(item.createdAt).toISOString(),
  };
}

export function getStringField(row: Record<string, unknown>, field: string) {
  const raw = row[field];
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return '';
}

export function pickTimeField(
  row: Record<string, unknown>,
  primaryField: string,
  fallbackCandidates: string[],
) {
  const primary = getStringField(row, primaryField);
  if (primary) return primary;
  for (const candidate of fallbackCandidates) {
    const value = getStringField(row, candidate);
    if (value) return value;
  }
  return '';
}

export function resolveIdValueFromRawRow(
  row: Record<string, unknown>,
  idField: string,
  eventUrlFieldFromMapping: string,
) {
  const direct = getJsonValue(row, [idField, 'uid']);
  if (direct) return direct;

  const eventUrl = getJsonValue(row, [
    eventUrlFieldFromMapping,
    'event_url',
    'registration_url',
    'page_load_url',
    'url',
    'ourl',
  ]);
  const parsed = parseUrl(eventUrl);
  if (parsed) {
    const byIdField = getSearchParamIgnoreCase(parsed, idField).trim();
    if (byIdField) return byIdField;
    const byUid = getSearchParamIgnoreCase(parsed, 'uid').trim();
    if (byUid) return byUid;
  }

  return extractUidFromRawJson(row);
}

export function formatTimestampFromMs(ms: number) {
  const date = new Date(ms);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

export function extractUidFromRawJson(row: Record<string, unknown>) {
  const directUid = getJsonValue(row, ['uid']);
  if (directUid) return directUid;

  const urlCandidates = [
    getStringField(row, 'event_url'),
    getStringField(row, 'registration_url'),
    getStringField(row, 'page_load_url'),
    getStringField(row, 'url'),
    getStringField(row, 'ourl'),
  ].filter(Boolean);
  for (const urlValue of urlCandidates) {
    const parsed = parseUrl(urlValue);
    if (!parsed) continue;
    const uid = getSearchParamIgnoreCase(parsed, 'uid').trim();
    if (uid) return uid;
  }

  return '';
}

export function extractUidFromEventUrl(urlValue: string) {
  const parsed = parseUrl(urlValue);
  if (!parsed) return '';
  return getSearchParamIgnoreCase(parsed, 'uid').trim();
}

export function asReportJson(value: unknown) {
  return asJsonRecord(value);
}

export function asReportRuleRows(value: unknown): Array<NonNullable<UrlRuleRecord>> {
  return value as Array<NonNullable<UrlRuleRecord>>;
}
