import { referrerRaws, reports } from '../../../packages/db/index.js';
import { reportExportQueue } from '../queues/report-export.queue.js';

export type ReportExportJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ReportExportJob = {
  jobId: string;
  reportId: string;
  status: ReportExportJobStatus;
  selectedFields: string[];
  createdAt: string;
  updatedAt: string;
  fileKey?: string;
  downloadUrl?: string;
  error?: string;
};

type StartExportOptions = {
  selectedFields: string[];
};

type ReportExportJobData = {
  reportId: string;
  selectedFields: string[];
};

function asJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function mapJobState(state: string): ReportExportJobStatus {
  if (state === 'completed') return 'completed';
  if (state === 'failed') return 'failed';
  if (state === 'active') return 'running';
  return 'pending';
}

function toIso(value: number) {
  return new Date(value).toISOString();
}

export async function listExportableFields(reportId: string) {
  const report = await reports.findById(reportId);
  if (!report) {
    throw new Error('Report task not found');
  }

  const sampleRows = await referrerRaws.listByReport(reportId, { take: 5000 });
  const rawKeys = new Set<string>();
  for (const row of sampleRows as Array<{ json: unknown }>) {
    const json = asJsonRecord(row.json);
    for (const key of Object.keys(json)) {
      if (key.trim()) {
        rawKeys.add(key);
      }
    }
  }

  const fixedFields = ['id', 'reportId', 'referrerType', 'referrerDesc', 'duration', 'uid', 'createdAt', 'updatedAt'];
  return {
    fixedFields,
    referrerRawFields: Array.from(rawKeys).sort((a, b) => a.localeCompare(b)),
  };
}

export async function enqueueReportExportJob(reportId: string, options: StartExportOptions) {
  const report = await reports.findById(reportId);
  if (!report) {
    throw new Error('Report task not found');
  }

  const selectedFields = Array.from(new Set(options.selectedFields.map((item) => item.trim()).filter(Boolean)));
  if (selectedFields.length === 0) {
    throw new Error('selectedFields is required');
  }

  const job = await reportExportQueue.add(
    'export-report-csv',
    {
      reportId,
      selectedFields,
    },
    {
      removeOnComplete: false,
      removeOnFail: false,
    },
  );

  return {
    jobId: job.id as string,
    reportId,
    status: 'pending' as const,
    selectedFields,
    createdAt: new Date(job.timestamp).toISOString(),
    updatedAt: new Date(job.timestamp).toISOString(),
  };
}

export async function getReportExportJob(jobId: string): Promise<ReportExportJob | null> {
  const job = await reportExportQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const status = mapJobState(state);
  const data = (job.data || {}) as ReportExportJobData;
  const result = (job.returnvalue || {}) as { fileKey?: string; downloadUrl?: string };
  const failedReason = job.failedReason || undefined;

  let updatedAtMs = job.timestamp;
  if (job.finishedOn && Number.isFinite(job.finishedOn)) {
    updatedAtMs = job.finishedOn;
  } else if (job.processedOn && Number.isFinite(job.processedOn)) {
    updatedAtMs = job.processedOn;
  }

  return {
    jobId: String(job.id),
    reportId: data.reportId || '',
    status,
    selectedFields: Array.isArray(data.selectedFields) ? data.selectedFields : [],
    createdAt: toIso(job.timestamp),
    updatedAt: toIso(updatedAtMs),
    fileKey: result.fileKey,
    downloadUrl: result.downloadUrl,
    error: failedReason,
  };
}
