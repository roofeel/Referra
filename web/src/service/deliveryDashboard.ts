import { buildApiUrl, throwApiError } from './http';

export interface DeliveryDashboardResponse {
  source: 'athena';
  lastUpdated: string | null;
  metrics: { impressions: number; installs: number; bidRequests: number; bids: number; ipm: number };
  hourly: Array<{ time: string; ipm: number; impressions: number; installs: number; bidRate: number }>;
  comparison: Array<{ time: string; today: number; yesterday: number }>;
  dma: Array<{ dma: string; ipm: number; impressions: number; installs: number }>;
  creative: Array<{ creative: string; ipm: number; impressions: number; installs: number }>;
}

export const deliveryDashboardApi = {
  get: async (range: '24h' | '7d' | '30d'): Promise<DeliveryDashboardResponse> => {
    const response = await fetch(buildApiUrl(`/api/delivery-dashboard?range=${range}`));
    if (!response.ok) await throwApiError(response, 'Failed to fetch delivery dashboard');
    return response.json() as Promise<DeliveryDashboardResponse>;
  },
  refresh: async () => {
    const response = await fetch(buildApiUrl('/api/delivery-dashboard/refresh'), { method: 'POST' });
    if (!response.ok) await throwApiError(response, 'Failed to refresh delivery metrics');
    return response.json() as Promise<{ status: 'queued' | 'running'; queuedAt: string }>;
  },
};
