import { AthenaClient, GetQueryExecutionCommand, StartQueryExecutionCommand } from '@aws-sdk/client-athena';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../../../packages/db/index.js';

export type ManualAttributedJobStatus = 'draft' | 'pending' | 'running' | 'completed' | 'failed';

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
  database: string;
  workgroup: string;
  resultS3: string;
};

type UpdateManualAttributedJobOptions = Partial<CreateManualAttributedJobOptions>;

const PRESIGNED_TTL_SECONDS = 60 * 60 * 24;
const POLL_INTERVAL_MS = 2000;

function buildJobId() {
  return `manual_attr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildDefaultJobName() {
  return `Manual Attribution ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function renderSql(template: string) {
  return template;
}

function toJob(row: any): ManualAttributedJob {
  return {
    jobId: row.jobId,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startDate: row.startDate,
    endDate: row.endDate,
    database: row.database,
    workgroup: row.workgroup,
    resultS3: row.resultS3,
    sqlTemplate: row.sqlTemplate,
    renderedSql: row.renderedSql,
    queryExecutionId: row.queryExecutionId ?? undefined,
    downloadUrl: row.downloadUrl ?? undefined,
    error: row.error ?? undefined,
  };
}

async function runJob(jobId: string) {
  const current = await (db as any).manualAttributedJob.findUnique({ where: { jobId } });
  if (!current) return;

  const running = await (db as any).manualAttributedJob.update({
    where: { jobId },
    data: {
      status: 'running',
    },
  });

  try {
    const { athena, s3 } = buildAwsClients();
    const startResp = await athena.send(
      new StartQueryExecutionCommand({
        QueryString: running.renderedSql,
        QueryExecutionContext: { Database: running.database },
        ResultConfiguration: { OutputLocation: normalizeS3Uri(running.resultS3) },
        WorkGroup: running.workgroup,
      }),
    );

    const queryExecutionId = startResp.QueryExecutionId;
    if (!queryExecutionId) throw new Error('Failed to start Athena query');

    await (db as any).manualAttributedJob.update({
      where: { jobId },
      data: {
        queryExecutionId,
      },
    });

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

    const { bucket, prefix } = parseS3Uri(running.resultS3);
    const key = `${prefix}${queryExecutionId}.csv`;
    const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: PRESIGNED_TTL_SECONDS,
    });

    await (db as any).manualAttributedJob.update({
      where: { jobId },
      data: {
        status: 'completed',
        downloadUrl,
      },
    });
  } catch (error) {
    await (db as any).manualAttributedJob.updateMany({
      where: { jobId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

function validateJobOptions(options: CreateManualAttributedJobOptions) {
  const name = options.name?.trim() || buildDefaultJobName();
  const sqlTemplate = options.sqlTemplate.trim();
  if (name.length > 120) throw new Error('name must be 120 characters or less');
  if (!sqlTemplate) throw new Error('sqlTemplate is required');
  if (!options.database.trim()) throw new Error('database is required');
  if (!options.workgroup.trim()) throw new Error('workgroup is required');
  normalizeS3Uri(options.resultS3);

  return {
    name,
    sqlTemplate,
    startDate: '',
    endDate: '',
    database: options.database.trim(),
    workgroup: options.workgroup.trim(),
    resultS3: normalizeS3Uri(options.resultS3),
  };
}

export async function createManualAttributedJob(options: CreateManualAttributedJobOptions) {
  const validated = validateJobOptions(options);

  const created = await (db as any).manualAttributedJob.create({
    data: {
      jobId: buildJobId(),
      name: validated.name,
      status: 'draft',
      startDate: validated.startDate,
      endDate: validated.endDate,
      database: validated.database,
      workgroup: validated.workgroup,
      resultS3: validated.resultS3,
      sqlTemplate: validated.sqlTemplate,
      renderedSql: renderSql(validated.sqlTemplate),
    },
  });

  return toJob(created);
}

export async function updateManualAttributedJob(jobId: string, options: UpdateManualAttributedJobOptions) {
  const existing = await (db as any).manualAttributedJob.findUnique({ where: { jobId } });
  if (!existing) return null;

  const next = validateJobOptions({
    name: options.name ?? existing.name,
    sqlTemplate: options.sqlTemplate ?? existing.sqlTemplate,
    database: options.database ?? existing.database,
    workgroup: options.workgroup ?? existing.workgroup,
    resultS3: options.resultS3 ?? existing.resultS3,
  });
  const executionInputsChanged =
    next.sqlTemplate !== existing.sqlTemplate ||
    next.database !== existing.database ||
    next.workgroup !== existing.workgroup ||
    next.resultS3 !== existing.resultS3;

  const updated = await (db as any).manualAttributedJob.update({
    where: { jobId },
    data: {
      name: next.name,
      sqlTemplate: next.sqlTemplate,
      database: next.database,
      workgroup: next.workgroup,
      resultS3: next.resultS3,
      startDate: next.startDate,
      endDate: next.endDate,
      renderedSql: renderSql(next.sqlTemplate),
      status: executionInputsChanged ? 'draft' : existing.status,
      queryExecutionId: executionInputsChanged ? null : existing.queryExecutionId,
      downloadUrl: executionInputsChanged ? null : existing.downloadUrl,
      error: executionInputsChanged ? null : existing.error,
    },
  });

  return toJob(updated);
}

export async function deleteManualAttributedJob(jobId: string) {
  const deleted = await (db as any).manualAttributedJob.deleteMany({ where: { jobId } });
  return deleted.count > 0;
}

export async function getManualAttributedJob(jobId: string) {
  const row = await (db as any).manualAttributedJob.findUnique({ where: { jobId } });
  return row ? toJob(row) : null;
}

export async function listManualAttributedJobs(options?: {
  status?: ManualAttributedJobStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}) {
  const status = options?.status;
  const search = options?.search?.trim() || '';
  const startDate = options?.startDate?.trim() || '';
  const endDate = options?.endDate?.trim() || '';
  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { jobId: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { queryExecutionId: { contains: search, mode: 'insensitive' } },
      { database: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  const rows = await (db as any).manualAttributedJob.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(toJob);
}
