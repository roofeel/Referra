import { clients, nonAttributedLogs, nonAttributedReports, reports, urlRules } from '../../../../packages/db/index.js';
import { formatCompactCount, normalizeReportTaskStatus } from '../../lib/reports-presentation.lib.js';
import { getNonAttributedReportDetailPayload } from '../../services/non-attributed-reports-detail.service.js';
import { endOfDay, startOfDay } from '../shared/date.helpers.js';
import { buildPayload, toLog, toTask } from './helpers.js';
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
  let attributedReportsPayload: Array<{ id: string; taskName: string; clientName: string }> = [];
  let urlParsingVersions: string[] = [];
  let dataPoints24h = '0';

  try {
    const [reportRowsRaw, clientRowsRaw, rulesRaw, attributedReportsRaw, updated24hRows] = await Promise.all([
      nonAttributedReports.list({
        status,
        client: client || undefined,
        search: search || undefined,
        startDate: startDateValue || undefined,
        endDate: endDateValue || undefined,
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
}

export async function listLogs(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const current = await nonAttributedReports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
  }

  const items = await nonAttributedLogs.listByReport(request.params.id);
  return Response.json(items.map((item: any) => toLog(item)));
}

export async function detail(req: Request) {
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
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(200, Math.floor(pageSizeRaw)) : 50;
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
}
