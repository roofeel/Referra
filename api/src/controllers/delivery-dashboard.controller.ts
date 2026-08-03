import { getDeliveryDashboard, isDeliveryMetricsRefreshing, refreshDeliveryMetrics } from '../services/delivery-dashboard.service.js';

function parseRange(value: string | null) {
  return value === '7d' || value === '30d' ? value : '24h';
}

export const deliveryDashboardController = {
  async get(request: Request) {
    const url = new URL(request.url);
    try {
      return Response.json(await getDeliveryDashboard(parseRange(url.searchParams.get('range'))));
    } catch (error) {
      console.error('[delivery-dashboard] read failed:', error);
      return Response.json({ error: error instanceof Error ? error.message : 'Failed to read delivery dashboard' }, { status: 503 });
    }
  },

  async refresh() {
    const alreadyRunning = isDeliveryMetricsRefreshing();
    void refreshDeliveryMetrics().catch((error) => console.error('[delivery-dashboard] refresh failed:', error));
    return Response.json({ status: alreadyRunning ? 'running' : 'queued', queuedAt: new Date().toISOString() }, { status: 202 });
  },
};
