import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null, enableReadyCheck: true });
export const DELIVERY_REFRESH_QUEUE_NAME = 'delivery-dashboard-refresh';
export const deliveryRefreshQueue = new Queue(DELIVERY_REFRESH_QUEUE_NAME, { connection });
export const DELIVERY_REFRESH_SCHEDULER_ID = 'delivery-overview-refresh';
export const DELIVERY_TODAY_REFRESH_SCHEDULER_ID = 'delivery-overview-refresh-today-every-two-hours';
