import { reports, urlRules } from '../../../../packages/db/index.js';
import type { JourneyConfig } from '../../services/reports-journey.service.js';
import type { ReportTaskStatus } from '../../lib/reports-presentation.lib.js';

export type ReportTask = {
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

export type ReportLogItem = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

export type ReportsPayload = {
  metrics: {
    totalTasks: number;
    activeAnalyses: number;
    successRateAvg: number;
    dataPoints24h: string;
  };
  clients: string[];
  rules: Array<{ id: string; name: string }>;
  athenaTables: Array<{ id: string; tableType: string; tableNamePattern: string; columns: string[] }>;
  urlParsingVersions: string[];
  tasks: ReportTask[];
};

export type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

export type ReportRecord = Awaited<ReturnType<typeof reports.findById>>;
export type UrlRuleRecord = Awaited<ReturnType<typeof urlRules.findById>>;

export type ParsedUploadEvent = {
  idValue: string;
  tsMs: number;
  ts: string;
  event: string;
  url: string;
  row: Record<string, string>;
};

export type NormalizedJourneyConfig = Omit<JourneyConfig, 'athenaTableName'>;
