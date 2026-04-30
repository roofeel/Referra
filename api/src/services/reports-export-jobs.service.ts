import { referrerRaws, reports } from '../../../packages/db/index.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

const EXPORT_BUCKET = 'feedmob-testing';
const EXPORT_PREFIX = 'ai-referrer';
const PRESIGNED_TTL_SECONDS = 60 * 60 * 24;
const jobs = new Map<string, ReportExportJob>();

function nowIso() {
  return new Date().toISOString();
}

function buildJobId() {
  return `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildS3Client() {
  const region = process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
    });
  }

  return new S3Client({
    region,
    credentials: fromNodeProviderChain(),
  });
}

function asJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function csvEscape(raw: unknown) {
  const value = raw == null ? '' : String(raw);
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getFieldValue(field: string, row: Record<string, unknown>, rawJson: Record<string, unknown>) {
  if (field.startsWith('raw.')) {
    return rawJson[field.slice(4)];
  }
  return row[field];
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

  const jobId = buildJobId();
  const now = nowIso();
  const job: ReportExportJob = {
    jobId,
    reportId,
    status: 'pending',
    selectedFields,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(jobId, job);

  void (async () => {
    const current = jobs.get(jobId);
    if (!current) return;

    current.status = 'running';
    current.updatedAt = nowIso();
    jobs.set(jobId, current);

    try {
      const rows = await referrerRaws.listByReport(reportId);
      const headers = selectedFields;
      const csvLines: string[] = [headers.map(csvEscape).join(',')];

      for (const raw of rows as Array<Record<string, unknown>>) {
        const rowJson = asJsonRecord(raw.json);
        const line = headers.map((field) => csvEscape(getFieldValue(field, raw, rowJson))).join(',');
        csvLines.push(line);
      }

      const csvContent = csvLines.join('\n');
      const key = `${EXPORT_PREFIX}/report-${reportId}/${jobId}.csv`;
      const s3 = buildS3Client();

      await s3.send(
        new PutObjectCommand({
          Bucket: EXPORT_BUCKET,
          Key: key,
          Body: csvContent,
          ContentType: 'text/csv; charset=utf-8',
        }),
      );

      const downloadUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: EXPORT_BUCKET,
          Key: key,
        }),
        { expiresIn: PRESIGNED_TTL_SECONDS },
      );

      const completed = jobs.get(jobId);
      if (!completed) return;
      completed.status = 'completed';
      completed.fileKey = key;
      completed.downloadUrl = downloadUrl;
      completed.updatedAt = nowIso();
      jobs.set(jobId, completed);
    } catch (error) {
      const failed = jobs.get(jobId);
      if (!failed) return;
      failed.status = 'failed';
      failed.error = error instanceof Error ? error.message : String(error);
      failed.updatedAt = nowIso();
      jobs.set(jobId, failed);
    }
  })();

  return job;
}

export function getReportExportJob(jobId: string) {
  return jobs.get(jobId) || null;
}
