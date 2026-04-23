import { athenaTables, clients, logs, referrerRaws, reports, urlRules } from '../../../../packages/db/index.js';
import { normalizeAttributionLogicMapping, type AttributionLogicMapping, type ReportType } from '../../config/attribution.config.js';
import { findColumnName, parseCsvRows } from '../../lib/reports-csv.lib.js';
import { parseTimestampToMs } from '../../lib/reports-url.lib.js';
import { progressLabelFor, normalizeReportTaskStatus } from '../../lib/reports-presentation.lib.js';
import { executeReportRows, type ReportInputRow, type UrlRuleExecutor } from '../../services/reports-execution.service.js';
import { buildJourneyLogsForRows, type JourneyConfig } from '../../services/reports-journey.service.js';
import { generateUserJourneyDocFromLogs } from '../../services/reports-user-journey.service.js';
import { buildDynamicUrlRuleExecutor } from '../shared/url-rule-executor.helpers.js';
import {
  asReportJson,
  extractUidFromEventUrl,
  extractUidFromRawJson,
  formatTimestampFromMs,
  getStringField,
  normalizeJourneyConfig,
  normalizeJourneyConfigFromFieldMappings,
  pickTimeField,
  resolveAttributionLogicFromBody,
  resolveIdValueFromRawRow,
  resolveReportTypeFromBody,
  toReportTask,
} from './helpers.js';
import type { ParsedUploadEvent, RequestWithParams } from './types.js';

function normalizeEventLabel(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function isPageLoadEvent(value: string) {
  return normalizeEventLabel(value) === 'pageload';
}

function extractJourneyEventLabel(row: Record<string, unknown>) {
  return (
    getStringField(row, 'event') ||
    getStringField(row, 'event_name') ||
    getStringField(row, 'event_type') ||
    getStringField(row, 'action') ||
    getStringField(row, 'ev')
  );
}

function extractJourneyTimestampMs(row: Record<string, unknown>) {
  const candidates = [
    'page_load_time',
    'event_time',
    'timestamp',
    'ts',
    'time',
    'event_ts',
    'created_at',
  ];
  for (const key of candidates) {
    const ts = getStringField(row, key);
    if (!ts) continue;
    const tsMs = parseTimestampToMs(ts);
    if (tsMs !== null) return tsMs;
  }
  return null;
}

function computeFirstPageLoadDuration(sourceTime: string, journeyLogs: unknown): number | null {
  const sourceMs = parseTimestampToMs(sourceTime);
  if (sourceMs === null || !Array.isArray(journeyLogs)) return null;

  let earliestPageLoadMs: number | null = null;
  for (const item of journeyLogs) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (!isPageLoadEvent(extractJourneyEventLabel(row))) continue;
    const tsMs = extractJourneyTimestampMs(row);
    if (tsMs === null) continue;
    earliestPageLoadMs = earliestPageLoadMs === null ? tsMs : Math.min(earliestPageLoadMs, tsMs);
  }

  if (earliestPageLoadMs === null) return null;
  return Math.max(0, Math.round((earliestPageLoadMs - sourceMs) / 1000));
}

function computeFirstPageLoadDurationFromUploadedEvents(sourceTime: string, matchedRows: ParsedUploadEvent[]): number | null {
  const sourceMs = parseTimestampToMs(sourceTime);
  if (sourceMs === null) return null;

  let earliestPageLoadMs: number | null = null;
  for (const item of matchedRows) {
    const rowEvent = item.row && typeof item.row === 'object' ? getStringField(item.row as Record<string, unknown>, 'event') : '';
    const eventLabel = item.event || rowEvent;
    if (!isPageLoadEvent(eventLabel)) continue;
    const tsMs = Number.isFinite(item.tsMs) ? item.tsMs : null;
    if (tsMs === null) continue;
    earliestPageLoadMs = earliestPageLoadMs === null ? tsMs : Math.min(earliestPageLoadMs, tsMs);
  }

  if (earliestPageLoadMs === null) return null;
  return Math.max(0, Math.round((earliestPageLoadMs - sourceMs) / 1000));
}

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

  const executeRule = buildDynamicUrlRuleExecutor(existingRule.logicSource) as UrlRuleExecutor;
  const inputRows: ReportInputRow[] = parsedCsv.rows.map((row) => {
    const eventUrl = String(row[eventUrlColumn] ?? '');
    const jsonRow = row as Record<string, unknown>;
    return {
      eventUrl,
      eventTime: String(row[eventTimeColumn] ?? ''),
      sourceTime: String(row[sourceTimeColumn] ?? ''),
      uid: extractUidFromEventUrl(eventUrl) || extractUidFromRawJson(jsonRow),
      json: row,
    };
  });

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
  const rowsWithJourney = inputRows.map((item, index) => ({
    ...item,
    firstPageLoadDuration: computeFirstPageLoadDuration(item.sourceTime, journeyLogsByRowIndex[index]),
  }));

  try {
    const updated = await executeReportRows({
      reportId: created.id,
      rows: rowsWithJourney,
      executeRule,
      persistRows: async (rows) => {
        await referrerRaws.createMany(
          rows.map((item, index) => ({
            reportId: created.id,
            referrerType: item.referrerType,
            referrerDesc: item.referrerDesc,
            duration: item.duration,
            uid: item.uid || null,
            json: item.json,
            journeyLogs: journeyLogsByRowIndex[index] ?? null,
            firstPageLoadDuration: item.firstPageLoadDuration ?? null,
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
}

export async function attachRelatedEvents(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const current = await reports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Report task not found' }, { status: 404 });
  }

  const body = (await req.json()) as {
    fileContent?: unknown;
    idField?: unknown;
    timeField?: unknown;
    eventField?: unknown;
    eventUrlField?: unknown;
  };
  const fileContent = typeof body.fileContent === 'string' ? body.fileContent : '';
  const idField = typeof body.idField === 'string' ? body.idField.trim() : '';
  const timeField = typeof body.timeField === 'string' ? body.timeField.trim() : '';
  const eventField = typeof body.eventField === 'string' ? body.eventField.trim() : '';
  const eventUrlFieldRaw = typeof body.eventUrlField === 'string' ? body.eventUrlField.trim() : '';
  const eventUrlField = eventUrlFieldRaw || eventField;

  if (!fileContent) {
    return Response.json({ error: 'fileContent is required' }, { status: 400 });
  }
  if (!idField || !timeField || !eventUrlField) {
    return Response.json({ error: 'idField/timeField/eventUrlField are required' }, { status: 400 });
  }

  const parsedCsv = parseCsvRows(fileContent);
  if (parsedCsv.headers.length === 0) {
    return Response.json({ error: 'CSV header is required' }, { status: 400 });
  }
  if (
    !parsedCsv.headers.includes(idField) ||
    !parsedCsv.headers.includes(timeField) ||
    !parsedCsv.headers.includes(eventUrlField) ||
    (eventField && !parsedCsv.headers.includes(eventField))
  ) {
    return Response.json({ error: 'Selected fields must exist in CSV headers' }, { status: 400 });
  }

  const uploadedEventsById = new Map<string, ParsedUploadEvent[]>();

  let validUploadEventCount = 0;
  for (const item of parsedCsv.rows) {
    const idValue = String(item[idField] ?? '').trim();
    const timeValue = String(item[timeField] ?? '').trim();
    if (!idValue || !timeValue) continue;

    const tsMs = parseTimestampToMs(timeValue);
    if (tsMs === null) continue;

    const eventUrlValue = String(item[eventUrlField] ?? '').trim();
    const eventValue = eventField ? String(item[eventField] ?? '').trim() : '';
    const list = uploadedEventsById.get(idValue) || [];
    list.push({
      idValue,
      tsMs,
      ts: formatTimestampFromMs(tsMs),
      event: eventValue || '--',
      url: eventUrlValue || '--',
      row: item,
    });
    uploadedEventsById.set(idValue, list);
    validUploadEventCount += 1;
  }

  uploadedEventsById.forEach((events, key) => {
    events.sort((a, b) => a.tsMs - b.tsMs);
    uploadedEventsById.set(key, events);
  });

  await reports.update(current.id, {
    relatedEventFieldMappings: {
      idField,
      timeField,
      eventField: eventField || '',
      eventUrlField,
    },
  });

  const storedFieldMappings = normalizeAttributionLogicMapping(current.fieldMappings);
  const sourceTimeField = storedFieldMappings?.source_time || 'source_time';
  const eventTimeField = storedFieldMappings?.event_time || 'event_time';
  const storedEventUrlField = storedFieldMappings?.event_url || '';
  const sourceTimeCandidates = ['source_time', 'impression_time'];
  const eventTimeCandidates = ['event_time', 'registration_time', 'page_load_time', 'timestamp', 'ts'];
  const rawRows = await referrerRaws.listByReport(current.id);

  let missingIdCount = 0;
  let missingSourceTimeCount = 0;
  let missingEventTimeCount = 0;
  let noCandidatesByIdCount = 0;
  let filteredByTimeWindowCount = 0;
  const debugSamples: Array<{
    rawRowId: string;
    idValue: string;
    sourceTime: string;
    eventTime: string;
    sourceMs: number | null;
    eventMs: number | null;
    candidateCount: number;
    firstCandidateTs?: string;
    lastCandidateTs?: string;
    matchedCount: number;
  }> = [];

  let rowsWithMatchedEvents = 0;
  let totalMatchedEvents = 0;
  const payloads = rawRows.map((rawRow: { id: string; json: unknown }) => {
    const json = asReportJson(rawRow.json);
    const idValue = resolveIdValueFromRawRow(json, idField, storedEventUrlField);
    const sourceTime = pickTimeField(json, sourceTimeField, sourceTimeCandidates);
    const eventTime = pickTimeField(json, eventTimeField, eventTimeCandidates);
    const sourceMs = parseTimestampToMs(sourceTime);
    const eventMs = parseTimestampToMs(eventTime);
    const candidates = idValue ? uploadedEventsById.get(idValue) || [] : [];
    const matchedRows = candidates.filter((candidate) => {
      if (sourceMs !== null && candidate.tsMs < sourceMs) return false;
      if (eventMs !== null && candidate.tsMs > eventMs) return false;
      return true;
    });

    if (!idValue) {
      missingIdCount += 1;
    }
    if (sourceMs === null) {
      missingSourceTimeCount += 1;
    }
    if (eventMs === null) {
      missingEventTimeCount += 1;
    }
    if (idValue && candidates.length === 0) {
      noCandidatesByIdCount += 1;
    }
    if (idValue && candidates.length > 0 && matchedRows.length === 0) {
      filteredByTimeWindowCount += 1;
    }

    if (matchedRows.length > 0) {
      rowsWithMatchedEvents += 1;
      totalMatchedEvents += matchedRows.length;
    }

    if (debugSamples.length < 8) {
      debugSamples.push({
        rawRowId: rawRow.id,
        idValue,
        sourceTime,
        eventTime,
        sourceMs,
        eventMs,
        candidateCount: candidates.length,
        firstCandidateTs: candidates[0]?.ts,
        lastCandidateTs: candidates[candidates.length - 1]?.ts,
        matchedCount: matchedRows.length,
      });
    }

    const journeyLogs = matchedRows.slice(0, 200).map((item) => ({
      ts: item.ts,
      event: item.event,
      url: item.url,
      idValue: item.idValue,
      row: item.row,
    }));

    return {
      id: rawRow.id,
      journeyLogs,
      firstPageLoadDuration: computeFirstPageLoadDurationFromUploadedEvents(sourceTime, matchedRows),
    };
  });

  await referrerRaws.updateJourneyLogsMany(payloads);
  await logs.createMany([
    {
      reportId: current.id,
      level: 'info',
      message: `attach_related_events completed. rows=${rawRows.length}, upload_events=${validUploadEventCount}, matched_rows=${rowsWithMatchedEvents}, matched_events=${totalMatchedEvents}`,
    },
  ]);

  return Response.json({
    reportId: current.id,
    rowsUpdated: payloads.length,
    uploadEvents: validUploadEventCount,
    matchedRows: rowsWithMatchedEvents,
    matchedEvents: totalMatchedEvents,
  });
}

export async function generateUserJourney(req: Request) {
  const request = req as RequestWithParams<{ id: string; rawId: string }>;
  const current = await reports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Report task not found' }, { status: 404 });
  }

  const target = await referrerRaws.findByIdInReport(current.id, request.params.rawId);
  if (!target) {
    return Response.json({ error: 'ReferrerRaw not found' }, { status: 404 });
  }

  const targetJson = asReportJson((target as { json?: unknown }).json);
  const storedFieldMappings = normalizeAttributionLogicMapping(current.fieldMappings);
  const sourceUrlField = storedFieldMappings?.source_url;
  const sourceTimeField = storedFieldMappings?.source_time;
  const sourceUrl =
    getStringField(targetJson, sourceUrlField);
  const sourceTime =
    getStringField(targetJson, sourceTimeField);

  try {
    const userJourneyDoc = await generateUserJourneyDocFromLogs((target as { journeyLogs?: unknown }).journeyLogs, {
      sourceUrl,
      sourceTime,
    });
    await referrerRaws.updateUserJourneyDoc({
      id: request.params.rawId,
      reportId: current.id,
      userJourneyDoc,
    });
    await logs.createMany([
      {
        reportId: current.id,
        level: 'info',
        message: `user_journey_doc generated for referrer_raw=${request.params.rawId}`,
      },
    ]);

    return Response.json({
      reportId: current.id,
      rawId: request.params.rawId,
      userJourneyDoc,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('journey_logs is empty') ? 400 : 500;
    return Response.json({ error: `Failed to generate user journey: ${message}` }, { status });
  }
}

export async function updateStatus(req: Request) {
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
}

export async function rerun(req: Request) {
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

  const executeRule = buildDynamicUrlRuleExecutor(existingRule.logicSource) as UrlRuleExecutor;
  const storedJourneyConfig = normalizeJourneyConfigFromFieldMappings(current.fieldMappings);
  const inputRows: ReportInputRow[] = existingRows.map((row: { json: unknown; uid?: unknown }) => {
    const rowJson = asReportJson(row.json);
    const eventUrl = String(rowJson[storedFieldMappings.event_url] ?? '');
    const storedUid = typeof row.uid === 'string' ? row.uid.trim() : '';
    return {
      eventUrl,
      eventTime: String(rowJson[storedFieldMappings.event_time] ?? ''),
      sourceTime: String(rowJson[storedFieldMappings.source_time] ?? ''),
      uid: storedUid || extractUidFromEventUrl(eventUrl) || extractUidFromRawJson(rowJson),
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
  const rowsWithJourney = inputRows.map((item, index) => ({
    ...item,
    firstPageLoadDuration: computeFirstPageLoadDuration(item.sourceTime, journeyLogsByRowIndex[index]),
  }));

  try {
    const updated = await executeReportRows({
      reportId: current.id,
      rows: rowsWithJourney,
      executeRule,
      persistRows: async (rows) => {
        await referrerRaws.replaceByReport(
          current.id,
          rows.map((item, index) => ({
            ...item,
            journeyLogs: journeyLogsByRowIndex[index] ?? null,
            firstPageLoadDuration: item.firstPageLoadDuration ?? null,
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
}

export async function remove(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const current = await reports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Report task not found' }, { status: 404 });
  }

  await reports.delete(request.params.id);
  return new Response(null, { status: 204 });
}
