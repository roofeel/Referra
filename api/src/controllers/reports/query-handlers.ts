import { athenaTables, clients, logs, referrerRaws, reports, urlRules } from '../../../../packages/db/index.js';
import { normalizeAttributionLogicMapping } from '../../config/attribution.config.js';
import { formatCompactCount, normalizeReportTaskStatus } from '../../lib/reports-presentation.lib.js';
import { getReportDetailPayload } from '../../services/reports-detail.service.js';
import { endOfDay, startOfDay } from '../shared/date.helpers.js';
import { getJsonValue } from '../shared/json.helpers.js';
import {
  asReportJson,
  buildPayload,
  extractAthenaColumnsFromDdl,
  extractUidFromEventUrl,
  extractUidFromRawJson,
  toReportLog,
  toReportTask,
} from './helpers.js';
import type { RequestWithParams, UrlRuleRecord } from './types.js';

export async function list(req: Request) {
  const url = new URL(req.url);
  const status = normalizeReportTaskStatus(url.searchParams.get('status'));
  const client = url.searchParams.get('client')?.trim();
  const search = url.searchParams.get('search')?.trim();
  const startDateRaw = url.searchParams.get('startDate')?.trim() || '';
  const endDateRaw = url.searchParams.get('endDate')?.trim() || '';
  const startDateValue = startOfDay(startDateRaw);
  const endDateValue = endOfDay(endDateRaw);

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
        startDate: startDateValue || undefined,
        endDate: endDateValue || undefined,
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
}

export async function listLogs(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const current = await reports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Report task not found' }, { status: 404 });
  }

  const items = await logs.listByReport(request.params.id);
  return Response.json(items.map((item: any) => toReportLog(item)));
}

export async function detail(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const url = new URL(req.url);
  const pageRaw = Number(url.searchParams.get('page') || '1');
  const pageSizeRaw = Number(url.searchParams.get('pageSize') || '50');
  const windowHoursRaw = Number(url.searchParams.get('windowHours') || '');
  const impressionToFirstPageLoadHoursRaw = Number(url.searchParams.get('impressionToFirstPageLoadHours') || '');
  const firstPageLoadToRegistrationHoursRaw = Number(url.searchParams.get('firstPageLoadToRegistrationHours') || '');
  const durationFilterOperatorRaw = url.searchParams.get('durationFilterOperator')?.trim().toLowerCase();
  const durationFilterOperator = durationFilterOperatorRaw === 'or' ? 'or' : 'and';
  const startDate = url.searchParams.get('startDate')?.trim() || '';
  const endDate = url.searchParams.get('endDate')?.trim() || '';
  const referrerType = url.searchParams.get('referrerType')?.trim() || '';
  const cohortModeRaw = url.searchParams.get('cohortMode')?.trim().toLowerCase();
  const cohortMode = cohortModeRaw === 'cohort' ? 'cohort' : 'non-cohort';
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(200, Math.floor(pageSizeRaw)) : 50;
  const current = await reports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Report task not found' }, { status: 404 });
  }

  const payload = await getReportDetailPayload(current, {
    page,
    pageSize,
    windowHours: windowHoursRaw,
    impressionToFirstPageLoadHours: impressionToFirstPageLoadHoursRaw,
    firstPageLoadToRegistrationHours: firstPageLoadToRegistrationHoursRaw,
    durationFilterOperator,
    referrerType: referrerType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    cohortMode,
  });
  return Response.json(payload);
}

export async function downloadUids(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const current = await reports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Report task not found' }, { status: 404 });
  }

  const rawRows = await referrerRaws.listByReport(current.id);
  const storedFieldMappings = normalizeAttributionLogicMapping(current.fieldMappings);
  const eventUrlField = storedFieldMappings?.event_url || '';
  const uidSet = new Set<string>();

  for (const rawRow of rawRows as Array<{ json: unknown; uid?: unknown }>) {
    const storedUid = typeof rawRow.uid === 'string' ? rawRow.uid.trim() : '';
    if (storedUid) {
      uidSet.add(storedUid);
      continue;
    }

    const json = asReportJson(rawRow.json);
    const eventUrl = getJsonValue(json, [eventUrlField, 'event_url', 'registration_url', 'page_load_url', 'url', 'ourl']);
    const uidFromUrl = extractUidFromEventUrl(eventUrl);
    const uid = uidFromUrl || extractUidFromRawJson(json);
    if (uid) {
      uidSet.add(uid);
    }
  }

  const csv = ['uid', ...Array.from(uidSet).sort((a, b) => a.localeCompare(b))].join('\n');
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="report-${current.id}-uids.csv"`,
    },
  });
}
