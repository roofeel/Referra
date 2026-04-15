import { athenaTables, clients, logs, referrerRaws, reports, urlRules } from '../../../packages/db/index.js';
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
import { getReportDetailPayload } from '../services/reports-detail.service.js';
import { executeReportRows, type UrlRuleExecutor } from '../services/reports-execution.service.js';
import { buildJourneyLogsForRows, type JourneyConfig } from '../services/reports-journey.service.js';

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
  athenaTables: Array<{ id: string; tableType: string; tableNamePattern: string; columns: string[] }>;
  urlParsingVersions: string[];
  tasks: ReportTask[];
};

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

type ReportRecord = Awaited<ReturnType<typeof reports.findById>>;
type UrlRuleRecord = Awaited<ReturnType<typeof urlRules.findById>>;

function toReportTask(item: NonNullable<ReportRecord>): ReportTask {
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

function buildPayload(
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

function extractAthenaColumnsFromDdl(ddl: string | null | undefined): string[] {
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

function normalizeJourneyConfig(input: unknown): Omit<JourneyConfig, 'athenaTableName'> | null {
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

function normalizeJourneyConfigFromFieldMappings(fieldMappings: unknown): JourneyConfig | null {
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

function toReportLog(item: { id: string; level: string; message: string; createdAt: Date | string }): ReportLogItem {
  return {
    id: item.id,
    level: item.level,
    message: item.message,
    createdAt: new Date(item.createdAt).toISOString(),
  };
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

export const reportsController = {
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
    let athenaTableItems: Array<{ id: string; tableType: string; tableNamePattern: string; columns: string[] }> = [];
    let urlParsingVersions: string[] = [];
    let dataPoints24h = '0';

    try {
      const [reportRowsRaw, clientRowsRaw, rulesRaw, athenaTableRowsRaw, updated24hRows] = await Promise.all([
        reports.list({
          status,
          client: client || undefined,
          search: search || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        clients.list(),
        urlRules.list(),
        athenaTables.list(),
        reports.listUpdatedAfter(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ]);
      const reportRows = reportRowsRaw as Array<{ client?: { name?: string | null } | null }>;
      const clientRows = clientRowsRaw as Array<{ name?: string | null }>;
      const rules = rulesRaw as Array<NonNullable<UrlRuleRecord>>;
      const athenaTableRows = athenaTableRowsRaw as Array<{
        id: string;
        tableType?: string | null;
        tableNamePattern?: string | null;
        ddl?: string | null;
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

      athenaTableItems = athenaTableRows
        .map((item) => ({
          id: item.id,
          tableType: item.tableType?.trim() || '',
          tableNamePattern: item.tableNamePattern?.trim() || '',
          columns: extractAthenaColumnsFromDdl(item.ddl),
        }))
        .filter((item) => Boolean(item.id) && Boolean(item.tableType) && Boolean(item.tableNamePattern))
        .sort((a, b) => `${a.tableType}/${a.tableNamePattern}`.localeCompare(`${b.tableType}/${b.tableNamePattern}`));

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
    return Response.json(buildPayload(tasks, clientNames, rulesPayload, athenaTableItems, urlParsingVersions, dataPoints24h));
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
      journeyConfig?: unknown;
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

    const normalizedJourneyConfig = normalizeJourneyConfig(body.journeyConfig);
    let resolvedJourneyConfig: JourneyConfig | null = null;
    if (body.journeyConfig !== undefined) {
      if (!normalizedJourneyConfig) {
        return Response.json({ error: 'journeyConfig is invalid' }, { status: 400 });
      }
      const targetAthenaTable = await athenaTables.findById(normalizedJourneyConfig.athenaTableId);
      if (!targetAthenaTable) {
        return Response.json({ error: 'journeyConfig.athenaTableId is invalid' }, { status: 400 });
      }
      resolvedJourneyConfig = {
        ...normalizedJourneyConfig,
        athenaTableName: targetAthenaTable.tableNamePattern || targetAthenaTable.tableType || targetAthenaTable.id,
      };
    }

    const attributionLogic = resolveAttributionLogicFromBody(body);
    const reportType = resolveReportTypeFromBody(body);
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
    const reportFieldMappings: Record<string, unknown> = {
      ...(body.fieldMappings || {}),
    };
    if (resolvedJourneyConfig) {
      reportFieldMappings.__journeyConfig = resolvedJourneyConfig;
    }
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
      reportType,
      fieldMappings: reportFieldMappings,
    });
    const executeRule = buildUrlRuleExecutor(existingRule.logicSource);
    const inputRows = parsedCsv.rows.map((row) => ({
      eventUrl: String(row[eventUrlColumn] ?? ''),
      eventTime: String(row[eventTimeColumn] ?? ''),
      sourceTime: String(row[sourceTimeColumn] ?? ''),
      json: row,
    }));
    const journeyLogsByRowIndex = resolvedJourneyConfig
      ? await buildJourneyLogsForRows({
          journeyConfig: resolvedJourneyConfig,
          rows: inputRows.map((item: { eventUrl: string; eventTime: string; sourceTime: string }) => ({
            eventUrl: item.eventUrl,
            eventTime: item.eventTime,
            sourceTime: item.sourceTime,
          })),
        })
      : [];

    try {
      const updated = await executeReportRows({
        reportId: created.id,
        rows: inputRows,
        executeRule,
        persistRows: async (rows) => {
          await referrerRaws.createMany(
            rows.map((item, index) => ({
              reportId: created.id,
              referrerType: item.referrerType,
              referrerDesc: item.referrerDesc,
              duration: item.duration,
              json: item.json,
              journeyLogs: journeyLogsByRowIndex[index] || null,
            })),
          );
        },
        startMessage: `Start report processing. rows=${parsedCsv.rows.length}`,
        beforeLoopMessages: [
          `Columns mapped: event_url=${eventUrlColumn}, source_url=${sourceUrlColumn}, event_time=${eventTimeColumn}, source_time=${sourceTimeColumn}`,
        ],
        finishMessagePrefix: 'Report finished.',
        runtimeErrorPrefix: 'create',
        failureLogPrefix: 'report_failed',
        progressLabelFor,
        logRowInputs: true,
      });
      return Response.json(toReportTask(updated), { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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
    const cohortModeRaw = url.searchParams.get('cohortMode')?.trim().toLowerCase();
    const cohortMode = cohortModeRaw === 'cohort' ? 'cohort' : 'non-cohort';
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(200, Math.floor(pageSizeRaw)) : 50;
    const current = await reports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    const payload = await getReportDetailPayload(current, {
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

  async rerun(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const current = await reports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    const existingRule = await urlRules.findById(current.ruleId);
    if (!existingRule) {
      return Response.json({ error: 'ruleId is invalid' }, { status: 400 });
    }

    const storedFieldMappings = normalizeAttributionLogicMapping(current.fieldMappings);
    if (!storedFieldMappings) {
      return Response.json({ error: 'Stored fieldMappings is invalid' }, { status: 400 });
    }

    const existingRows = await referrerRaws.listByReport(current.id);
    if (!existingRows.length) {
      return Response.json({ error: 'No source rows found to rerun' }, { status: 400 });
    }

    await reports.update(current.id, {
      status: 'Running',
      progress: 0,
      progressLabel: progressLabelFor('Running', 0),
    });

    const executeRule = buildUrlRuleExecutor(existingRule.logicSource);
    const storedJourneyConfig = normalizeJourneyConfigFromFieldMappings(current.fieldMappings);
    const inputRows = existingRows.map((row: { json: unknown }) => {
      const rowJson =
        row.json && typeof row.json === 'object' && !Array.isArray(row.json)
          ? (row.json as Record<string, unknown>)
          : {};
      return {
        eventUrl: String(rowJson[storedFieldMappings.event_url] ?? ''),
        eventTime: String(rowJson[storedFieldMappings.event_time] ?? ''),
        sourceTime: String(rowJson[storedFieldMappings.source_time] ?? ''),
        json: row.json,
      };
    });
    const journeyLogsByRowIndex = storedJourneyConfig
      ? await buildJourneyLogsForRows({
          journeyConfig: storedJourneyConfig,
          rows: inputRows.map((item: { eventUrl: string; eventTime: string; sourceTime: string }) => ({
            eventUrl: item.eventUrl,
            eventTime: item.eventTime,
            sourceTime: item.sourceTime,
          })),
        })
      : [];

    try {
      const updated = await executeReportRows({
        reportId: current.id,
        rows: inputRows,
        executeRule,
        persistRows: async (rows) => {
          await referrerRaws.replaceByReport(
            current.id,
            rows.map((item, index) => ({
              ...item,
              journeyLogs: journeyLogsByRowIndex[index] || null,
            })),
          );
        },
        startMessage: `Rerun started. reportId=${current.id} rows=${existingRows.length}`,
        finishMessagePrefix: 'Rerun finished.',
        runtimeErrorPrefix: 'rerun',
        failureLogPrefix: 'rerun_failed',
        progressLabelFor,
      });
      return Response.json(toReportTask(updated));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ error: `Report rerun failed: ${message}` }, { status: 500 });
    }
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
