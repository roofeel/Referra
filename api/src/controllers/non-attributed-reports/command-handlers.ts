import { clients, nonAttributedRaws, nonAttributedReports, reports, urlRules } from '../../../../packages/db/index.js';
import { normalizeAttributionLogicMapping, type AttributionLogicMapping, type ReportType } from '../../config/attribution.config.js';
import { findColumnName, parseCsvRows } from '../../lib/reports-csv.lib.js';
import { normalizeReportTaskStatus, progressLabelFor } from '../../lib/reports-presentation.lib.js';
import { executeNonAttributedReportRows, type UrlRuleExecutor } from '../../services/non-attributed-reports-execution.service.js';
import { buildDynamicUrlRuleExecutor } from '../shared/url-rule-executor.helpers.js';
import {
  asNonAttributedJson,
  collectAttributedUidSet,
  extractUidFromUrlByParam,
  normalizeNonAttributedAttributionLogicMapping,
  resolveAttributionLogicFromBody,
  resolveReportTypeFromBody,
  toTask,
} from './helpers.js';
import type { NonAttributedExecutionRow, RequestWithParams } from './types.js';

export async function create(req: Request) {
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

  const executeRule = buildDynamicUrlRuleExecutor(existingRule.logicSource) as UrlRuleExecutor;

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
}

export async function updateStatus(req: Request) {
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
}

export async function rerun(req: Request) {
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

  const executeRule = buildDynamicUrlRuleExecutor(existingRule.logicSource) as UrlRuleExecutor;

  try {
    const executionRows: NonAttributedExecutionRow[] = existingRows
      .map((row: { json: unknown }) => {
        const rowJson = asNonAttributedJson(row.json) as Record<string, string>;
        const rawEventUrl = String(rowJson[storedFieldMappings.event_url] ?? '');
        const eventTimeKey = storedFieldMappings.event_time?.trim() || '';
        const sourceTimeKey = storedFieldMappings.source_time?.trim() || eventTimeKey;

        return {
          eventUrl: rawEventUrl,
          eventTime: eventTimeKey ? String(rowJson[eventTimeKey] ?? '') : '',
          sourceTime: sourceTimeKey ? String(rowJson[sourceTimeKey] ?? '') : '',
          json: { ...rowJson },
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
}

export async function remove(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const current = await nonAttributedReports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
  }

  await nonAttributedReports.delete(request.params.id);
  return new Response(null, { status: 204 });
}
