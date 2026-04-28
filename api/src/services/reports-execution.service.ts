import { logs, reports } from '../../../packages/db/index.js';
import {
  executeReportRowsCore,
  type ReportInputRowCore,
  type UrlRuleExecutor,
} from './report-execution-core.service.js';
import type { ReportTaskStatus } from '../lib/reports-presentation.lib.js';

export type { UrlRuleExecutor };

export type ReportInputRow = ReportInputRowCore & {
  uid?: string;
  firstPageLoadDuration?: number | null;
};

export type ReportOutputRow = {
  referrerType: string;
  referrerDesc: string;
  duration: number;
  uid?: string;
  firstPageLoadDuration?: number | null;
  json: unknown;
};

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
  return executeReportRowsCore({
    reportId: options.reportId,
    rows: options.rows,
    executeRule: options.executeRule,
    buildOutputRow: ({ row, referrerType, referrerDesc, duration }) => ({
      referrerType,
      referrerDesc,
      duration,
      uid: row.uid,
      firstPageLoadDuration: row.firstPageLoadDuration ?? null,
      json: row.json,
    }),
    persistRows: options.persistRows,
    writeLogs: async (pendingLogs) => {
      await logs.createMany(
        pendingLogs.map((item) => ({
          reportId: options.reportId,
          level: item.level,
          message: item.message,
        })),
      );
    },
    persistFinalStatus: async ({ status, progress, attribution }) =>
      reports.update(options.reportId, {
        status,
        progress,
        progressLabel: options.progressLabelFor(status, progress),
        attribution,
      }),
    startMessage: options.startMessage,
    finishMessagePrefix: options.finishMessagePrefix,
    runtimeErrorPrefix: options.runtimeErrorPrefix,
    failureLogPrefix: options.failureLogPrefix,
    beforeLoopMessages: options.beforeLoopMessages,
    logRowInputs: options.logRowInputs,
  });
}
