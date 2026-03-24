import { clients, logs, referrerRaws, reports, urlRules } from '../../../packages/db/index.js';
import {
  ATTRIBUTION_ALIAS_CONFIG,
  isAttributionMode,
  normalizeAttributionLogicMapping,
  type AttributionLogicMapping,
} from '../config/attribution.config.js';

type ReportTaskStatus = 'Running' | 'Completed' | 'Failed' | 'Paused';

type ReportTask = {
  id: string;
  taskName: string;
  client: string;
  source: string;
  sourceIcon: string;
  status: ReportTaskStatus;
  progress: number;
  progressLabel: string;
  attribution: string;
  createdAt: string;
};

type ReportLogItem = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

type ReportsPayload = {
  metrics: {
    totalTasks: number;
    activeAnalyses: number;
    successRateAvg: number;
    dataPoints24h: string;
  };
  clients: string[];
  rules: Array<{ id: string; name: string }>;
  urlParsingVersions: string[];
  tasks: ReportTask[];
};

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
  category: string;
  type: string;
  status: string;
  duration: string;
};

type ReportDetailEventDetail = {
  url: string;
  ruleVersion: string;
  matchedRuleId: string;
  confidenceScore: string;
  aiResult: string;
  extractedParameters: Array<[string, string]>;
  attributionPath: Array<[string, string, string]>;
};

type ReportDetailPayload = {
  clientName: string;
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

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

type ReportRecord = Awaited<ReturnType<typeof reports.findById>>;
type UrlRuleRecord = Awaited<ReturnType<typeof urlRules.findById>>;
type ReferrerRawRecord = Awaited<ReturnType<typeof referrerRaws.listByReport>>[number];
type UrlRuleExecutor = (ourl: unknown, rl: string, dl: string) => unknown | Promise<unknown>;

function normalizeStatus(raw?: string | null): ReportTaskStatus | undefined {
  const status = raw?.trim().toLowerCase();
  if (!status) return undefined;

  if (status === 'running') return 'Running';
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'paused') return 'Paused';
  return undefined;
}

function computeSuccessRateAvg(list: ReportTask[]) {
  const values = list
    .map((task) => Number.parseFloat(task.attribution.replace('%', '')))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return 0;

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function formatCreatedAt(dateInput: Date | string) {
  const date = new Date(dateInput);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${months[date.getMonth()]} ${pad(date.getDate())}, ${pad(hours12)}:${pad(minutes)} ${ampm}`;
}

function formatCompactCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function progressLabelFor(status: ReportTaskStatus, progress: number) {
  if (status === 'Completed') return '100% Success';
  if (status === 'Running') return `${progress}% Processed`;
  if (status === 'Paused') return `${progress}% Complete`;
  return progress <= 0 ? 'Failed' : `Error after ${progress}%`;
}

function toReportTask(item: NonNullable<ReportRecord>): ReportTask {
  return {
    id: item.id,
    taskName: item.taskName,
    client: item.client?.name || 'Unknown Client',
    source: item.source,
    sourceIcon: item.sourceIcon,
    status: (normalizeStatus(item.status) || 'Running') as ReportTaskStatus,
    progress: item.progress,
    progressLabel: item.progressLabel,
    attribution: item.attribution,
    createdAt: formatCreatedAt(item.createdAt),
  };
}

function buildPayload(
  filteredTasks: ReportTask[],
  clientNames: string[],
  rules: Array<{ id: string; name: string }>,
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
    urlParsingVersions,
    tasks: filteredTasks,
  };
}

function normalizeHeaderKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvRows(fileContent: string) {
  const text = fileContent.replace(/^\uFEFF/, '');
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      row.push(cell);
      cell = '';

      if (row.some((value) => value.trim().length > 0)) {
        matrix.push(row);
      }
      row = [];

      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) {
    matrix.push(row);
  }

  if (matrix.length === 0) {
    return { headers: [], rows: [] as Array<Record<string, string>> };
  }

  const [headerRow, ...dataRows] = matrix;
  if (!headerRow) {
    return { headers: [], rows: [] as Array<Record<string, string>> };
  }

  const headers = headerRow.map((header) => header.trim());
  const rows = dataRows.map((values) => {
    const output: Record<string, string> = {};
    headers.forEach((header, index) => {
      output[header] = values[index] ?? '';
    });
    return output;
  });

  return { headers, rows };
}

function findColumnName(
  headers: string[],
  fieldMappings: Record<string, string>,
  candidates: string[],
): string | undefined {
  const headerByNormalized = new Map<string, string>();
  headers.forEach((header) => {
    const normalized = normalizeHeaderKey(header);
    if (normalized && !headerByNormalized.has(normalized)) {
      headerByNormalized.set(normalized, header);
    }
  });

  for (const candidate of candidates) {
    const mapped = fieldMappings[candidate];
    if (mapped && headers.includes(mapped)) {
      return mapped;
    }

    const byNormalized = headerByNormalized.get(normalizeHeaderKey(candidate));
    if (byNormalized) {
      return byNormalized;
    }
  }

  return undefined;
}

function resolveAttributionLogicFromBody(body: {
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

  const fallback = normalizeAttributionLogicMapping({
    source_url: sourceUrl,
    event_url: eventUrl,
    source_time: sourceTime,
    event_time: eventTime,
  });

  return fallback;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseUrl(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return null;

  const decoded = safeDecode(value);

  try {
    return new URL(decoded);
  } catch {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }
}

function parseTimestampToMs(value: string) {
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

function computeDurationSeconds(eventTimeRaw: string, sourceTimeRaw: string) {
  const eventMs = parseTimestampToMs(eventTimeRaw);
  const sourceMs = parseTimestampToMs(sourceTimeRaw);
  if (eventMs === null || sourceMs === null) {
    return 0;
  }

  return Math.round((eventMs - sourceMs) / 1000);
}

function buildUrlRuleExecutor(logicSource: string | null | undefined): UrlRuleExecutor {
  const source = logicSource?.trim();
  if (!source) {
    return () => ({ referrer_type: 'unknown', referrer_desc: 'empty_logic_source' });
  }

  try {
    const createExecutor = new Function(
      `
${source}
if (typeof categorizeFunnel !== 'function') {
  throw new Error('logicSource must define categorizeFunnel(ourl, rl, dl)');
}
return categorizeFunnel;
`,
    );

    const executor = createExecutor();
    if (typeof executor !== 'function') {
      return () => ({ referrer_type: 'unknown', referrer_desc: 'invalid_logic_source' });
    }

    return executor as UrlRuleExecutor;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return () => ({ referrer_type: 'unknown', referrer_desc: `logic_compile_error:${message}` });
  }
}

function deriveReferrer(result: unknown) {
  if (typeof result === 'string') {
    return {
      referrerType: result || 'unknown',
      referrerDesc: '',
    };
  }

  if (Array.isArray(result)) {
    const [typeRaw, descRaw] = result;
    const referrerType = typeof typeRaw === 'string' && typeRaw.trim() ? typeRaw : 'unknown';
    const referrerDesc =
      typeof descRaw === 'string'
        ? descRaw
        : descRaw === undefined || descRaw === null
          ? ''
          : JSON.stringify(descRaw);

    return {
      referrerType,
      referrerDesc,
    };
  }

  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;
    const referrerTypeRaw =
      record.referrer_type ?? record.referrerType ?? record.type ?? record.channel ?? record.category;
    const referrerDescRaw =
      record.referrer_desc ?? record.referrerDesc ?? record.desc ?? record.description ?? record.detail;

    const referrerType = typeof referrerTypeRaw === 'string' ? referrerTypeRaw : 'unknown';
    const referrerDesc =
      typeof referrerDescRaw === 'string'
        ? referrerDescRaw
        : referrerDescRaw === undefined || referrerDescRaw === null
          ? ''
          : JSON.stringify(referrerDescRaw);

    return {
      referrerType,
      referrerDesc,
    };
  }

  if (result === undefined || result === null) {
    return {
      referrerType: 'unknown',
      referrerDesc: '',
    };
  }

  return {
    referrerType: String(result),
    referrerDesc: '',
  };
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
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }

  const normalizedMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    normalizedMap.set(normalizeKey(key), value);
  }

  for (const key of candidates) {
    const value = normalizedMap.get(normalizeKey(key));
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
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
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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

  const preferredKeys = new Set(['uid', 'user_id', 'userid', 'distinct_id']);
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!value || !value.trim()) continue;
    if (preferredKeys.has(key.trim().toLowerCase())) {
      return value.trim();
    }
  }

  return '--';
}

function extractEventNameFromEventUrl(urlValue: string) {
  const parsed = parseUrl(urlValue);
  if (!parsed) return '';

  const value = parsed.searchParams.get('ev');
  if (!value || !value.trim()) return '';
  return value.trim();
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

function rawRowEventTimeMs(item: ReferrerRawRecord) {
  const json = asJsonRecord(item.json);
  const eventTimeRaw = getJsonValue(json, ['event_time', 'registration_time', 'page_load_time', 'timestamp', 'ts']);
  return parseTimestampToMs(eventTimeRaw);
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

function buildDetailPayload(
  report: NonNullable<ReportRecord>,
  rule: UrlRuleRecord,
  rawRows: ReferrerRawRecord[],
  options: {
    page: number;
    pageSize: number;
    totalRows: number;
    referrerTypeCounts: Array<{ referrerType: string; count: number }>;
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
  const aiConfidenceAvg = totalRows === 0 ? 0 : ((matchedRows * 95 + unmatchedRows * 60) / totalRows);
  const avgDuration =
    totalRows === 0 ? 0 : rawRows.reduce((sum, row) => sum + (Number.isFinite(row.duration) ? row.duration : 0), 0) / totalRows;

  const rows: ReportDetailTableRow[] = rawRows.map((item) => {
    const json = asJsonRecord(item.json);
    const eventUrl =
      getJsonValue(json, ['event_url', 'registration_url', 'page_load_url', 'url', 'ourl']) || '';
    const eventTime = getJsonValue(json, ['event_time', 'registration_time', 'page_load_time', 'timestamp', 'ts']);
    const uid = extractUidFromEventUrl(eventUrl);
    const eventName =
      (extractEventNameFromEventUrl(eventUrl) || getJsonValue(json, ['event_name', 'event', 'event_type', 'action']))
        .toUpperCase() || 'EVENT';
    const status = isMatchedRow(item) ? 'SUCCESS' : 'UNMATCHED';

    return {
      eventId: item.id,
      uid,
      eventName,
      ts: formatTableTimestamp(eventTime),
      category: item.referrerType || 'unknown',
      type: item.referrerDesc || '--',
      status,
      duration: formatDurationLabel(item.duration),
    };
  });

  const eventDetails: Record<string, ReportDetailEventDetail> = {};
  rawRows.forEach((item) => {
    const json = asJsonRecord(item.json);
    const urlValue =
      getJsonValue(json, ['event_url', 'registration_url', 'page_load_url', 'url', 'ourl']) || 'N/A';
    const sourceUrl = getJsonValue(json, ['source_url', 'impression_url', 'source']);
    const sourceTime = getJsonValue(json, ['source_time', 'impression_time']);
    const eventTime = getJsonValue(json, ['event_time', 'registration_time', 'page_load_time', 'timestamp', 'ts']);
    const params = parseQueryParams(urlValue);

    eventDetails[item.id] = {
      url: urlValue,
      ruleVersion: rule?.activeVersion || 'N/A',
      matchedRuleId: report.ruleId || 'N/A',
      confidenceScore: `${(isMatchedRow(item) ? 95 : 60).toFixed(1)}%`,
      aiResult: item.referrerDesc || 'No description',
      extractedParameters: params.length > 0 ? params : [['referrer_type', item.referrerType || 'unknown']],
      attributionPath: [
        ['Source', `${sourceTime || '--'} • ${sourceUrl || '--'}`, 'bg-emerald-500'],
        ['Event URL', `${eventTime || '--'} • ${urlValue}`, 'bg-blue-500'],
        ['Classification', `${item.referrerType || 'unknown'} • ${isMatchedRow(item) ? 'Matched' : 'Unmatched'}`, 'bg-blue-700'],
      ],
    };
  });

  const topTypes = referrerTypeStats
    .slice(0, 4);
  const maxTypeCount = topTypes[0]?.count || 1;
  const distributionColors = ['bg-blue-700', 'bg-blue-500/70', 'bg-blue-300', 'bg-slate-300'];
  const distribution: ReportDetailDistributionItem[] = topTypes.map((item, index) => ({
    label: item.referrerType,
    height: `${Math.max(10, Math.round((item.count / maxTypeCount) * 100))}%`,
    color: distributionColors[index] || 'bg-slate-300',
  }));

  return {
    clientName: report.client?.name || 'Unknown Client',
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

function toReportLog(item: { id: string; level: string; message: string; createdAt: Date | string }): ReportLogItem {
  return {
    id: item.id,
    level: item.level,
    message: item.message,
    createdAt: new Date(item.createdAt).toISOString(),
  };
}

export const reportsController = {
  async list(req: Request) {
    const url = new URL(req.url);
    const status = normalizeStatus(url.searchParams.get('status'));
    const client = url.searchParams.get('client')?.trim();
    const search = url.searchParams.get('search')?.trim();

    let taskRows: any[] = [];
    let clientNames: string[] = [];
    let rulesPayload: Array<{ id: string; name: string }> = [];
    let urlParsingVersions: string[] = [];
    let dataPoints24h = '0';

    try {
      const [reportRowsRaw, clientRowsRaw, rulesRaw, updated24hRows] = await Promise.all([
        reports.list({
          status,
          client: client || undefined,
          search: search || undefined,
        }),
        clients.list(),
        urlRules.list(),
        reports.listUpdatedAfter(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ]);
      const reportRows = reportRowsRaw as Array<{ client?: { name?: string | null } | null }>;
      const clientRows = clientRowsRaw as Array<{ name?: string | null }>;
      const rules = rulesRaw as Array<NonNullable<UrlRuleRecord>>;

      taskRows = reportRows;
      clientNames = Array.from(
        new Set([
          ...clientRows
            .map((item) => item.name?.trim())
            .filter((value: string | undefined): value is string => Boolean(value)),
          ...reportRows
            .map((item) => item.client?.name?.trim())
            .filter((value: string | undefined): value is string => Boolean(value)),
          ...rules
            .map((rule) => rule.client?.name?.trim())
            .filter((value: string | undefined): value is string => Boolean(value)),
        ]),
      ).sort((a, b) => a.localeCompare(b));

      rulesPayload = rules
        .map((rule) => ({ id: rule.id, name: rule.name?.trim() || '' }))
        .filter((rule) => Boolean(rule.id) && Boolean(rule.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      urlParsingVersions = Array.from(
        new Set(
          rules
            .map((rule) => rule.activeVersion?.trim())
            .filter((value: string | undefined): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b));

      dataPoints24h = formatCompactCount(updated24hRows.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load reports metadata from database: ${message}`);
    }

    const tasks = taskRows.map((row) => toReportTask(row));
    return Response.json(buildPayload(tasks, clientNames, rulesPayload, urlParsingVersions, dataPoints24h));
  },

  async create(req: Request) {
    const body = (await req.json()) as {
      taskName?: string;
      client?: string;
      source?: string;
      sourceIcon?: string;
      attributionLogic?: AttributionLogicMapping | 'registration' | 'pageload';
      fieldMappings?: Record<string, string>;
      fileName?: string;
      fileContent?: string;
      ruleId?: string;
    };

    const taskName = body.taskName?.trim();
    const clientName = body.client?.trim();
    const ruleId = body.ruleId?.trim();

    if (!taskName) {
      return Response.json({ error: 'taskName is required' }, { status: 400 });
    }

    if (!clientName) {
      return Response.json({ error: 'client is required' }, { status: 400 });
    }

    if (!ruleId) {
      return Response.json({ error: 'ruleId is required' }, { status: 400 });
    }

    const existingRule = await urlRules.findById(ruleId);
    if (!existingRule) {
      return Response.json({ error: 'ruleId is invalid' }, { status: 400 });
    }

    if (!body.fileContent || typeof body.fileContent !== 'string') {
      return Response.json({ error: 'fileContent is required' }, { status: 400 });
    }

    const attributionLogic = resolveAttributionLogicFromBody(body);
    if (!attributionLogic) {
      return Response.json(
        { error: 'attributionLogic is invalid. Expect {event_url,event_time,source_url,source_time}' },
        { status: 400 },
      );
    }

    const parsedCsv = parseCsvRows(body.fileContent);
    if (parsedCsv.headers.length === 0) {
      return Response.json({ error: 'CSV header is required' }, { status: 400 });
    }

    const fieldMappings = body.fieldMappings || {};
    const eventUrlColumn =
      (attributionLogic.event_url && parsedCsv.headers.includes(attributionLogic.event_url)
        ? attributionLogic.event_url
        : undefined) ||
      findColumnName(parsedCsv.headers, fieldMappings, ['event_url', 'registration_url', 'page_load_url']);
    const eventTimeColumn =
      (attributionLogic.event_time && parsedCsv.headers.includes(attributionLogic.event_time)
        ? attributionLogic.event_time
        : undefined) ||
      findColumnName(parsedCsv.headers, fieldMappings, ['event_time', 'registration_time', 'page_load_time']);
    const sourceUrlColumn =
      (attributionLogic.source_url && parsedCsv.headers.includes(attributionLogic.source_url)
        ? attributionLogic.source_url
        : undefined) ||
      findColumnName(parsedCsv.headers, fieldMappings, ['source_url', 'impression_url']);
    const sourceTimeColumn =
      (attributionLogic.source_time && parsedCsv.headers.includes(attributionLogic.source_time)
        ? attributionLogic.source_time
        : undefined) ||
      findColumnName(parsedCsv.headers, fieldMappings, ['source_time', 'impression_time']);

    if (!eventUrlColumn || !eventTimeColumn || !sourceUrlColumn || !sourceTimeColumn) {
      return Response.json(
        {
          error: 'CSV headers must match attributionLogic mapping for event_url/event_time/source_url/source_time',
        },
        { status: 400 },
      );
    }

    const existingClient = await clients.getOrCreateByName(clientName);
    const created = await reports.create({
      clientId: existingClient?.id,
      taskName,
      ruleId,
      source: body.source?.trim() || 'CSV Import',
      sourceIcon: body.sourceIcon?.trim() || 'description',
      status: 'Running',
      progress: 0,
      progressLabel: '0% Processed',
      attribution: '--',
      attributionLogic,
      fieldMappings: body.fieldMappings,
    });
    const executeRule = buildUrlRuleExecutor(existingRule.logicSource);
    const pendingLogs: Array<{ level: string; message: string }> = [];
    const log = (level: 'info' | 'warn' | 'error', message: string) => {
      pendingLogs.push({ level, message });
    };

    try {
      log('info', `Start report processing. rows=${parsedCsv.rows.length}`);
      log('info', `Columns mapped: event_url=${eventUrlColumn}, source_url=${sourceUrlColumn}, event_time=${eventTimeColumn}, source_time=${sourceTimeColumn}`);

      const rawRowsToCreate: Array<{
        referrerType: string;
        referrerDesc: string;
        duration: number;
        json: unknown;
      }> = [];
      let failedRows = 0;

      for (const [index, row] of parsedCsv.rows.entries()) {
        const rawEventUrl = String(row[eventUrlColumn] ?? '');
        const ourl = parseUrl(rawEventUrl) ?? new URL('https://invalid.local/');
        const rl = safeDecode(ourl.searchParams.get('rl') || '');
        const dl = safeDecode(ourl.searchParams.get('dl') || '');

        let ruleResult: unknown;
        try {
          log('info', `Processing ourl: ${ourl.href}`);
          ruleResult = await executeRule(ourl.href, rl, dl);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failedRows += 1;
          const runtimeError = `logic_runtime_error:${message}`;
          log('error', `row=${index + 1} ${runtimeError}`);
          ruleResult = {
            referrer_type: 'unknown',
            referrer_desc: runtimeError,
          };
        }

        const { referrerType, referrerDesc } = deriveReferrer(ruleResult);
        const duration = computeDurationSeconds(String(row[eventTimeColumn] ?? ''), String(row[sourceTimeColumn] ?? ''));

        rawRowsToCreate.push({
          referrerType,
          referrerDesc,
          duration,
          json: row,
        });
      }

      await referrerRaws.createMany(
        rawRowsToCreate.map((item) => ({
          reportId: created.id,
          referrerType: item.referrerType,
          referrerDesc: item.referrerDesc,
          duration: item.duration,
          json: item.json,
        })),
      );

      const totalRows = parsedCsv.rows.length;
      const successRows = Math.max(0, totalRows - failedRows);
      const successRate = totalRows <= 0 ? 100 : (successRows / totalRows) * 100;
      const finalStatus: ReportTaskStatus = failedRows > 0 ? 'Failed' : 'Completed';
      const finalProgress = 100;

      log('info', `Report finished. status=${finalStatus} total=${totalRows} success=${successRows} failed=${failedRows}`);
      await logs.createMany(
        pendingLogs.map((item) => ({
          reportId: created.id,
          level: item.level,
          message: item.message,
        })),
      );

      const updated = await reports.update(created.id, {
        status: finalStatus,
        progress: finalProgress,
        progressLabel: progressLabelFor(finalStatus, finalProgress),
        attribution: `${successRate.toFixed(1)}%`,
      });

      return Response.json(toReportTask(updated), { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pendingLogs.push({ level: 'error', message: `report_failed:${message}` });
      await logs.createMany(
        pendingLogs.map((item) => ({
          reportId: created.id,
          level: item.level,
          message: item.message,
        })),
      );
      await reports.update(created.id, {
        status: 'Failed',
        progress: 100,
        progressLabel: progressLabelFor('Failed', 100),
        attribution: '--',
      });
      return Response.json({ error: `Report execution failed: ${message}` }, { status: 500 });
    }
  },

  async listLogs(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const current = await reports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    const items = await logs.listByReport(request.params.id);
    return Response.json(items.map((item: any) => toReportLog(item)));
  },

  async detail(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const url = new URL(req.url);
    const pageRaw = Number(url.searchParams.get('page') || '1');
    const pageSizeRaw = Number(url.searchParams.get('pageSize') || '50');
    const windowHoursRaw = Number(url.searchParams.get('windowHours') || '');
    const startDate = url.searchParams.get('startDate')?.trim() || '';
    const endDate = url.searchParams.get('endDate')?.trim() || '';
    const startMs = startDate ? startOfDayMs(startDate) : null;
    const endMs = endDate ? endOfDayMs(endDate) : null;
    const windowHours = [24, 48, 72].includes(windowHoursRaw) ? windowHoursRaw : null;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(200, Math.floor(pageSizeRaw)) : 50;
    const current = await reports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    const rule = await urlRules.findById(current.ruleId);
    const shouldFilter = startMs !== null || endMs !== null || windowHours !== null;

    if (shouldFilter) {
      const allRows = (await referrerRaws.listByReport(request.params.id)) as ReferrerRawRecord[];
      const filteredRows = allRows.filter((item) => {
        const eventMs = rawRowEventTimeMs(item);
        if (eventMs === null && (startMs !== null || endMs !== null)) return false;
        if (startMs !== null && eventMs < startMs) return false;
        if (endMs !== null && eventMs > endMs) return false;
        if (!inDurationWindow(item.duration, windowHours)) return false;
        return true;
      });

      const totalRows = filteredRows.length;
      const skip = (page - 1) * pageSize;
      const pagedRows = filteredRows.slice(skip, skip + pageSize);
      const referrerTypeCounts = toReferrerTypeStatsFromRows(filteredRows);

      return Response.json(
        buildDetailPayload(current, rule, pagedRows, {
          page,
          pageSize,
          totalRows,
          referrerTypeCounts,
        }),
      );
    }

    const skip = (page - 1) * pageSize;
    const [totalRows, rawRows, groupedByTypeRaw] = await Promise.all([
      referrerRaws.countByReport(request.params.id),
      referrerRaws.listByReport(request.params.id, { skip, take: pageSize }),
      referrerRaws.countByReportGroupedType(request.params.id),
    ]);
    const groupedByType = (groupedByTypeRaw as Array<{ referrerType: string; _count?: { _all?: number } }>).map(
      (item) => ({
        referrerType: item.referrerType || 'unknown',
        count: Number(item._count?._all) || 0,
      }),
    );

    return Response.json(
      buildDetailPayload(current, rule, rawRows as ReferrerRawRecord[], {
        page,
        pageSize,
        totalRows: Number(totalRows) || 0,
        referrerTypeCounts: groupedByType,
      }),
    );
  },

  async updateStatus(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const body = (await req.json()) as { status?: string; progress?: number };
    const status = normalizeStatus(body.status);

    if (!status) {
      return Response.json({ error: 'status is invalid' }, { status: 400 });
    }

    const current = await reports.findById(request.params.id);
    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    const nextProgress =
      typeof body.progress === 'number' && Number.isFinite(body.progress)
        ? Math.max(0, Math.min(100, Math.round(body.progress)))
        : status === 'Completed'
          ? 100
          : current.progress;

    const updated = await reports.update(request.params.id, {
      status,
      progress: nextProgress,
      progressLabel: progressLabelFor(status, nextProgress),
      attribution:
        status === 'Completed'
          ? current.attribution === '--'
            ? '100.0%'
            : current.attribution
          : status === 'Failed'
            ? '--'
            : current.attribution,
    });

    return Response.json(toReportTask(updated));
  },

  async delete(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const current = await reports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    await reports.delete(request.params.id);
    return new Response(null, { status: 204 });
  },
};
