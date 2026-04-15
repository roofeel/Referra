import { clients, nonAttributedLogs, nonAttributedRaws, nonAttributedReports, referrerRaws, reports, urlRules } from '../../../packages/db/index.js';
import {
  ATTRIBUTION_ALIAS_CONFIG,
  isAttributionMode,
  normalizeAttributionLogicMapping,
  type AttributionLogicMapping,
  type ReportType,
} from '../config/attribution.config.js';
import { findColumnName, parseCsvRows } from '../lib/reports-csv.lib.js';
import {
  computeSuccessRateAvg,
  formatCompactCount,
  formatCreatedAt,
  normalizeReportTaskStatus,
  progressLabelFor,
  type ReportTaskStatus,
} from '../lib/reports-presentation.lib.js';
import { parseUrl } from '../lib/reports-url.lib.js';
import { getNonAttributedReportDetailPayload } from '../services/non-attributed-reports-detail.service.js';
import { executeNonAttributedReportRows, type UrlRuleExecutor } from '../services/non-attributed-reports-execution.service.js';

type NonAttributedReportTask = {
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
  attributedReportId: string;
  attributedReportTaskName: string;
  uidParamName: string;
};

type NonAttributedReportLogItem = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

type NonAttributedReportsPayload = {
  metrics: {
    totalTasks: number;
    activeAnalyses: number;
    successRateAvg: number;
    dataPoints24h: string;
  };
  clients: string[];
  rules: Array<{ id: string; name: string }>;
  attributedReports: Array<{ id: string; taskName: string; clientName: string }>;
  urlParsingVersions: string[];
  tasks: NonAttributedReportTask[];
};

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

type NonAttributedReportRecord = Awaited<ReturnType<typeof nonAttributedReports.findById>>;
type UrlRuleRecord = Awaited<ReturnType<typeof urlRules.findById>>;
type NonAttributedExecutionRow = {
  eventUrl: string;
  eventTime: string;
  sourceTime: string;
  json: Record<string, string>;
};

function toTask(item: NonNullable<NonAttributedReportRecord>): NonAttributedReportTask {
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

function buildPayload(
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

function resolveAttributionLogicFromBody(body: {
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

function normalizeNonAttributedAttributionLogicMapping(input: unknown): AttributionLogicMapping | null {
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

function resolveReportTypeFromBody(body: { reportType?: unknown; attributionLogic?: unknown }): ReportType {
  if (isAttributionMode(body.reportType)) return body.reportType;
  if (isAttributionMode(body.attributionLogic)) return body.attributionLogic;
  return 'registration';
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

function toLog(item: { id: string; level: string; message: string; createdAt: Date | string }): NonAttributedReportLogItem {
  return {
    id: item.id,
    level: item.level,
    message: item.message,
    createdAt: new Date(item.createdAt).toISOString(),
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

function extractUidFromUrlByParam(rawUrl: string, uidParamName: string) {
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

function startOfDay(dateInput: string) {
  const value = dateInput.trim();
  if (!value) return null;
  const parsed = Date.parse(`${value}T00:00:00`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function endOfDay(dateInput: string) {
  const value = dateInput.trim();
  if (!value) return null;
  const parsed = Date.parse(`${value}T23:59:59.999`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

async function collectAttributedUidSet(
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

export const nonAttributedReportsController = {
  async list(req: Request) {
    const url = new URL(req.url);
    const status = normalizeReportTaskStatus(url.searchParams.get('status'));
    const client = url.searchParams.get('client')?.trim();
    const search = url.searchParams.get('search')?.trim();
    const startDateRaw = url.searchParams.get('startDate')?.trim() || '';
    const endDateRaw = url.searchParams.get('endDate')?.trim() || '';
    const startDate = startOfDay(startDateRaw);
    const endDate = endOfDay(endDateRaw);

    let taskRows: any[] = [];
    let clientNames: string[] = [];
    let rulesPayload: Array<{ id: string; name: string }> = [];
    let attributedReportsPayload: Array<{ id: string; taskName: string; clientName: string }> = [];
    let urlParsingVersions: string[] = [];
    let dataPoints24h = '0';

    try {
      const [reportRowsRaw, clientRowsRaw, rulesRaw, attributedReportsRaw, updated24hRows] = await Promise.all([
        nonAttributedReports.list({
          status,
          client: client || undefined,
          search: search || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        clients.list(),
        urlRules.list(),
        reports.list(),
        nonAttributedReports.listUpdatedAfter(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ]);
      const reportRows = reportRowsRaw as Array<{ client?: { name?: string | null } | null }>;
      const clientRows = clientRowsRaw as Array<{ name?: string | null }>;
      const rules = rulesRaw as Array<NonNullable<UrlRuleRecord>>;
      const attributedReports = attributedReportsRaw as Array<{
        id: string;
        taskName?: string | null;
        client?: { name?: string | null } | null;
      }>;

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

      attributedReportsPayload = attributedReports
        .map((item) => ({
          id: item.id,
          taskName: item.taskName?.trim() || '',
          clientName: item.client?.name?.trim() || 'Unknown Client',
        }))
        .filter((item) => Boolean(item.id) && Boolean(item.taskName))
        .sort((a, b) => a.taskName.localeCompare(b.taskName));

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
      console.error(`Failed to load non-attributed reports metadata from database: ${message}`);
    }

    const tasks = taskRows.map((row) => toTask(row));
    return Response.json(
      buildPayload(tasks, clientNames, rulesPayload, attributedReportsPayload, urlParsingVersions, dataPoints24h),
    );
  },

  async create(req: Request) {
    const body = (await req.json()) as {
      taskName?: string;
      client?: string;
      source?: string;
      sourceIcon?: string;
      reportType?: ReportType;
      attributionLogic?: AttributionLogicMapping | 'registration' | 'pageload';
      fieldMappings?: Record<string, string>;
      fileName?: string;
      fileContent?: string;
      ruleId?: string;
      attributedReportId?: string;
      uidParamName?: string;
    };

    const taskName = body.taskName?.trim();
    const clientName = body.client?.trim();
    const ruleId = body.ruleId?.trim();
    const attributedReportId = body.attributedReportId?.trim();
    const uidParamName = body.uidParamName?.trim() || 'uid';

    if (!taskName) {
      return Response.json({ error: 'taskName is required' }, { status: 400 });
    }

    if (!clientName) {
      return Response.json({ error: 'client is required' }, { status: 400 });
    }

    if (!ruleId) {
      return Response.json({ error: 'ruleId is required' }, { status: 400 });
    }

    if (!attributedReportId) {
      return Response.json({ error: 'attributedReportId is required' }, { status: 400 });
    }

    if (!uidParamName) {
      return Response.json({ error: 'uidParamName is required' }, { status: 400 });
    }

    const existingAttributedReport = await reports.findById(attributedReportId);
    if (!existingAttributedReport) {
      return Response.json({ error: 'attributedReportId is invalid' }, { status: 400 });
    }
    const attributedEventUrlColumn =
      normalizeAttributionLogicMapping(existingAttributedReport.fieldMappings)?.event_url || null;
    const attributedUidSet = await collectAttributedUidSet(attributedReportId, uidParamName, attributedEventUrlColumn);

    const existingRule = await urlRules.findById(ruleId);
    if (!existingRule) {
      return Response.json({ error: 'ruleId is invalid' }, { status: 400 });
    }

    if (!body.fileContent || typeof body.fileContent !== 'string') {
      return Response.json({ error: 'fileContent is required' }, { status: 400 });
    }

    const attributionLogic = resolveAttributionLogicFromBody(body);
    const reportType = resolveReportTypeFromBody(body);
    if (!attributionLogic) {
      return Response.json(
        { error: 'attributionLogic is invalid. Expect {event_url,event_time} with optional {source_url,source_time}' },
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
      findColumnName(parsedCsv.headers, fieldMappings, ['event_url', 'registration_url']);
    const eventTimeColumn =
      (attributionLogic.event_time && parsedCsv.headers.includes(attributionLogic.event_time)
        ? attributionLogic.event_time
        : undefined) ||
      findColumnName(parsedCsv.headers, fieldMappings, ['event_time', 'registration_time']);
    const sourceUrlColumn =
      (attributionLogic.source_url && parsedCsv.headers.includes(attributionLogic.source_url)
        ? attributionLogic.source_url
        : undefined) ||
      findColumnName(parsedCsv.headers, fieldMappings, ['source_url', 'impression_url']) ||
      eventUrlColumn;
    const sourceTimeColumn =
      (attributionLogic.source_time && parsedCsv.headers.includes(attributionLogic.source_time)
        ? attributionLogic.source_time
        : undefined) ||
      findColumnName(parsedCsv.headers, fieldMappings, ['source_time', 'impression_time']) ||
      eventTimeColumn;

    if (!eventUrlColumn || !eventTimeColumn) {
      return Response.json(
        {
          error: 'CSV headers must match attributionLogic mapping for event_url and event_time',
        },
        { status: 400 },
      );
    }
    const resolvedEventUrlColumn = eventUrlColumn;
    const resolvedEventTimeColumn = eventTimeColumn || '';
    const resolvedSourceUrlColumn = sourceUrlColumn || resolvedEventUrlColumn;
    const resolvedSourceTimeColumn = sourceTimeColumn || '';

    const existingClient = await clients.getOrCreateByName(clientName);
    const created = await nonAttributedReports.create({
      clientId: existingClient?.id,
      attributedReportId,
      taskName,
      ruleId,
      source: body.source?.trim() || 'CSV Import',
      sourceIcon: body.sourceIcon?.trim() || 'description',
      status: 'Running',
      progress: 0,
      progressLabel: '0% Processed',
      attribution: '--',
      reportType,
      uidParamName,
      fieldMappings: body.fieldMappings,
    });
    const executeRule = buildUrlRuleExecutor(existingRule.logicSource);

    try {
      const executionRows: NonAttributedExecutionRow[] = parsedCsv.rows
        .map((row) => {
          const rowJson = { ...row };
          const eventUrl = String(row[resolvedEventUrlColumn] ?? '');
          return {
            eventUrl,
            eventTime: resolvedEventTimeColumn ? String(row[resolvedEventTimeColumn] ?? '') : '',
            sourceTime: resolvedSourceTimeColumn ? String(row[resolvedSourceTimeColumn] ?? '') : '',
            json: rowJson,
          };
        })
        .filter((row: NonAttributedExecutionRow) => {
          const uid = extractUidFromUrlByParam(row.eventUrl, uidParamName);
          if (!uid) return true;
          return !attributedUidSet.has(uid);
        });
      const updated = await executeNonAttributedReportRows({
        reportId: created.id,
        rows: executionRows,
        executeRule,
        persistRows: async (rows) => {
          await nonAttributedRaws.createMany(
            rows.map((item) => ({
              nonAttributedReportId: created.id,
              referrerType: item.referrerType,
              referrerDesc: item.referrerDesc,
              duration: item.duration,
              json: item.json,
            })),
          );
        },
        startMessage: `Start non-attributed report processing. rows=${parsedCsv.rows.length}`,
        beforeLoopMessages: [
          `Linked attributed report=${attributedReportId}; uidParamName=${uidParamName}`,
          `Columns mapped: event_url=${resolvedEventUrlColumn}, source_url=${resolvedSourceUrlColumn}, event_time=${resolvedEventTimeColumn}, source_time=${resolvedSourceTimeColumn}`,
          `Skipped rows by matched uid: ${parsedCsv.rows.length - executionRows.length}`,
        ],
        finishMessagePrefix: 'Non-attributed report finished.',
        runtimeErrorPrefix: 'create',
        failureLogPrefix: 'non_attributed_report_failed',
        progressLabelFor,
        logRowInputs: true,
      });
      return Response.json(toTask(updated), { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ error: `Non-attributed report execution failed: ${message}` }, { status: 500 });
    }
  },

  async listLogs(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const current = await nonAttributedReports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
    }

    const items = await nonAttributedLogs.listByReport(request.params.id);
    return Response.json(items.map((item: any) => toLog(item)));
  },

  async detail(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const url = new URL(req.url);
    const pageRaw = Number(url.searchParams.get('page') || '1');
    const pageSizeRaw = Number(url.searchParams.get('pageSize') || '50');
    const windowHoursRaw = Number(url.searchParams.get('windowHours') || '');
    const startDate = url.searchParams.get('startDate')?.trim() || '';
    const endDate = url.searchParams.get('endDate')?.trim() || '';
    const cohortModeRaw = url.searchParams.get('cohortMode')?.trim().toLowerCase();
    const cohortMode = cohortModeRaw === 'cohort' ? 'cohort' : 'non-cohort';
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(200, Math.floor(pageSizeRaw)) : 50;
    const current = await nonAttributedReports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
    }

    const payload = await getNonAttributedReportDetailPayload(current, {
      page,
      pageSize,
      windowHours: windowHoursRaw,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      cohortMode,
    });
    return Response.json(payload);
  },

  async updateStatus(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const body = (await req.json()) as { status?: string; progress?: number };
    const status = normalizeReportTaskStatus(body.status);

    if (!status) {
      return Response.json({ error: 'status is invalid' }, { status: 400 });
    }

    const current = await nonAttributedReports.findById(request.params.id);
    if (!current) {
      return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
    }

    const nextProgress =
      typeof body.progress === 'number' && Number.isFinite(body.progress)
        ? Math.max(0, Math.min(100, Math.round(body.progress)))
        : status === 'Completed'
          ? 100
          : current.progress;

    const updated = await nonAttributedReports.update(request.params.id, {
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

    return Response.json(toTask(updated));
  },

  async rerun(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const current = await nonAttributedReports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
    }

    const existingRule = await urlRules.findById(current.ruleId);
    if (!existingRule) {
      return Response.json({ error: 'ruleId is invalid' }, { status: 400 });
    }
    const linkedAttributedReport = await reports.findById(current.attributedReportId);
    if (!linkedAttributedReport) {
      return Response.json({ error: 'attributedReportId is invalid' }, { status: 400 });
    }
    const linkedAttributedEventUrlColumn =
      normalizeAttributionLogicMapping(linkedAttributedReport.fieldMappings)?.event_url || null;
    const linkedAttributedUidSet = await collectAttributedUidSet(
      current.attributedReportId,
      current.uidParamName || 'uid',
      linkedAttributedEventUrlColumn,
    );

    const storedFieldMappings = normalizeNonAttributedAttributionLogicMapping(current.fieldMappings);
    if (!storedFieldMappings) {
      return Response.json({ error: 'Stored fieldMappings is invalid' }, { status: 400 });
    }

    const existingRows = await nonAttributedRaws.listByReport(current.id);
    if (!existingRows.length) {
      return Response.json({ error: 'No source rows found to rerun' }, { status: 400 });
    }

    await nonAttributedReports.update(current.id, {
      status: 'Running',
      progress: 0,
      progressLabel: progressLabelFor('Running', 0),
    });

    const executeRule = buildUrlRuleExecutor(existingRule.logicSource);

    try {
      const executionRows: NonAttributedExecutionRow[] = existingRows
        .map((row: { json: unknown }) => {
          const rowJson =
            row.json && typeof row.json === 'object' && !Array.isArray(row.json)
              ? ({ ...(row.json as Record<string, string>) } as Record<string, string>)
              : {};
          const rawEventUrl = String(rowJson[storedFieldMappings.event_url] ?? '');
          const eventTimeKey = storedFieldMappings.event_time?.trim() || '';
          const sourceTimeKey = storedFieldMappings.source_time?.trim() || eventTimeKey;

          return {
            eventUrl: rawEventUrl,
            eventTime: eventTimeKey ? String(rowJson[eventTimeKey] ?? '') : '',
            sourceTime: sourceTimeKey ? String(rowJson[sourceTimeKey] ?? '') : '',
            json: rowJson,
          };
        })
        .filter((row: NonAttributedExecutionRow) => {
          const uid = extractUidFromUrlByParam(row.eventUrl, current.uidParamName || 'uid');
          if (!uid) return true;
          return !linkedAttributedUidSet.has(uid);
        });
      const updated = await executeNonAttributedReportRows({
        reportId: current.id,
        rows: executionRows,
        executeRule,
        persistRows: async (rows) => {
          await nonAttributedRaws.replaceByReport(current.id, rows);
        },
        startMessage: `Rerun started. nonAttributedReportId=${current.id} rows=${existingRows.length}`,
        beforeLoopMessages: [`Skipped rows by matched uid: ${existingRows.length - executionRows.length}`],
        finishMessagePrefix: 'Rerun finished.',
        runtimeErrorPrefix: 'rerun',
        failureLogPrefix: 'rerun_failed',
        progressLabelFor,
      });
      return Response.json(toTask(updated));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ error: `Rerun failed: ${message}` }, { status: 500 });
    }
  },

  async delete(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const current = await nonAttributedReports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
    }

    await nonAttributedReports.delete(request.params.id);
    return new Response(null, { status: 204 });
  },
};
