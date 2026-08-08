import { buildApiUrl, throwApiError } from './http';

export interface DeliveryDashboardResponse {
  source: 'athena';
  bidMetricsEnabled: boolean;
  lastUpdated: string | null;
  metrics: { impressions: number; installs: number; bidRequests: number; bids: number; ipm: number };
  hourly: Array<{ time: string; ipm: number; previousIpm: number; impressions: number; installs: number; bidResponses: number; bidRate: number; winRate: number }>;
  comparison: Array<{ time: string; today: number; yesterday: number }>;
  dma: Array<{ dma: string; ipm: number; impressions: number; installs: number }>;
  creative: Array<{ creative: string; ipm: number; impressions: number; installs: number }>;
}

export const deliveryDashboardApi = {
  get: async (date: string): Promise<DeliveryDashboardResponse> => {
    const response = await fetch(buildApiUrl(`/api/delivery-dashboard?date=${encodeURIComponent(date)}`));
    if (!response.ok) await throwApiError(response, 'Failed to fetch delivery dashboard');
    return response.json() as Promise<DeliveryDashboardResponse>;
  },
  refresh: async (date: string) => {
    const response = await fetch(buildApiUrl(`/api/delivery-dashboard/refresh?date=${encodeURIComponent(date)}`), { method: 'POST' });
    if (!response.ok) await throwApiError(response, 'Failed to refresh delivery metrics');
    return response.json() as Promise<{ status: 'completed'; date: string; rows: number; refreshedAt: string }>;
  },
};
