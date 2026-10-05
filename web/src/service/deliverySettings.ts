import { buildApiUrl, throwApiError } from './http';

export type DeliveryMetricSettings = {
  filters: Array<{ clickUrlId: number; showBid: boolean; name: string }>;
};

export const deliverySettingsApi = {
  get: async (): Promise<DeliveryMetricSettings> => {
    const response = await fetch(buildApiUrl('/api/delivery-dashboard/settings'));
    if (!response.ok) await throwApiError(response, 'Failed to load delivery metrics settings');
    return response.json();
  },
  save: async (filters: unknown): Promise<DeliveryMetricSettings> => {
    const response = await fetch(buildApiUrl('/api/delivery-dashboard/settings'), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters }),
    });
    if (!response.ok) await throwApiError(response, 'Failed to save delivery metrics settings');
    return response.json();
  },
};
