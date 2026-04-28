import { clients, nonAttributedRaws, nonAttributedReports, reports, urlRules } from '../../../packages/db/index.js';
import { normalizeAttributionLogicMapping } from '../config/attribution.config.js';
import { findColumnName, parseCsvRows } from '../lib/reports-csv.lib.js';
import { progressLabelFor } from '../lib/reports-presentation.lib.js';
import { executeNonAttributedReportRows, type UrlRuleExecutor } from './non-attributed-reports-execution.service.js';
import { ServiceError } from './service-error.js';
import { buildDynamicUrlRuleExecutor } from '../controllers/shared/url-rule-executor.helpers.js';
import {
  asNonAttributedJson,
  collectAttributedUidSet,
  extractUidFromUrlByParam,
  normalizeNonAttributedAttributionLogicMapping,
  resolveAttributionLogicFromBody,
  resolveReportTypeFromBody,
} from '../controllers/non-attributed-reports/helpers.js';
import type { NonAttributedExecutionRow } from '../controllers/non-attributed-reports/types.js';

export type CreateNonAttributedReportBody = {
  taskName?: string;
  client?: string;
  source?: string;
  sourceIcon?: string;
  reportType?: unknown;
  attributionLogic?: unknown;
  fieldMappings?: Record<string, string>;
  fileName?: string;
  fileContent?: string;
  ruleId?: string;
  attributedReportId?: string;
  uidParamName?: string;
};

export async function createNonAttributedReportTask(body: CreateNonAttributedReportBody) {
  const taskName = body.taskName?.trim();
  const clientName = body.client?.trim();
  const ruleId = body.ruleId?.trim();
  const attributedReportId = body.attributedReportId?.trim();
  const uidParamName = body.uidParamName?.trim() || 'uid';

  if (!taskName) throw new ServiceError(400, 'taskName is required');
  if (!clientName) throw new ServiceError(400, 'client is required');
  if (!ruleId) throw new ServiceError(400, 'ruleId is required');
  if (!attributedReportId) throw new ServiceError(400, 'attributedReportId is required');
  if (!uidParamName) throw new ServiceError(400, 'uidParamName is required');

  const existingAttributedReport = await reports.findById(attributedReportId);
  if (!existingAttributedReport) throw new ServiceError(400, 'attributedReportId is invalid');
  const attributedEventUrlColumn =
    normalizeAttributionLogicMapping(existingAttributedReport.fieldMappings)?.event_url || null;
  const attributedUidSet = await collectAttributedUidSet(attributedReportId, uidParamName, attributedEventUrlColumn);

  const existingRule = await urlRules.findById(ruleId);
  if (!existingRule) throw new ServiceError(400, 'ruleId is invalid');

  if (!body.fileContent || typeof body.fileContent !== 'string') {
    throw new ServiceError(400, 'fileContent is required');
  }

  const attributionLogic = resolveAttributionLogicFromBody(body);
  const reportType = resolveReportTypeFromBody(body);
  if (!attributionLogic) {
    throw new ServiceError(400, 'attributionLogic is invalid. Expect {event_url,event_time} with optional {source_url,source_time}');
  }

  const parsedCsv = parseCsvRows(body.fileContent);
  if (parsedCsv.headers.length === 0) throw new ServiceError(400, 'CSV header is required');

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
    throw new ServiceError(400, 'CSV headers must match attributionLogic mapping for event_url and event_time');
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

    return await executeNonAttributedReportRows({
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ServiceError(500, `Non-attributed report execution failed: ${message}`);
  }
}

export async function rerunNonAttributedReportTask(reportId: string) {
  const current = await nonAttributedReports.findById(reportId);
  if (!current) throw new ServiceError(404, 'Non-attributed report task not found');

  const existingRule = await urlRules.findById(current.ruleId);
  if (!existingRule) throw new ServiceError(400, 'ruleId is invalid');

  const linkedAttributedReport = await reports.findById(current.attributedReportId);
  if (!linkedAttributedReport) throw new ServiceError(400, 'attributedReportId is invalid');
  const linkedAttributedEventUrlColumn =
    normalizeAttributionLogicMapping(linkedAttributedReport.fieldMappings)?.event_url || null;
  const linkedAttributedUidSet = await collectAttributedUidSet(
    current.attributedReportId,
    current.uidParamName || 'uid',
    linkedAttributedEventUrlColumn,
  );

  const storedFieldMappings = normalizeNonAttributedAttributionLogicMapping(current.fieldMappings);
  if (!storedFieldMappings) throw new ServiceError(400, 'Stored fieldMappings is invalid');

  const existingRows = await nonAttributedRaws.listByReport(current.id);
  if (!existingRows.length) throw new ServiceError(400, 'No source rows found to rerun');

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

    return await executeNonAttributedReportRows({
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ServiceError(500, `Rerun failed: ${message}`);
  }
}
