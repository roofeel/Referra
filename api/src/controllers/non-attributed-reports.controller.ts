import { clients, nonAttributedLogs, nonAttributedRaws, nonAttributedReports, reports, urlRules } from '../../../packages/db/index.js';
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

function stripParamFromEventUrl(rawUrl: string, paramName: string) {
  const normalizedParamName = paramName.trim().toLowerCase();
  if (!normalizedParamName) return rawUrl;

  const parsed = parseUrl(rawUrl);
  if (!parsed) return rawUrl;

  const keys = Array.from(new Set(Array.from(parsed.searchParams.keys())));
  for (const key of keys) {
    if (key.toLowerCase() === normalizedParamName) {
      parsed.searchParams.delete(key);
    }
  }

  return parsed.toString();
}

function withPatchedEventUrl(
  row: Record<string, string>,
  eventUrlColumn: string,
  uidParamName: string,
): { eventUrl: string; rowJson: Record<string, string> } {
  const rawEventUrl = String(row[eventUrlColumn] ?? '');
  const eventUrl = stripParamFromEventUrl(rawEventUrl, uidParamName);
  return {
    eventUrl,
    rowJson: {
      ...row,
      [eventUrlColumn]: eventUrl,
    },
  };
}

export const nonAttributedReportsController = {
  async list(req: Request) {
    const url = new URL(req.url);
    const status = normalizeReportTaskStatus(url.searchParams.get('status'));
    const client = url.searchParams.get('client')?.trim();
    const search = url.searchParams.get('search')?.trim();

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
      const updated = await executeNonAttributedReportRows({
        reportId: created.id,
        rows: parsedCsv.rows.map((row) => {
          const { eventUrl, rowJson } = withPatchedEventUrl(row, eventUrlColumn, uidParamName);
          return {
            eventUrl,
            eventTime: String(row[eventTimeColumn] ?? ''),
            sourceTime: String(row[sourceTimeColumn] ?? ''),
            json: rowJson,
          };
        }),
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
          `Columns mapped: event_url=${eventUrlColumn}, source_url=${sourceUrlColumn}, event_time=${eventTimeColumn}, source_time=${sourceTimeColumn}`,
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

    const storedFieldMappings = normalizeAttributionLogicMapping(current.fieldMappings);
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
      const updated = await executeNonAttributedReportRows({
        reportId: current.id,
        rows: existingRows.map((row: { json: unknown }) => {
          const rowJson =
            row.json && typeof row.json === 'object' && !Array.isArray(row.json)
              ? ({ ...(row.json as Record<string, string>) } as Record<string, string>)
              : {};
          const rawEventUrl = String(rowJson[storedFieldMappings.event_url] ?? '');
          const eventUrl = stripParamFromEventUrl(rawEventUrl, current.uidParamName || 'uid');
          rowJson[storedFieldMappings.event_url] = eventUrl;

          return {
            eventUrl,
            eventTime: String(rowJson[storedFieldMappings.event_time] ?? ''),
            sourceTime: String(rowJson[storedFieldMappings.source_time] ?? ''),
            json: rowJson,
          };
        }),
        executeRule,
        persistRows: async (rows) => {
          await nonAttributedRaws.replaceByReport(current.id, rows);
        },
        startMessage: `Rerun started. nonAttributedReportId=${current.id} rows=${existingRows.length}`,
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
