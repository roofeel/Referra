import { buildApiUrl, throwApiError } from './http';

export type DeliveryRefreshSchedule = { jobId: string; name: string; cronExpression: string; enabled: boolean; timezone: string };
export type DeliveryRefreshLog = { id: string; status: string; date: string; rows?: number; error?: string; startedAt: string; finishedAt?: string; createdAt: string };

export const deliveryRefreshApi = {
  getSchedule: async (): Promise<DeliveryRefreshSchedule> => {
    const response = await fetch(buildApiUrl('/api/delivery-dashboard/refresh/schedule'));
    if (!response.ok) await throwApiError(response, 'Failed to fetch refresh schedule');
    return response.json();
  },
  updateSchedule: async (payload: Partial<DeliveryRefreshSchedule>): Promise<DeliveryRefreshSchedule> => {
    const response = await fetch(buildApiUrl('/api/delivery-dashboard/refresh/schedule'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) await throwApiError(response, 'Failed to update refresh schedule');
    return response.json();
  },
  listLogs: async (): Promise<{ logs: DeliveryRefreshLog[] }> => {
    const response = await fetch(buildApiUrl('/api/delivery-dashboard/refresh/logs'));
    if (!response.ok) await throwApiError(response, 'Failed to fetch job logs');
    return response.json();
  },
};
