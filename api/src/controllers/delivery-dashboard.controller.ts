import { getDeliveryDashboard, refreshDeliveryMetrics } from '../services/delivery-dashboard.service.js';

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
      return Response.json(await getDeliveryDashboard(parseDate(url.searchParams.get('date')), parseFilterId(url.searchParams.get('filterId'))));
    } catch (error) {
      console.error('[delivery-dashboard] read failed:', error);
      return Response.json({ error: error instanceof Error ? error.message : 'Failed to read delivery dashboard' }, { status: 503 });
    }
  },

  async refresh(request: Request) {
    const url = new URL(request.url);
    const date = parseDate(url.searchParams.get('date'));
    const result = await refreshDeliveryMetrics(date);
    return Response.json({ status: 'completed', date, ...result });
  },
};
