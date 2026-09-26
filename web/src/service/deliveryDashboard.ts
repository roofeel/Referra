import { buildApiUrl, throwApiError } from './http';

export interface DeliveryDashboardResponse {
  source: 'athena';
  dataSources: { impressions: string; installs: string; bidRequests: string };
  queryConditions: { impressions: string; installs: string; bidRequests: string };
  filters: number[];
  filterLabels: Record<number, string>;
  lineItems: Array<{ id: string; label: string }>;
  selectedFilterId: number | null;
  selectedLineItemId: string | null;
  bidMetricsEnabled: boolean;
  bidPricesEnabled: boolean;
  lastUpdated: string | null;
  metrics: { impressions: number; installs: number; bidRequests: number; bids: number; ipm: number };
  hourly: Array<{ time: string; ipm: number; previousIpm: number; impressions: number; installs: number; bidResponses: number; bidRate: number; winRate: number }>;
  bidPrices: Array<{ time: string; lineItemId: string; priceUSD: number }>;
  comparison: Array<{ time: string; today: number; yesterday: number }>;
  dma: Array<{ dma: string; ipm: number; impressions: number; installs: number; impressionShare: number }>;
  creative: Array<{ creative: string; ipm: number; impressions: number; installs: number }>;
}

export const deliveryDashboardApi = {
  get: async (startDate: string, endDate: string, filterId?: number, lineItemId?: string): Promise<DeliveryDashboardResponse> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (filterId !== undefined) params.set('filterId', String(filterId));
    if (lineItemId) params.set('lineItemId', lineItemId);
    const response = await fetch(buildApiUrl(`/api/delivery-dashboard?${params.toString()}`));
    if (!response.ok) await throwApiError(response, 'Failed to fetch delivery dashboard');
    return response.json() as Promise<DeliveryDashboardResponse>;
  },
  refresh: async (date: string) => {
    const response = await fetch(buildApiUrl(`/api/delivery-dashboard/refresh?date=${encodeURIComponent(date)}`), { method: 'POST' });
    if (!response.ok) await throwApiError(response, 'Failed to refresh delivery metrics');
    return response.json() as Promise<{ status: 'completed'; date: string; rows: number; refreshedAt: string }>;
  },
};
