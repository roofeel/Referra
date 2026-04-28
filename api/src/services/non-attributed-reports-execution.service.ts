import { nonAttributedLogs, nonAttributedReports } from '../../../packages/db/index.js';
import {
  executeReportRowsCore,
  type ReportInputRowCore,
  type UrlRuleExecutor,
} from './report-execution-core.service.js';
import type { ReportTaskStatus } from '../lib/reports-presentation.lib.js';

export type { UrlRuleExecutor };

export type ReportInputRow = ReportInputRowCore;

export type ReportOutputRow = {
  referrerType: string;
  referrerDesc: string;
  duration: number;
  json: unknown;
};

export async function executeNonAttributedReportRows(options: {
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
      json: row.json,
    }),
    persistRows: options.persistRows,
    writeLogs: async (pendingLogs) => {
      await nonAttributedLogs.createMany(
        pendingLogs.map((item) => ({
          nonAttributedReportId: options.reportId,
          level: item.level,
          message: item.message,
        })),
      );
    },
    persistFinalStatus: async ({ status, progress, attribution }) =>
      nonAttributedReports.update(options.reportId, {
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
