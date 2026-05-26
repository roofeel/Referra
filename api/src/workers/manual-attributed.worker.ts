import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { MANUAL_ATTRIBUTED_QUEUE_NAME } from '../queues/manual-attributed.queue.js';
import { processManualAttributedExecution } from '../services/manual-attribution-attributed-jobs.service.js';

type ManualAttributedExecuteJobData = {
  jobId: string;
  executionId: string;
};

const REDIS_URL = process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379';
const WORKER_CONCURRENCY = Number(process.env.MANUAL_ATTRIBUTED_WORKER_CONCURRENCY || '2');

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

const worker = new Worker<ManualAttributedExecuteJobData>(
  MANUAL_ATTRIBUTED_QUEUE_NAME,
  async (job) => {
    const data = (job.data || {}) as ManualAttributedExecuteJobData;
    if (!data.jobId || !data.executionId) {
      throw new Error('Invalid manual-attributed-execute job payload');
    }

    await processManualAttributedExecution(data.jobId, data.executionId);
    return { ok: true };
  },
  {
    connection,
    concurrency: Number.isFinite(WORKER_CONCURRENCY) && WORKER_CONCURRENCY > 0 ? WORKER_CONCURRENCY : 2,
  },
);

worker.on('ready', () => {
  console.log(`[bullmq] ${MANUAL_ATTRIBUTED_QUEUE_NAME} worker ready`);
});

worker.on('failed', (job, err) => {
  console.error(
    `[bullmq] manual-attributed job failed id=${job?.id || 'unknown'} attempts=${job?.attemptsMade ?? 0}: ${err.message}`,
  );
});

worker.on('error', (err) => {
  console.error('[bullmq] manual-attributed worker error:', err);
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
