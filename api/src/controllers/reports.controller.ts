import { clients, referrerRaws, reports, urlRules } from '../../../packages/db/index.js';

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

type AttributionLogic = 'registration' | 'pageload';

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

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

type ReportRecord = Awaited<ReturnType<typeof reports.findById>>;
type UrlRuleRecord = Awaited<ReturnType<typeof urlRules.findById>>;
type UrlRuleExecutor = (ourl: URL, rl: string, dl: string) => unknown | Promise<unknown>;

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
      attributionLogic?: AttributionLogic;
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

    if (!body.fieldMappings || Object.keys(body.fieldMappings).length === 0) {
      return Response.json({ error: 'fieldMappings is required' }, { status: 400 });
    }

    if (!body.attributionLogic || !['registration', 'pageload'].includes(body.attributionLogic)) {
      return Response.json({ error: 'attributionLogic is invalid' }, { status: 400 });
    }

    const parsedCsv = parseCsvRows(body.fileContent);
    if (parsedCsv.headers.length === 0) {
      return Response.json({ error: 'CSV header is required' }, { status: 400 });
    }

    const fieldMappings = body.fieldMappings || {};
    const eventUrlColumn = findColumnName(parsedCsv.headers, fieldMappings, [
      'event_url',
      'impression_url',
      'registration_url',
      'page_load_url',
    ]);
    const eventTimeColumn = findColumnName(parsedCsv.headers, fieldMappings, [
      'event_time',
      'registration_time',
      'page_load_time',
    ]);
    const sourceTimeColumn = findColumnName(parsedCsv.headers, fieldMappings, ['source_time', 'impression_time']);

    if (!eventUrlColumn || !eventTimeColumn || !sourceTimeColumn) {
      return Response.json(
        {
          error: 'CSV must contain event_url/event_time/source_time (or mapped equivalent columns)',
        },
        { status: 400 },
      );
    }

    const executeRule = buildUrlRuleExecutor(existingRule.logicSource);

    const rawRowsToCreate: Array<{
      referrerType: string;
      referrerDesc: string;
      duration: number;
      json: unknown;
    }> = [];

    for (const row of parsedCsv.rows) {
      const rawEventUrl = String(row[eventUrlColumn] ?? '');
      const ourl = parseUrl(rawEventUrl) ?? new URL('https://invalid.local/');
      const rl = safeDecode(ourl.searchParams.get('rl') || '');
      const dl = safeDecode(ourl.searchParams.get('dl') || '');

      let ruleResult: unknown;
      try {
        ruleResult = await executeRule(ourl, rl, dl);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ruleResult = {
          referrer_type: 'unknown',
          referrer_desc: `logic_runtime_error:${message}`,
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
      attributionLogic: body.attributionLogic,
      fieldMappings: body.fieldMappings,
    });

    await referrerRaws.createMany(
      rawRowsToCreate.map((item) => ({
        reportId: created.id,
        referrerType: item.referrerType,
        referrerDesc: item.referrerDesc,
        duration: item.duration,
        json: item.json,
      })),
    );

    return Response.json(toReportTask(created), { status: 201 });
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
