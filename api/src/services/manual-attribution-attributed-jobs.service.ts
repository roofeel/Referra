import { AthenaClient, GetQueryExecutionCommand, StartQueryExecutionCommand } from '@aws-sdk/client-athena';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type ManualAttributedJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ManualAttributedJob = {
  jobId: string;
  name: string;
  status: ManualAttributedJobStatus;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  database: string;
  workgroup: string;
  resultS3: string;
  sqlTemplate: string;
  renderedSql: string;
  queryExecutionId?: string;
  downloadUrl?: string;
  error?: string;
};

type CreateManualAttributedJobOptions = {
  name?: string;
  sqlTemplate: string;
  startDate?: string;
  endDate?: string;
  database: string;
  workgroup: string;
  resultS3: string;
};

type UpdateManualAttributedJobOptions = Partial<CreateManualAttributedJobOptions>;

const PRESIGNED_TTL_SECONDS = 60 * 60 * 24;
const POLL_INTERVAL_MS = 2000;
const jobs = new Map<string, ManualAttributedJob>();

function nowIso() {
  return new Date().toISOString();
}

function buildJobId() {
  return `manual_attr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildDefaultJobName() {
  return `Manual Attribution ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertDate(dateValue: string | undefined, field: string) {
  if (!dateValue) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }
}

function normalizeS3Uri(raw: string) {
  const value = raw.trim();
  if (!value.startsWith('s3://')) {
    throw new Error('resultS3 must start with s3://');
  }
  return value.endsWith('/') ? value : `${value}/`;
}

function parseS3Uri(uri: string) {
  const normalized = normalizeS3Uri(uri);
  const withoutScheme = normalized.slice('s3://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  const bucket = slashIndex >= 0 ? withoutScheme.slice(0, slashIndex) : withoutScheme;
  const prefix = slashIndex >= 0 ? withoutScheme.slice(slashIndex + 1) : '';
  if (!bucket) throw new Error('Invalid resultS3 bucket');
  return { bucket, prefix };
}

function buildAwsClients() {
  const region = process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  if (accessKeyId && secretAccessKey) {
    const credentials = {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };

    return {
      athena: new AthenaClient({ region, credentials }),
      s3: new S3Client({ region, credentials }),
    };
  }

  const credentials = fromNodeProviderChain();
  return {
    athena: new AthenaClient({ region, credentials }),
    s3: new S3Client({ region, credentials }),
  };
}

function replaceToken(sql: string, token: string, value?: string) {
  if (!value) return sql;
  return sql.replaceAll(token, value);
}

function renderSql(template: string, startDate?: string, endDate?: string) {
  return replaceToken(
    replaceToken(
      replaceToken(
        replaceToken(template, '{{start_date}}', startDate),
        '{{end_date}}',
        endDate,
      ),
      '{{start_ts}}',
      startDate ? `${startDate} 00:00:00` : undefined,
    ),
    '{{end_ts}}',
    endDate ? `${endDate} 23:59:59` : undefined,
  );
}

async function runJob(jobId: string) {
  const current = jobs.get(jobId);
  if (!current) return;

  current.status = 'running';
  current.updatedAt = nowIso();
  jobs.set(jobId, current);

  try {
    const { athena, s3 } = buildAwsClients();
    const startResp = await athena.send(
      new StartQueryExecutionCommand({
        QueryString: current.renderedSql,
        QueryExecutionContext: { Database: current.database },
        ResultConfiguration: { OutputLocation: normalizeS3Uri(current.resultS3) },
        WorkGroup: current.workgroup,
      }),
    );

    const queryExecutionId = startResp.QueryExecutionId;
    if (!queryExecutionId) throw new Error('Failed to start Athena query');

    current.queryExecutionId = queryExecutionId;
    current.updatedAt = nowIso();
    jobs.set(jobId, current);

    while (true) {
      await sleep(POLL_INTERVAL_MS);
      const queryResp = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId }));
      const state = queryResp.QueryExecution?.Status?.State;

      if (state === 'SUCCEEDED') break;
      if (state === 'FAILED' || state === 'CANCELLED') {
        const reason = queryResp.QueryExecution?.Status?.StateChangeReason || 'unknown';
        throw new Error(`Athena query ${state}: ${reason}`);
      }
    }

    const { bucket, prefix } = parseS3Uri(current.resultS3);
    const key = `${prefix}${queryExecutionId}.csv`;
    const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: PRESIGNED_TTL_SECONDS,
    });

    const completed = jobs.get(jobId);
    if (!completed) return;
    completed.status = 'completed';
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
}

function validateJobOptions(options: CreateManualAttributedJobOptions) {
  const name = options.name?.trim() || buildDefaultJobName();
  const sqlTemplate = options.sqlTemplate.trim();
  if (name.length > 120) throw new Error('name must be 120 characters or less');
  if (!sqlTemplate) throw new Error('sqlTemplate is required');
  assertDate(options.startDate, 'startDate');
  assertDate(options.endDate, 'endDate');
  if (!options.database.trim()) throw new Error('database is required');
  if (!options.workgroup.trim()) throw new Error('workgroup is required');
  normalizeS3Uri(options.resultS3);

  return {
    name,
    sqlTemplate,
    startDate: options.startDate || '',
    endDate: options.endDate || '',
    database: options.database.trim(),
    workgroup: options.workgroup.trim(),
    resultS3: normalizeS3Uri(options.resultS3),
  };
}

export function createManualAttributedJob(options: CreateManualAttributedJobOptions) {
  const validated = validateJobOptions(options);

  const jobId = buildJobId();
  const now = nowIso();
  const job: ManualAttributedJob = {
    jobId,
    name: validated.name,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    startDate: validated.startDate,
    endDate: validated.endDate,
    database: validated.database,
    workgroup: validated.workgroup,
    resultS3: validated.resultS3,
    sqlTemplate: validated.sqlTemplate,
    renderedSql: renderSql(validated.sqlTemplate, validated.startDate, validated.endDate),
  };
  jobs.set(jobId, job);

  return job;
}

export function updateManualAttributedJob(jobId: string, options: UpdateManualAttributedJobOptions) {
  const existing = jobs.get(jobId);
  if (!existing) return null;

  const next = validateJobOptions({
    name: options.name ?? existing.name,
    sqlTemplate: options.sqlTemplate ?? existing.sqlTemplate,
    startDate: options.startDate ?? existing.startDate,
    endDate: options.endDate ?? existing.endDate,
    database: options.database ?? existing.database,
    workgroup: options.workgroup ?? existing.workgroup,
    resultS3: options.resultS3 ?? existing.resultS3,
  });
  const executionInputsChanged =
    next.sqlTemplate !== existing.sqlTemplate ||
    next.startDate !== existing.startDate ||
    next.endDate !== existing.endDate ||
    next.database !== existing.database ||
    next.workgroup !== existing.workgroup ||
    next.resultS3 !== existing.resultS3;

  const updated: ManualAttributedJob = {
    ...existing,
    ...next,
    status: executionInputsChanged ? 'pending' : existing.status,
    queryExecutionId: executionInputsChanged ? undefined : existing.queryExecutionId,
    downloadUrl: executionInputsChanged ? undefined : existing.downloadUrl,
    error: executionInputsChanged ? undefined : existing.error,
    renderedSql: renderSql(next.sqlTemplate, next.startDate, next.endDate),
    updatedAt: nowIso(),
  };
  jobs.set(jobId, updated);
  return updated;
}

export function deleteManualAttributedJob(jobId: string) {
  return jobs.delete(jobId);
}

export function getManualAttributedJob(jobId: string) {
  return jobs.get(jobId) || null;
}

export function listManualAttributedJobs(options?: {
  status?: ManualAttributedJobStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}) {
  const status = options?.status;
  const search = options?.search?.trim().toLowerCase() || '';
  const startDate = options?.startDate?.trim() || '';
  const endDate = options?.endDate?.trim() || '';

  return Array.from(jobs.values())
    .filter((job) => {
      if (status && job.status !== status) return false;
      if (search) {
        const hit =
          job.jobId.toLowerCase().includes(search) ||
          (job.name || '').toLowerCase().includes(search) ||
          (job.queryExecutionId || '').toLowerCase().includes(search) ||
          job.database.toLowerCase().includes(search);
        if (!hit) return false;
      }
      if (startDate && job.createdAt.slice(0, 10) < startDate) return false;
      if (endDate && job.createdAt.slice(0, 10) > endDate) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
