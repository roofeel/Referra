import { initDatabase } from '../../../packages/db/index.js';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { DELIVERY_REFRESH_QUEUE_NAME } from '../queues/delivery-dashboard.queue.js';
import { runDeliveryRefreshJob } from '../services/delivery-dashboard.service.js';

await initDatabase();
const connection = new IORedis(process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null, enableReadyCheck: true });
function yesterdayUtcDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

const worker = new Worker(DELIVERY_REFRESH_QUEUE_NAME, async (job) => {
  const date = (job.data as { date?: string }).date || yesterdayUtcDate();
  return runDeliveryRefreshJob(date);
}, { connection, concurrency: 1 });
worker.on('ready', () => console.log('[delivery-metrics] worker running'));
worker.on('failed', (job, error) => console.error(`[delivery-metrics] refresh failed job=${job?.id || 'unknown'}`, error));
process.on('SIGTERM', async () => { await worker.close(); await connection.quit(); process.exit(0); });
process.on('SIGINT', async () => { await worker.close(); await connection.quit(); process.exit(0); });

await new Promise(() => undefined);
