import { nonAttributedReports, urlRules } from '../../../../packages/db/index.js';
import type { ReportTaskStatus } from '../../lib/reports-presentation.lib.js';

export type NonAttributedReportTask = {
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

export type NonAttributedReportLogItem = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

export type NonAttributedReportsPayload = {
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

export type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

export type NonAttributedReportRecord = Awaited<ReturnType<typeof nonAttributedReports.findById>>;
export type UrlRuleRecord = Awaited<ReturnType<typeof urlRules.findById>>;

export type NonAttributedExecutionRow = {
  eventUrl: string;
  eventTime: string;
  sourceTime: string;
  json: Record<string, string>;
};
