import { logs, reports } from '../../../packages/db/index.js';
import { computeDurationSeconds, getSearchParamIgnoreCase, parseUrl, safeDecode } from '../lib/reports-url.lib.js';
import type { ReportTaskStatus } from '../lib/reports-presentation.lib.js';

export type UrlRuleExecutor = (ourl: unknown, rl: string, dl: string) => unknown | Promise<unknown>;

export type ReportInputRow = {
  eventUrl: string;
  eventTime: string;
  sourceTime: string;
  json: unknown;
};

export type ReportOutputRow = {
  referrerType: string;
  referrerDesc: string;
  duration: number;
  json: unknown;
};

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

export async function executeReportRows(options: {
  reportId: string;
  rows: ReportInputRow[];
  executeRule: UrlRuleExecutor;
  persistRows: (rows: ReportOutputRow[]) => Promise<unknown>;
  startMessage: string;
  finishMessagePrefix: string;
  runtimeErrorPrefix: string;
  failureLogPrefix: string;
  progressLabelFor: (status: ReportTaskStatus, progress: number) => string;
  beforeLoopMessages?: string[];
  logRowInputs?: boolean;
}) {
  const pendingLogs: Array<{ level: string; message: string }> = [];
  const log = (level: 'info' | 'warn' | 'error', message: string) => {
    pendingLogs.push({ level, message });
  };

  try {
    log('info', options.startMessage);
    for (const msg of options.beforeLoopMessages || []) {
      log('info', msg);
    }

    const rowsToPersist: ReportOutputRow[] = [];
    let failedRows = 0;

    for (const [index, row] of options.rows.entries()) {
      const ourl = parseUrl(row.eventUrl) ?? new URL('https://invalid.local/');
      const rl = safeDecode(getSearchParamIgnoreCase(ourl, 'rl'));
      const dl = safeDecode(getSearchParamIgnoreCase(ourl, 'dl'));

      if (options.logRowInputs) {
        log('info', `Processing ourl: ${ourl.href} \n rl: ${rl} \n dl: ${dl}`);
      }

      let ruleResult: unknown;
      try {
        ruleResult = await options.executeRule(ourl.href, rl, dl);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failedRows += 1;
        const runtimeError = `logic_runtime_error:${message}`;
        log('error', `${options.runtimeErrorPrefix} row=${index + 1} ${runtimeError}`);
        ruleResult = {
          referrer_type: 'unknown',
          referrer_desc: runtimeError,
        };
      }

      const { referrerType, referrerDesc } = deriveReferrer(ruleResult);
      const duration = computeDurationSeconds(row.eventTime, row.sourceTime);

      rowsToPersist.push({
        referrerType,
        referrerDesc,
        duration,
        json: row.json,
      });
    }

    await options.persistRows(rowsToPersist);

    const totalRows = options.rows.length;
    const successRows = Math.max(0, totalRows - failedRows);
    const successRate = totalRows <= 0 ? 100 : (successRows / totalRows) * 100;
    const finalStatus: ReportTaskStatus = failedRows > 0 ? 'Failed' : 'Completed';
    const finalProgress = 100;

    log(
      'info',
      `${options.finishMessagePrefix} status=${finalStatus} total=${totalRows} success=${successRows} failed=${failedRows}`,
    );
    await logs.createMany(
      pendingLogs.map((item) => ({
        reportId: options.reportId,
        level: item.level,
        message: item.message,
      })),
    );

    return await reports.update(options.reportId, {
      status: finalStatus,
      progress: finalProgress,
      progressLabel: options.progressLabelFor(finalStatus, finalProgress),
      attribution: `${successRate.toFixed(1)}%`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pendingLogs.push({ level: 'error', message: `${options.failureLogPrefix}:${message}` });
    await logs.createMany(
      pendingLogs.map((item) => ({
        reportId: options.reportId,
        level: item.level,
        message: item.message,
      })),
    );
    await reports.update(options.reportId, {
      status: 'Failed',
      progress: 100,
      progressLabel: options.progressLabelFor('Failed', 100),
      attribution: '--',
    });
    throw new Error(message);
  }
}
