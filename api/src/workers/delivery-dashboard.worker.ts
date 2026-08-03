import { initDatabase } from '../../../packages/db/index.js';
import { startDeliveryMetricScheduler } from '../services/delivery-dashboard.service.js';

await initDatabase();
startDeliveryMetricScheduler();
console.log('[delivery-metrics] worker running');

await new Promise(() => undefined);
