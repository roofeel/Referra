import { referrerRaws } from '../../../../packages/db/index.js';
import {
  ATTRIBUTION_ALIAS_CONFIG,
  isAttributionMode,
  type AttributionLogicMapping,
  type ReportType,
} from '../../config/attribution.config.js';
import {
  computeSuccessRateAvg,
  formatCreatedAt,
  normalizeReportTaskStatus,
  type ReportTaskStatus,
} from '../../lib/reports-presentation.lib.js';
import { parseUrl } from '../../lib/reports-url.lib.js';
import { asJsonRecord, getJsonValue, normalizeKey } from '../shared/json.helpers.js';
import type {
  NonAttributedReportLogItem,
  NonAttributedReportRecord,
  NonAttributedReportsPayload,
  NonAttributedReportTask,
} from './types.js';

export function toTask(item: NonNullable<NonAttributedReportRecord>): NonAttributedReportTask {
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
    attributedReportId: item.attributedReportId,
    attributedReportTaskName: item.attributedReport?.taskName || '-',
    uidParamName: item.uidParamName || 'uid',
  };
}

export function buildPayload(
  filteredTasks: NonAttributedReportTask[],
  clientNames: string[],
  rules: Array<{ id: string; name: string }>,
  attributedReports: Array<{ id: string; taskName: string; clientName: string }>,
  urlParsingVersions: string[],
  dataPoints24h: string,
): NonAttributedReportsPayload {
  return {
    metrics: {
      totalTasks: filteredTasks.length,
      activeAnalyses: filteredTasks.filter((task) => task.status === 'Running').length,
      successRateAvg: computeSuccessRateAvg(filteredTasks),
      dataPoints24h,
    },
    clients: clientNames,
    rules,
    attributedReports,
    urlParsingVersions,
    tasks: filteredTasks,
  };
}

export function resolveAttributionLogicFromBody(body: {
  attributionLogic?: unknown;
  fieldMappings?: Record<string, string>;
}) {
  const mapped = normalizeNonAttributedAttributionLogicMapping(body.attributionLogic);
  if (mapped) return mapped;

  if (!isAttributionMode(body.attributionLogic) || !body.fieldMappings) {
    return null;
  }

  const aliasConfig = ATTRIBUTION_ALIAS_CONFIG[body.attributionLogic];
  const sourceUrl = body.fieldMappings[aliasConfig.source_url] || body.fieldMappings.source_url || '';
  const eventUrl = body.fieldMappings[aliasConfig.event_url] || body.fieldMappings.event_url || '';
  const sourceTime = body.fieldMappings[aliasConfig.source_time] || body.fieldMappings.source_time || '';
  const eventTime = body.fieldMappings[aliasConfig.event_time] || body.fieldMappings.event_time || '';

  return normalizeNonAttributedAttributionLogicMapping({
    source_url: sourceUrl,
    event_url: eventUrl,
    source_time: sourceTime,
    event_time: eventTime,
  });
}

export function normalizeNonAttributedAttributionLogicMapping(input: unknown): AttributionLogicMapping | null {
  if (!input || typeof input !== 'object') return null;

  const item = input as Record<string, unknown>;
  const eventUrl = typeof item.event_url === 'string' ? item.event_url.trim() : '';
  const eventTime = typeof item.event_time === 'string' ? item.event_time.trim() : '';
  const sourceUrlRaw = typeof item.source_url === 'string' ? item.source_url.trim() : '';
  const sourceTimeRaw = typeof item.source_time === 'string' ? item.source_time.trim() : '';

  if (!eventUrl) {
    return null;
  }

  return {
    source_url: sourceUrlRaw || eventUrl,
    event_url: eventUrl,
    source_time: sourceTimeRaw || eventTime || '',
    event_time: eventTime,
  };
}

export function resolveReportTypeFromBody(body: { reportType?: unknown; attributionLogic?: unknown }): ReportType {
  if (isAttributionMode(body.reportType)) return body.reportType;
  if (isAttributionMode(body.attributionLogic)) return body.attributionLogic;
  return 'registration';
}

export function toLog(item: { id: string; level: string; message: string; createdAt: Date | string }): NonAttributedReportLogItem {
  return {
    id: item.id,
    level: item.level,
    message: item.message,
    createdAt: new Date(item.createdAt).toISOString(),
  };
}

export function withPrimaryCandidate(primary: string | null, fallback: string[]) {
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

export function extractUidFromUrlByParam(rawUrl: string, uidParamName: string) {
  const parsed = parseUrl(rawUrl);
  if (!parsed) return '';

  const target = uidParamName.trim().toLowerCase();
  if (!target) return '';

  for (const [key, value] of parsed.searchParams.entries()) {
    if (key.trim().toLowerCase() !== target) continue;
    const uid = value.trim();
    if (uid) return uid;
  }

  return '';
}

export async function collectAttributedUidSet(
  attributedReportId: string,
  uidParamName: string,
  attributedEventUrlColumn: string | null,
) {
  const rows = await referrerRaws.listByReport(attributedReportId);
  const uidSet = new Set<string>();
  const eventUrlCandidates = withPrimaryCandidate(attributedEventUrlColumn, [
    'event_url',
    'registration_url',
    'page_load_url',
    'url',
    'ourl',
  ]);

  for (const row of rows as Array<{ json: unknown }>) {
    const json = asJsonRecord(row.json);
    const eventUrl = getJsonValue(json, eventUrlCandidates);
    if (!eventUrl) continue;

    const uid = extractUidFromUrlByParam(eventUrl, uidParamName);
    if (uid) {
      uidSet.add(uid);
    }
  }

  return uidSet;
}

export function asNonAttributedJson(value: unknown): Record<string, unknown> {
  return asJsonRecord(value);
}
