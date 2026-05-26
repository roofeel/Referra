import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { referrerRaws } from '../../../packages/db/index.js';
import { REPORT_EXPORT_QUEUE_NAME } from '../queues/report-export.queue.js';
import { createS3Client } from '../lib/aws-clients.lib.js';

type ReportExportJobData = {
  reportId: string;
  selectedFields: string[];
};

const EXPORT_BUCKET = process.env.REPORT_EXPORT_BUCKET?.trim() || 'feedmob-testing';
const EXPORT_PREFIX = process.env.REPORT_EXPORT_PREFIX?.trim() || 'ai-referrer';
const PRESIGNED_TTL_SECONDS = 60 * 60 * 24;
const WORKER_CONCURRENCY = Number(process.env.REPORT_EXPORT_WORKER_CONCURRENCY || '2');
const REDIS_URL = process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

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
  if (field in row) {
    return row[field];
  }
  return rawJson[field];
}

const worker = new Worker<ReportExportJobData>(
  REPORT_EXPORT_QUEUE_NAME,
  async (job) => {
    const data = (job.data || {}) as ReportExportJobData;
    const reportId = data.reportId;
    const selectedFields = data.selectedFields;

    const rows = await referrerRaws.listByReport(reportId);
    const headers = selectedFields;
    const csvLines: string[] = [headers.map(csvEscape).join(',')];

    for (const raw of rows as Array<Record<string, unknown>>) {
      const rowJson = asJsonRecord(raw.json);
      const line = headers.map((field: string) => csvEscape(getFieldValue(field, raw, rowJson))).join(',');
      csvLines.push(line);
    }

    const csvContent = csvLines.join('\n');
    const key = `${EXPORT_PREFIX}/report-${reportId}/${job.id}.csv`;
    const s3 = createS3Client();

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

    return {
      fileKey: key,
      downloadUrl,
    };
  },
  {
    connection,
    concurrency: Number.isFinite(WORKER_CONCURRENCY) && WORKER_CONCURRENCY > 0 ? WORKER_CONCURRENCY : 2,
  },
);

worker.on('ready', () => {
  console.log(`[bullmq] ${REPORT_EXPORT_QUEUE_NAME} worker ready`);
});

worker.on('failed', (job, err) => {
  console.error(
    `[bullmq] report-export job failed id=${job?.id || 'unknown'} attempts=${job?.attemptsMade ?? 0}: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[bullmq] report-export worker error:', err);
});

process.on('SIGTERM', async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
});
