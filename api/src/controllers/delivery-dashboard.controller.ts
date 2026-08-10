import { getDeliveryDashboard, getDeliveryRefreshSchedule, listDeliveryRefreshLogs, refreshDeliveryMetrics, runDeliveryRefreshJob, updateDeliveryRefreshSchedule } from '../services/delivery-dashboard.service.js';

function parseDate(value: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('date must use YYYY-MM-DD format');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('date must be a valid calendar date');
  return value;
}

function parseFilterId(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('filterId must be a non-negative integer');
  return parsed;
}

export const deliveryDashboardController = {
  async get(request: Request) {
    const url = new URL(request.url);
    try {
      const legacyDate = url.searchParams.get('date');
      const startDate = parseDate(url.searchParams.get('startDate') || legacyDate);
      const endDate = parseDate(url.searchParams.get('endDate') || startDate);
      if (endDate < startDate) throw new Error('endDate must be on or after startDate');
      return Response.json(await getDeliveryDashboard(startDate, endDate, parseFilterId(url.searchParams.get('filterId'))));
    } catch (error) {
      console.error('[delivery-dashboard] read failed:', error);
      return Response.json({ error: error instanceof Error ? error.message : 'Failed to read delivery dashboard' }, { status: 503 });
    }
  },

  async refresh(request: Request) {
    const url = new URL(request.url);
    const date = parseDate(url.searchParams.get('date'));
    const result = await runDeliveryRefreshJob(date);
    return Response.json({ status: 'completed', date, ...result });
  },

  async getSchedule() { return Response.json(await getDeliveryRefreshSchedule()); },
  async updateSchedule(request: Request) {
    const body = await request.json() as { cronExpression?: string; enabled?: boolean; timezone?: string };
    return Response.json(await updateDeliveryRefreshSchedule(body));
  },
  async logs(request: Request) {
    const limit = Number(new URL(request.url).searchParams.get('limit') || '100');
    return Response.json({ logs: await listDeliveryRefreshLogs(Number.isFinite(limit) ? limit : 100) });
  },
};
