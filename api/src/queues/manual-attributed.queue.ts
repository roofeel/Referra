import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

export const MANUAL_ATTRIBUTED_QUEUE_NAME = 'manual-attributed';

export const manualAttributedQueue = new Queue(MANUAL_ATTRIBUTED_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 60 * 60 * 24,
      count: 1000,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 7,
      count: 2000,
    },
  },
});

export function closeManualAttributedQueue() {
  return manualAttributedQueue.close();
}
